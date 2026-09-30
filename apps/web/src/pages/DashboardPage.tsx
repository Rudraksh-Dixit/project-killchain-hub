import type { ReactNode } from 'react';
import {
  AlertOctagon,
  BookOpen,
  FilePlus2,
  FileText,
  Fingerprint,
  Inbox,
  LogIn,
  Pencil,
  Plus,
  Radar,
  Send,
  Trash2,
  Upload,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useQuery } from '../hooks/useQuery';
import { useChartColors, severityColor } from '../hooks/useChartColors';
import { useAuth } from '../contexts/AuthContext';
import { formatNumber, monthLabel, relativeTime } from '../lib/format';
import type { ActivityItem, DashboardStats, Ioc } from '../lib/types';
import { Button, PageHeader, PageTransition, SectionCard, SeverityBadge, StatCard, Tag, ErrorState, CardSkeleton } from '../components/ui';

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'] as const;

function activityIcon(action: string): ReactNode {
  const verb = action.split('.')[1] ?? '';
  switch (verb) {
    case 'create':
      return <Plus />;
    case 'update':
      return <Pencil />;
    case 'delete':
    case 'bulk_delete':
      return <Trash2 />;
    case 'import':
      return <Upload />;
    case 'approve':
      return <Send />;
    case 'reject':
      return <AlertOctagon />;
    case 'login':
      return <LogIn />;
    default:
      return <FileText />;
  }
}

function activityText(item: ActivityItem): string {
  const verb = item.action.split('.')[1] ?? item.action;
  const label = item.action.split('.')[0] ?? 'item';
  const subject =
    (item.detail.title as string) ?? (item.detail.value as string) ?? (item.detail.name as string);
  return `${verb.replace('_', ' ')} ${label}${subject ? ` “${subject}”` : ''}`;
}

function EmptySlot({ label }: { label: string }) {
  return <div className="flex h-[220px] items-center justify-center text-xs text-ink-3">{label}</div>;
}

export function DashboardPage() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const colors = useChartColors();

  const stats = useQuery<DashboardStats>('/dashboard/stats');
  const fresh = useQuery<{ items: Ioc[] }>('/iocs?pageSize=6&sort=last_seen&order=desc');
  const data = stats.data;

  const firstName = user?.displayName.split(' ')[0] ?? 'analyst';
  const canWrite = hasRole('contributor');

  const trend = (data?.iocsOverTime ?? []).map((row) => ({
    label: monthLabel(row.month),
    count: row.count,
  }));

  const severityData = SEVERITIES.map((severity) => ({
    name: severity,
    value: data?.severityBreakdown.find((row) => row.severity === severity)?.count ?? 0,
  })).filter((row) => row.value > 0);

  const severityTotal = severityData.reduce((sum, row) => sum + row.value, 0);
  const maxFamily = Math.max(1, ...(data?.iocsByFamily ?? []).map((row) => row.count));

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Overview"
        title={`Welcome back, ${firstName}`}
        description="Fresh signal from the intelligence platform — indicators, hunts and findings at a glance."
        actions={
          <>
            {canWrite && (
              <Button variant="secondary" icon={<Send />} onClick={() => navigate('/community')}>
                Submit intel
              </Button>
            )}
            {canWrite && (
              <Button variant="primary" icon={<FilePlus2 />} onClick={() => navigate('/reports/new')}>
                New report
              </Button>
            )}
          </>
        }
      />

      {stats.error && <ErrorState error={stats.error} onRetry={stats.refetch} />}

      {stats.loading ? (
        <CardSkeleton count={6} />
      ) : (
        data && (
          <>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
              <StatCard label="IOCs" value={formatNumber(data.totals.iocs)} hint="tracked indicators" icon={<Fingerprint />} tone="accent" />
              <StatCard label="Hunts" value={formatNumber(data.totals.hunts)} hint="detection queries" icon={<Radar />} />
              <StatCard label="Research" value={formatNumber(data.totals.articles)} hint="knowledge articles" icon={<BookOpen />} />
              <StatCard label="Reports" value={formatNumber(data.totals.reports)} hint="engagements" icon={<FileText />} />
              <StatCard
                label="Open findings"
                value={formatNumber(data.totals.openFindings)}
                hint="awaiting remediation"
                icon={<AlertOctagon />}
                tone={data.totals.openFindings > 0 ? 'danger' : 'default'}
              />
              {user?.role === 'admin' && (
                <StatCard
                  label="Pending"
                  value={formatNumber(data.totals.pendingSubmissions)}
                  hint="submissions to review"
                  icon={<Inbox />}
                  tone={data.totals.pendingSubmissions > 0 ? 'accent' : 'default'}
                />
              )}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <SectionCard
                className="lg:col-span-2"
                title="IOC activity"
                description="New indicators first seen, last 8 months"
                bodyClassName="px-3 pb-3 pt-4"
              >
                {trend.length === 0 ? (
                  <EmptySlot label="No time-series data yet" />
                ) : (
                  <ResponsiveContainer width="100%" height={224}>
                    <AreaChart data={trend} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="iocArea" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={colors.accent} stopOpacity={0.32} />
                          <stop offset="100%" stopColor={colors.accent} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="label"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: colors.text3 }}
                        dy={8}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: colors.text3 }}
                        width={44}
                        allowDecimals={false}
                      />
                      <Tooltip
                        cursor={{ stroke: colors.line }}
                        content={({ active, payload, label }) =>
                          active && payload && payload.length ? (
                            <div className="rounded-md border border-line bg-surface px-3 py-2 shadow-pop">
                              <p className="text-[11px] text-ink-3">{String(label)}</p>
                              <p className="font-mono text-[13px] font-medium text-ink">
                                {String(payload[0]?.value)} new IOCs
                              </p>
                            </div>
                          ) : null
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke={colors.accent}
                        strokeWidth={2}
                        fill="url(#iocArea)"
                        dot={false}
                        activeDot={{ r: 3.5, strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </SectionCard>

              <SectionCard title="Severity distribution" description="Across all tracked indicators">
                <div className="flex items-center gap-4">
                  <div className="relative h-[150px] w-[150px] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={severityData}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={52}
                          outerRadius={72}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {severityData.map((entry) => (
                            <Cell key={entry.name} fill={severityColor(entry.name, colors)} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) =>
                            active && payload && payload.length ? (
                              <div className="rounded-md border border-line bg-surface px-3 py-2 shadow-pop">
                                <p className="text-[11px] text-ink-3">{String(payload[0]?.name)}</p>
                                <p className="font-mono text-[13px] font-medium text-ink">
                                  {String(payload[0]?.value)} IOCs
                                </p>
                              </div>
                            ) : null
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-display text-xl font-semibold tabular-nums text-ink">
                        {formatNumber(severityTotal)}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-ink-3">total</span>
                    </div>
                  </div>

                  <ul className="min-w-0 flex-1 space-y-2">
                    {severityData.map((entry) => (
                      <li key={entry.name} className="flex items-center gap-2 text-[13px]">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ background: severityColor(entry.name, colors) }}
                        />
                        <span className="capitalize text-ink-2">{entry.name}</span>
                        <span className="ml-auto font-mono text-xs text-ink-3">
                          {entry.value}
                          <span className="ml-1 opacity-60">
                            {severityTotal > 0 ? `${Math.round((entry.value / severityTotal) * 100)}%` : ''}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </SectionCard>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <SectionCard title="Top malware families" description="Highest-volume families">
                <ul className="space-y-3.5">
                  {(data.iocsByFamily ?? []).slice(0, 7).map((family) => (
                    <li key={family.family}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
                        <Link
                          to={`/iocs?family=${encodeURIComponent(family.family)}`}
                          className="truncate font-medium text-ink transition-colors hover:text-accent"
                        >
                          {family.family}
                        </Link>
                        <span className="shrink-0 font-mono text-xs text-ink-3">{family.count}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface2">
                        <div
                          className="h-full rounded-full bg-accent/70 transition-all duration-500 ease-smooth"
                          style={{ width: `${(family.count / maxFamily) * 100}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </SectionCard>

              <SectionCard title="Top tags" description="Most-used classification tags">
                <div className="flex flex-wrap gap-1.5">
                  {data.topTags.map((tag) => (
                    <Link key={tag.tag} to={`/iocs?tag=${encodeURIComponent(tag.tag)}`}>
                      <Tag className="transition-colors hover:border-accent/50 hover:text-accent">
                        {tag.tag}
                        <span className="ml-1.5 text-ink-3">{tag.count}</span>
                      </Tag>
                    </Link>
                  ))}
                </div>

                <div className="mt-5 border-t border-line pt-4">
                  <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                    Indicator types
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {data.typeBreakdown.map((row) => (
                      <BadgeLike key={row.type} label={row.type} count={row.count} />
                    ))}
                  </div>
                </div>
              </SectionCard>

              <SectionCard
                title="Recent activity"
                description="Latest workspace events"
                bodyClassName="px-5 py-1"
              >
                <ul className="max-h-[340px] overflow-y-auto">
                  {data.recentActivity.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start gap-3 border-b border-line/60 py-3 last:border-b-0"
                    >
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface2 text-ink-3 [&>svg]:h-3.5 [&>svg]:w-3.5">
                        {activityIcon(item.action)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] text-ink-2">
                          <span className="font-medium text-ink">{item.actor}</span>{' '}
                          {activityText(item)}
                        </p>
                        <p className="mt-0.5 text-[11px] text-ink-3">{relativeTime(item.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            </div>

            <SectionCard
              title="Fresh indicators"
              description="Most recently seen IOCs"
              actions={
                <Button variant="ghost" size="sm" onClick={() => navigate('/iocs')}>
                  View all
                </Button>
              }
              bodyClassName="px-5 py-0"
            >
              <ul>
                {(fresh.data?.items ?? []).map((ioc) => (
                  <li key={ioc.id} className="flex items-center gap-3 border-b border-line/60 py-3 last:border-b-0">
                    <SeverityBadge severity={ioc.severity} withIcon={false} />
                    <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-ink" title={ioc.value}>
                      {ioc.value}
                    </span>
                    <span className="hidden shrink-0 text-xs text-ink-3 sm:block">{ioc.malwareFamily}</span>
                    <span className="hidden w-20 shrink-0 text-right text-xs text-ink-3 md:block">
                      {relativeTime(ioc.lastSeen)}
                    </span>
                  </li>
                ))}
                {fresh.loading && (
                  <li className="py-6 text-center text-xs text-ink-3">Loading fresh indicators…</li>
                )}
              </ul>
            </SectionCard>
          </>
        )
      )}
    </PageTransition>
  );
}

function BadgeLike({ label, count }: { label: string; count: number }) {
  return (
    <Link to={`/iocs?type=${encodeURIComponent(label)}`}>
      <Tag className="transition-colors hover:border-accent/50 hover:text-accent">
        {label}
        <span className="ml-1.5 text-ink-3">{count}</span>
      </Tag>
    </Link>
  );
}
