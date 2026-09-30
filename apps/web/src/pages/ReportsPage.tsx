import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FilePlus2, FileText, MoreHorizontal, SearchX, Trash2 } from 'lucide-react';
import { api } from '../lib/api';
import { qs } from '../lib/query';
import { useQuery } from '../hooks/useQuery';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { formatDateTime, relativeTime } from '../lib/format';
import type { Paginated, Report, Severity } from '../lib/types';
import {
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  DropdownMenu,
  EmptyState,
  PageHeader,
  PageTransition,
  Pagination,
  SearchInput,
  SeverityBadge,
  Tabs,
  type Column,
} from '../components/ui';

const STATUS_TONE = {
  draft: 'neutral',
  'in-review': 'warning',
  final: 'success',
} as const;

const STATUS_LABEL = {
  draft: 'Draft',
  'in-review': 'In review',
  final: 'Final',
} as const;

export function ReportsPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const toast = useToast();

  const q = params.get('q') ?? '';
  const status = (params.get('status') ?? '') as '' | 'draft' | 'in-review' | 'final';
  const page = Math.max(1, Number(params.get('page') ?? 1));

  const listQuery = useMemo(() => qs({ q, status, page, pageSize: 12 }), [q, status, page]);
  const list = useQuery<Paginated<Report>>(`/reports${listQuery}`);

  const [searchDraft, setSearchDraft] = useState(q);
  const [confirmDelete, setConfirmDelete] = useState<Report | null>(null);
  const [deleting, setDeleting] = useState(false);

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, value);
    if (key !== 'page') next.delete('page');
    setParams(next);
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api(`/reports/${confirmDelete.id}`, { method: 'DELETE' });
      toast.success('Report deleted');
      setConfirmDelete(null);
      list.refetch();
    } catch (error) {
      toast.error('Delete failed', error instanceof Error ? error.message : undefined);
    } finally {
      setDeleting(false);
    }
  }

  const rows = list.data?.items ?? [];
  const total = list.data?.total ?? 0;

  const columns: Column<Report>[] = [
    {
      key: 'title',
      header: 'Report',
      cell: (row) => (
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 shrink-0 text-ink-3" />
            <span className="truncate font-medium text-ink">{row.title}</span>
          </div>
          <span className="mt-0.5 block truncate text-[12px] text-ink-3">
            {row.client || 'Internal engagement'} · updated {relativeTime(row.updatedAt)}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      width: '110px',
      cell: (row) => (
        <Badge tone={STATUS_TONE[row.status]}>{STATUS_LABEL[row.status]}</Badge>
      ),
    },
    {
      key: 'findings',
      header: 'Findings',
      width: '230px',
      cell: (row) => {
        const stats = row.stats;
        if (!stats || stats.total === 0) return <span className="text-ink-3">—</span>;
        return (
          <span className="flex flex-wrap gap-1">
            {(['critical', 'high', 'medium', 'low'] as Severity[])
              .filter((severity) => (stats.counts[severity] ?? 0) > 0)
              .map((severity) => (
                <SeverityBadge key={severity} severity={severity} withIcon={false} />
              ))}
            <span className="text-[11px] text-ink-3">({stats.total})</span>
          </span>
        );
      },
    },
    {
      key: 'cvss',
      header: 'Avg CVSS',
      width: '96px',
      align: 'right',
      cell: (row) => (
        <span className="font-mono text-[13px] text-ink">
          {row.stats && row.stats.total > 0 ? row.stats.averageCvss.toFixed(1) : '—'}
        </span>
      ),
    },
    {
      key: 'updated',
      header: 'Updated',
      width: '140px',
      align: 'right',
      cell: (row) => <span className="whitespace-nowrap text-[13px]">{formatDateTime(row.updatedAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      width: '56px',
      align: 'right',
      cell: (row) => (
        <span onClick={(event) => event.stopPropagation()}>
          <DropdownMenu
            trigger={
              <button
                type="button"
                aria-label={`Actions for ${row.title}`}
                className="rounded-md p-1.5 text-ink-3 transition-colors hover:bg-surface2 hover:text-ink"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            }
            items={[
              { label: 'Open editor', onSelect: () => navigate(`/reports/${row.id}`) },
              ...(hasRole('admin')
                ? [
                    {
                      label: 'Delete report',
                      icon: <Trash2 />,
                      danger: true,
                      onSelect: () => setConfirmDelete(row),
                    },
                  ]
                : []),
            ]}
          />
        </span>
      ),
    },
  ];

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Operations"
        title="Reports"
        description="Client-ready engagement reports — findings, CVSS scoring, executive summaries and Markdown export."
        actions={
          hasRole('contributor') && (
            <Button variant="primary" icon={<FilePlus2 />} onClick={() => navigate('/reports/new')}>
              New report
            </Button>
          )
        }
      />

      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={searchDraft}
            onChange={(event) => {
              setSearchDraft(event.target.value);
              setParam('q', event.target.value || null);
            }}
            onClear={() => {
              setSearchDraft('');
              setParam('q', null);
            }}
            placeholder="Search reports…"
            className="w-full sm:w-80"
          />
          <Tabs
            layoutId="reports"
            value={status || 'all'}
            onChange={(value) => setParam('status', value === 'all' ? null : value)}
            items={[
              { id: 'all', label: 'All' },
              { id: 'draft', label: 'Draft' },
              { id: 'in-review', label: 'In review' },
              { id: 'final', label: 'Final' },
            ]}
          />
          <span className="ml-auto text-[13px] text-ink-3">
            {list.loading ? 'Loading…' : `${total} reports`}
          </span>
        </div>

        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          loading={list.loading}
          onRowClick={(row) => navigate(`/reports/${row.id}`)}
          minWidth="860px"
          empty={
            <EmptyState
              icon={<SearchX />}
              title="No reports yet"
              description="Create your first engagement report to start tracking findings."
              action={
                hasRole('contributor') ? (
                  <Button variant="primary" size="sm" icon={<FilePlus2 />} onClick={() => navigate('/reports/new')}>
                    New report
                  </Button>
                ) : undefined
              }
            />
          }
        />

        {total > 12 && (
          <div className="overflow-hidden rounded-lg border border-line bg-surface">
            <Pagination page={page} pageSize={12} total={total} onPageChange={(next) => setParam('page', String(next))} />
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete report"
        message={`Permanently delete “${confirmDelete?.title ?? ''}”? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(null)}
      />
    </PageTransition>
  );
}
