import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, FileDown, FilePlus2, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { api, apiDownload, ApiError } from '../lib/api';
import { useQuery } from '../hooks/useQuery';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { cvssSeverity, formatDate, formatDateTime, relativeTime } from '../lib/format';
import { Markdown } from '../lib/markdown';
import type { Finding, Report, Severity } from '../lib/types';
import {
  Badge,
  Button,
  ConfirmDialog,
  ErrorState,
  Field,
  Input,
  Modal,
  PageTransition,
  Select,
  SeverityBadge,
  Skeleton,
  StatCard,
  Textarea,
} from '../components/ui';

const SEVERITIES: Severity[] = ['critical', 'high', 'medium', 'low', 'info'];
const FINDING_STATUSES = ['open', 'partial', 'remediated', 'risk-accepted'] as const;

interface EditorState {
  title: string;
  client: string;
  scope: string;
  executiveSummary: string;
  methodology: string;
  status: 'draft' | 'in-review' | 'final';
  findings: Finding[];
}

const EMPTY: EditorState = {
  title: '',
  client: '',
  scope: '',
  executiveSummary: '',
  methodology: '',
  status: 'draft',
  findings: [],
};

function fromReport(report: Report): EditorState {
  return {
    title: report.title,
    client: report.client,
    scope: report.scope,
    executiveSummary: report.executiveSummary,
    methodology: report.methodology,
    status: report.status,
    findings: report.findings ?? [],
  };
}

function computeStats(findings: Finding[]) {
  const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  let cvssSum = 0;
  let open = 0;
  for (const finding of findings) {
    counts[finding.severity] = (counts[finding.severity] ?? 0) + 1;
    cvssSum += Number(finding.cvss) || 0;
    if (finding.status === 'open') open += 1;
  }
  return {
    counts,
    total: findings.length,
    averageCvss: findings.length ? cvssSum / findings.length : 0,
    open,
  };
}

function newFinding(): Finding {
  return {
    title: '',
    severity: 'medium',
    cvss: 0,
    status: 'open',
    vector: '',
    cwe: '',
    affected: '',
    description: '',
    evidence: '',
    remediation: '',
    references: [],
  };
}

/* ── Finding editor modal ─────────────────────────────────────── */

function FindingModal({
  open,
  initial,
  onSave,
  onClose,
}: {
  open: boolean;
  initial: Finding | null;
  onSave: (finding: Finding) => void;
  onClose: () => void;
}) {
  const [finding, setFinding] = useState<Finding>(newFinding);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setFinding(initial ? { ...initial } : newFinding());
      setError(null);
    }
  }, [open, initial]);

  const set = <K extends keyof Finding>(key: K, value: Finding[K]) =>
    setFinding((prev) => ({ ...prev, [key]: value }));

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (finding.title.trim().length < 3) {
      setError('Title must be at least 3 characters.');
      return;
    }
    onSave({ ...finding, title: finding.title.trim() });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={initial?.title ? 'Edit finding' : 'Add finding'}
      description="Structured vulnerability data — severity, CVSS, evidence and remediation."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" form="finding-form">
            {initial?.title ? 'Save finding' : 'Add finding'}
          </Button>
        </>
      }
    >
      <form id="finding-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && (
          <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
            {error}
          </div>
        )}

        <Field label="Title" htmlFor="finding-title" required>
          <Input
            id="finding-title"
            required
            value={finding.title}
            onChange={(event) => set('title', event.target.value)}
            placeholder="Stored XSS in contact form"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Severity" htmlFor="finding-sev">
            <Select id="finding-sev" value={finding.severity} onChange={(event) => set('severity', event.target.value as Severity)}>
              {SEVERITIES.map((severity) => (
                <option key={severity} value={severity}>{severity}</option>
              ))}
            </Select>
          </Field>
          <Field label="CVSS" htmlFor="finding-cvss" hint="0–10">
            <Input
              id="finding-cvss"
              type="number"
              min={0}
              max={10}
              step={0.1}
              value={finding.cvss}
              onChange={(event) => set('cvss', Number(event.target.value))}
            />
          </Field>
          <Field label="Status" htmlFor="finding-status">
            <Select id="finding-status" value={finding.status} onChange={(event) => set('status', event.target.value as Finding['status'])}>
              {FINDING_STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </Select>
          </Field>
          <Field label="CWE" htmlFor="finding-cwe">
            <Input id="finding-cwe" value={finding.cwe} onChange={(event) => set('cwe', event.target.value)} placeholder="CWE-79" />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="CVSS vector" htmlFor="finding-vector">
            <Input
              id="finding-vector"
              className="font-mono text-[12.5px]"
              value={finding.vector}
              onChange={(event) => set('vector', event.target.value)}
              placeholder="CVSS:3.1/AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N"
            />
          </Field>
          <Field label="Affected asset" htmlFor="finding-affected">
            <Input
              id="finding-affected"
              value={finding.affected}
              onChange={(event) => set('affected', event.target.value)}
              placeholder="https://shop.example.com/search"
            />
          </Field>
        </div>

        <Field label="Description" htmlFor="finding-desc">
          <Textarea
            id="finding-desc"
            rows={3}
            value={finding.description}
            onChange={(event) => set('description', event.target.value)}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Evidence" htmlFor="finding-evidence" hint="Requests, responses, screenshots refs">
            <Textarea
              id="finding-evidence"
              rows={4}
              className="font-mono text-[12.5px]"
              value={finding.evidence}
              onChange={(event) => set('evidence', event.target.value)}
            />
          </Field>
          <Field label="Remediation" htmlFor="finding-remediation">
            <Textarea
              id="finding-remediation"
              rows={4}
              value={finding.remediation}
              onChange={(event) => set('remediation', event.target.value)}
            />
          </Field>
        </div>

        <Field label="References" htmlFor="finding-refs" hint="One URL per line">
          <Textarea
            id="finding-refs"
            rows={2}
            value={finding.references.join('\n')}
            onChange={(event) =>
              set(
                'references',
                event.target.value
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean),
              )
            }
          />
        </Field>
      </form>
    </Modal>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */

export function ReportEditorPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const toast = useToast();
  const canWrite = hasRole('contributor');

  const detail = useQuery<{ report: Report }>(!isNew && id ? `/reports/${id}` : null, [id]);

  const [form, setForm] = useState<EditorState>(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [findingModal, setFindingModal] = useState<{ open: boolean; initial: Finding | null }>({
    open: false,
    initial: null,
  });
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewMarkdown, setPreviewMarkdown] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (detail.data?.report) {
      setForm(fromReport(detail.data.report));
      setDirty(false);
    } else if (isNew) {
      setForm(EMPTY);
      setDirty(false);
    }
  }, [detail.data, isNew]);

  const stats = useMemo(() => computeStats(form.findings), [form.findings]);

  const set = <K extends keyof EditorState>(key: K, value: EditorState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  async function save() {
    if (!form.title.trim()) {
      toast.error('Report title is required');
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      client: form.client.trim(),
      scope: form.scope,
      executiveSummary: form.executiveSummary,
      methodology: form.methodology,
      status: form.status,
      findings: form.findings,
    };
    try {
      if (isNew) {
        const res = await api<{ report: Report }>('/reports', { method: 'POST', body: payload });
        toast.success('Report created');
        navigate(`/reports/${res.report.id}`, { replace: true });
      } else {
        await api(`/reports/${id}`, { method: 'PUT', body: payload });
        toast.success('Report saved');
        setDirty(false);
        detail.refetch();
      }
    } catch (error) {
      toast.error(
        'Save failed',
        error instanceof ApiError || error instanceof Error ? error.message : undefined,
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!id || isNew) return;
    setDeleting(true);
    try {
      await api(`/reports/${id}`, { method: 'DELETE' });
      toast.success('Report deleted');
      navigate('/reports');
    } catch (error) {
      toast.error('Delete failed', error instanceof Error ? error.message : undefined);
    } finally {
      setDeleting(false);
    }
  }

  async function openPreview() {
    if (isNew || !id) {
      toast.info('Save the report first to preview it');
      return;
    }
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const res = await api<{ markdown: string }>(`/reports/${id}/markdown`);
      setPreviewMarkdown(res.markdown);
    } catch (error) {
      toast.error('Preview failed', error instanceof Error ? error.message : undefined);
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  }

  function saveFinding(finding: Finding) {
    setForm((prev) => ({
      ...prev,
      findings: findingModal.initial
        ? prev.findings.map((item) =>
            item === findingModal.initial ? { ...finding, id: item.id } : item,
          )
        : [...prev.findings, finding],
    }));
    setDirty(true);
    setFindingModal({ open: false, initial: null });
  }

  function removeFinding(finding: Finding) {
    setForm((prev) => ({ ...prev, findings: prev.findings.filter((item) => item !== finding) }));
    setDirty(true);
  }

  if (!isNew && detail.loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-96" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!isNew && detail.error) {
    return (
      <PageTransition>
        <div className="mx-auto max-w-xl rounded-lg border border-line bg-surface">
          <ErrorState error={detail.error} onRetry={detail.refetch} title="Report unavailable" />
          <div className="pb-6 text-center">
            <Button variant="secondary" size="sm" icon={<ArrowLeft />} onClick={() => navigate('/reports')}>
              Back to reports
            </Button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      {/* header */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" icon={<ArrowLeft />} onClick={() => navigate('/reports')}>
            Reports
          </Button>
          <span className="text-[12px] text-ink-3">
            {isNew ? 'New report' : `Created ${formatDate(detail.data?.report.createdAt)}`}
          </span>
          {dirty && (
            <Badge tone="warning" dot>
              Unsaved changes
            </Badge>
          )}
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Select
              aria-label="Report status"
              value={form.status}
              disabled={!canWrite}
              onChange={(event) => set('status', event.target.value as EditorState['status'])}
              className="w-[130px]"
            >
              <option value="draft">draft</option>
              <option value="in-review">in-review</option>
              <option value="final">final</option>
            </Select>
            <Button variant="secondary" icon={<Eye />} onClick={openPreview}>
              Preview
            </Button>
            {!isNew && (
              <Button
                variant="secondary"
                icon={<FileDown />}
                onClick={() =>
                  apiDownload(`/reports/${id}/markdown?download=1`, 'report.md').catch(() =>
                    toast.error('Export failed'),
                  )
                }
              >
                Export .md
              </Button>
            )}
            {!isNew && hasRole('admin') && (
              <Button variant="secondary" className="text-danger" icon={<Trash2 />} onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )}
            {canWrite && (
              <Button variant="primary" icon={<Save />} loading={saving} onClick={save}>
                {isNew ? 'Create report' : 'Save'}
              </Button>
            )}
          </div>
        </div>

        <Input
          value={form.title}
          readOnly={!canWrite}
          onChange={(event) => set('title', event.target.value)}
          placeholder="Engagement report title…"
          className="h-12 border-transparent bg-transparent px-0 font-display text-2xl font-semibold tracking-tight shadow-none hover:border-transparent hover:bg-transparent focus:bg-surface2/60"
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Findings" value={stats.total} />
          <StatCard label="Critical" value={stats.counts.critical} tone={stats.counts.critical > 0 ? 'danger' : 'default'} />
          <StatCard label="High" value={stats.counts.high} tone={stats.counts.high > 0 ? 'danger' : 'default'} />
          <StatCard label="Medium" value={stats.counts.medium} />
          <StatCard label="Open" value={stats.open} />
          <StatCard label="Avg CVSS" value={stats.total ? stats.averageCvss.toFixed(1) : '—'} tone="accent" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* metadata */}
        <div className="space-y-4">
          <section className="pkc-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-ink">Engagement details</h2>
            <div className="space-y-4">
              <Field label="Client" htmlFor="rep-client">
                <Input
                  id="rep-client"
                  readOnly={!canWrite}
                  value={form.client}
                  onChange={(event) => set('client', event.target.value)}
                  placeholder="Example Corp"
                />
              </Field>
              <Field label="Scope" htmlFor="rep-scope">
                <Textarea
                  id="rep-scope"
                  rows={4}
                  readOnly={!canWrite}
                  value={form.scope}
                  onChange={(event) => set('scope', event.target.value)}
                  placeholder="In-scope hosts, applications, exclusions…"
                />
              </Field>
            </div>
          </section>

          <section className="pkc-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-ink">Executive summary</h2>
            <Textarea
              rows={6}
              readOnly={!canWrite}
              value={form.executiveSummary}
              onChange={(event) => set('executiveSummary', event.target.value)}
              placeholder="Plain-language summary for leadership — risk posture, key findings, priorities…"
            />
          </section>

          <section className="pkc-card p-5">
            <h2 className="mb-4 text-sm font-semibold text-ink">Methodology</h2>
            <Textarea
              rows={5}
              readOnly={!canWrite}
              value={form.methodology}
              onChange={(event) => set('methodology', event.target.value)}
              placeholder="Tools, techniques and phases used during the assessment…"
            />
          </section>
        </div>

        {/* findings */}
        <section className="pkc-card flex h-fit flex-col">
          <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
            <div>
              <h2 className="text-sm font-semibold text-ink">Findings</h2>
              <p className="mt-0.5 text-xs text-ink-3">{form.findings.length} recorded</p>
            </div>
            {canWrite && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Plus />}
                onClick={() => setFindingModal({ open: true, initial: null })}
              >
                Add finding
              </Button>
            )}
          </header>

          <div className="divide-y divide-line/70">
            {form.findings.length === 0 && (
              <div className="px-5 py-10 text-center">
                <FilePlus2 className="mx-auto h-6 w-6 text-ink-3" />
                <p className="mt-2 text-sm text-ink-2">No findings yet</p>
                <p className="mt-1 text-xs text-ink-3">Add the first finding to start scoring risk.</p>
                {canWrite && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="mt-4"
                    icon={<Plus />}
                    onClick={() => setFindingModal({ open: true, initial: null })}
                  >
                    Add finding
                  </Button>
                )}
              </div>
            )}

            {form.findings.map((finding, index) => (
              <article key={finding.id ?? `${finding.title}-${index}`} className="group px-5 py-4">
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={finding.severity} />
                      <Badge tone={finding.status === 'open' ? 'warning' : finding.status === 'remediated' ? 'success' : 'neutral'}>
                        {finding.status}
                      </Badge>
                      <span className="font-mono text-[12px] text-ink-3">
                        CVSS {Number(finding.cvss).toFixed(1)} · {cvssSeverity(Number(finding.cvss))}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-[14px] font-medium leading-5 text-ink">{finding.title}</h3>
                    {finding.affected && (
                      <p className="mt-0.5 truncate font-mono text-[12px] text-ink-3" title={finding.affected}>
                        {finding.affected}
                      </p>
                    )}
                    {finding.description && (
                      <p className="mt-1.5 line-clamp-2 text-[13px] leading-5 text-ink-3">{finding.description}</p>
                    )}
                  </div>
                  {canWrite && (
                    <div className="flex shrink-0 gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Edit finding"
                        icon={<Pencil />}
                        onClick={() => setFindingModal({ open: true, initial: finding })}
                      />
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Remove finding"
                        className="text-danger"
                        icon={<Trash2 />}
                        onClick={() => removeFinding(finding)}
                      />
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>

          {!isNew && detail.data?.report && (
            <footer className="border-t border-line px-5 py-3 text-[11px] text-ink-3">
              Last updated {formatDateTime(detail.data.report.updatedAt)} ·{' '}
              {relativeTime(detail.data.report.updatedAt)}
            </footer>
          )}
        </section>
      </div>

      <FindingModal
        open={findingModal.open}
        initial={findingModal.initial}
        onSave={saveFinding}
        onClose={() => setFindingModal({ open: false, initial: null })}
      />

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        size="lg"
        title="Report preview"
        description="Rendered from the generated Markdown export."
        footer={
          <Button variant="secondary" size="sm" onClick={() => setPreviewOpen(false)}>
            Close preview
          </Button>
        }
      >
        {previewLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : previewMarkdown ? (
          <div className="max-h-[55vh] overflow-y-auto pr-1">
            <Markdown content={previewMarkdown} />
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete report"
        message={`Permanently delete “${form.title}”? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </PageTransition>
  );
}
