import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Copy, Pencil, Plus, SearchX, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { api } from '../lib/api';
import { qs } from '../lib/query';
import { useQuery } from '../hooks/useQuery';
import { useDebounced } from '../hooks/useDebounced';
import { useCopy } from '../hooks/useCopy';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { formatDate, relativeTime, titleCase } from '../lib/format';
import type { Hunt, HuntListResponse } from '../lib/types';
import {
  Badge,
  Button,
  CodeBlock,
  ConfirmDialog,
  DifficultyBadge,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Modal,
  PageHeader,
  PageTransition,
  Pagination,
  SearchInput,
  Select,
  Tag,
  Textarea,
} from '../components/ui';
import { FacetPanel, FacetSection } from '../components/Facets';

const LANGUAGES = ['kql', 'spl', 'sigma', 'yara', 'powershell'] as const;
const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;

/* ── Detail modal ─────────────────────────────────────────────── */

function HuntDetailModal({
  huntId,
  onClose,
  onEdit,
  onChanged,
}: {
  huntId: string | null;
  onClose: () => void;
  onEdit: (hunt: Hunt) => void;
  onChanged: () => void;
}) {
  const detail = useQuery<{ hunt: Hunt }>(huntId ? `/hunts/${huntId}` : null, [huntId]);
  const { copied, copy } = useCopy();
  const { hasRole } = useAuth();
  const toast = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const hunt = detail.data?.hunt;

  async function handleDelete() {
    if (!hunt) return;
    setDeleting(true);
    try {
      await api(`/hunts/${hunt.id}`, { method: 'DELETE' });
      setConfirmDelete(false);
      onClose();
      onChanged();
      toast.success('Hunt deleted');
    } catch (error) {
      toast.error('Delete failed', error instanceof Error ? error.message : undefined);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal
      open={Boolean(huntId)}
      onClose={onClose}
      size="lg"
      title={hunt ? hunt.title : 'Loading hunt…'}
      description={
        hunt ? `${titleCase(hunt.language)} · ${hunt.difficulty} · updated ${formatDate(hunt.updatedAt)}` : undefined
      }
      footer={
        hunt ? (
          <>
            <Button
              variant="ghost"
              size="sm"
              icon={<Trash2 />}
              className="text-danger"
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
            <span className="flex-1" />
            <Button
              variant="secondary"
              size="sm"
              icon={copied === hunt.query ? <Copy className="text-success" /> : <Copy />}
              onClick={() => copy(hunt.query)}
            >
              {copied === hunt.query ? 'Copied' : 'Copy query'}
            </Button>
            {hasRole('contributor') && (
              <Button variant="primary" size="sm" icon={<Pencil />} onClick={() => onEdit(hunt)}>
                Edit
              </Button>
            )}
          </>
        ) : null
      }
    >
      {detail.loading && (
        <div className="space-y-3">
          <div className="pkc-skeleton h-4 w-2/3" />
          <div className="pkc-skeleton h-40 w-full" />
        </div>
      )}
      {detail.error && <ErrorState error={detail.error} onRetry={detail.refetch} />}
      {hunt && (
        <div className="space-y-5">
          <p className="text-[13.5px] leading-6 text-ink-2">{hunt.description || 'No description.'}</p>

          <CodeBlock
            code={hunt.query}
            language={hunt.language}
            showLineNumbers
            maxLines={12}
            label={`${hunt.language} query`}
          />

          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">Difficulty</dt>
              <dd className="mt-1"><DifficultyBadge difficulty={hunt.difficulty} /></dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">Author</dt>
              <dd className="mt-1 text-[13px] text-ink-2">{hunt.author}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">Created</dt>
              <dd className="mt-1 text-[13px] text-ink-2">{formatDate(hunt.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">Updated</dt>
              <dd className="mt-1 text-[13px] text-ink-2">{relativeTime(hunt.updatedAt)}</dd>
            </div>
          </dl>

          <div className="space-y-3">
            {hunt.tactics.length > 0 && (
              <div>
                <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">Tactics</h3>
                <div className="flex flex-wrap gap-1.5">
                  {hunt.tactics.map((tactic) => (
                    <Badge key={tactic} tone="accent">{tactic}</Badge>
                  ))}
                </div>
              </div>
            )}
            {hunt.techniques.length > 0 && (
              <div>
                <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">Techniques</h3>
                <div className="flex flex-wrap gap-1.5">
                  {hunt.techniques.map((technique) => (
                    <Tag key={technique}>{technique}</Tag>
                  ))}
                </div>
              </div>
            )}
            {hunt.tags.length > 0 && (
              <div>
                <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {hunt.tags.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete hunt"
        message={`Delete “${hunt?.title ?? ''}”? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setConfirmDelete(false)}
      />
    </Modal>
  );
}

/* ── Create / edit modal ──────────────────────────────────────── */

function splitList(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function HuntFormModal({
  open,
  hunt,
  onClose,
  onSaved,
}: {
  open: boolean;
  hunt: Hunt | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [form, setForm] = useState({
    title: '',
    description: '',
    language: 'kql',
    difficulty: 'intermediate',
    query: '',
    tactics: '',
    techniques: '',
    tags: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm({
      title: hunt?.title ?? '',
      description: hunt?.description ?? '',
      language: hunt?.language ?? 'kql',
      difficulty: hunt?.difficulty ?? 'intermediate',
      query: hunt?.query ?? '',
      tactics: (hunt?.tactics ?? []).join(', '),
      techniques: (hunt?.techniques ?? []).join(', '),
      tags: (hunt?.tags ?? []).join(', '),
    });
    setError(null);
  }, [open, hunt]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      language: form.language,
      difficulty: form.difficulty,
      query: form.query.trim(),
      tactics: splitList(form.tactics),
      techniques: splitList(form.techniques),
      tags: splitList(form.tags),
    };
    try {
      if (hunt) {
        await api(`/hunts/${hunt.id}`, { method: 'PUT', body: payload });
        toast.success('Hunt updated');
      } else {
        await api('/hunts', { method: 'POST', body: payload });
        toast.success('Hunt created');
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save hunt');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={hunt ? 'Edit hunt' : 'New hunt'}
      description="Detection-as-code: keep queries versioned, tagged and ready to paste into your SIEM."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" form="hunt-form" loading={saving}>
            {hunt ? 'Save changes' : 'Create hunt'}
          </Button>
        </>
      }
    >
      <form id="hunt-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        {error && (
          <div className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-[13px] text-danger">
            {error}
          </div>
        )}

        <Field label="Title" htmlFor="hunt-title" required>
          <Input
            id="hunt-title"
            required
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Suspicious PowerShell download cradle"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Language" htmlFor="hunt-language">
            <Select
              id="hunt-language"
              value={form.language}
              onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </Select>
          </Field>
          <Field label="Difficulty" htmlFor="hunt-difficulty">
            <Select
              id="hunt-difficulty"
              value={form.difficulty}
              onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
            >
              {DIFFICULTIES.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </Select>
          </Field>
          <Field label="Tags" htmlFor="hunt-tags" hint="Comma separated">
            <Input
              id="hunt-tags"
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="execution, obfuscation"
            />
          </Field>
        </div>

        <Field label="Description" htmlFor="hunt-desc">
          <Textarea
            id="hunt-desc"
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="What the hunt detects, data requirements and false-positive notes…"
          />
        </Field>

        <Field label="Query" htmlFor="hunt-query" required>
          <Textarea
            id="hunt-query"
            rows={7}
            className="font-mono text-[12.5px]"
            required
            value={form.query}
            onChange={(e) => setForm((f) => ({ ...f, query: e.target.value }))}
            placeholder="DeviceNetworkEvents | where ... "
            spellCheck={false}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tactics" htmlFor="hunt-tactics" hint="Comma separated">
            <Input
              id="hunt-tactics"
              value={form.tactics}
              onChange={(e) => setForm((f) => ({ ...f, tactics: e.target.value }))}
              placeholder="Execution, Defense Evasion"
            />
          </Field>
          <Field label="Techniques" htmlFor="hunt-techniques" hint="MITRE IDs, e.g. T1059.001">
            <Input
              id="hunt-techniques"
              value={form.techniques}
              onChange={(e) => setForm((f) => ({ ...f, techniques: e.target.value }))}
              placeholder="T1059.001, T1105"
            />
          </Field>
        </div>
      </form>
    </Modal>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */

export function HuntsPage() {
  const [params, setParams] = useSearchParams();
  const { hasRole } = useAuth();

  const q = params.get('q') ?? '';
  const language = params.get('language');
  const difficulty = params.get('difficulty');
  const tactic = params.get('tactic');
  const focus = params.get('focus');
  const page = Math.max(1, Number(params.get('page') ?? 1));

  const listQuery = useMemo(
    () => qs({ q, language, difficulty, tactic, page, pageSize: 12 }),
    [q, language, difficulty, tactic, page],
  );
  const list = useQuery<HuntListResponse>(`/hunts${listQuery}`);

  const [searchDraft, setSearchDraft] = useState(q);
  const debouncedSearch = useDebounced(searchDraft, 350);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Hunt | null>(null);
  const [mobileFilters, setMobileFilters] = useState(false);

  useEffect(() => {
    if (debouncedSearch === q) return;
    const next = new URLSearchParams(params);
    if (debouncedSearch) next.set('q', debouncedSearch);
    else next.delete('q');
    next.delete('page');
    setParams(next, { replace: true });
  }, [debouncedSearch]);

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, value);
    next.delete('page');
    setParams(next);
  }

  function clearFilters() {
    const next = new URLSearchParams();
    if (searchDraft) next.set('q', searchDraft);
    setParams(next);
  }

  const rows = list.data?.items ?? [];
  const total = list.data?.total ?? 0;
  const hasFilters = Boolean(language || difficulty || tactic);

  const facets = (
    <FacetPanel>
      <FacetSection
        title="Language"
        options={(list.data?.facets.languages ?? []).map((row) => ({
          value: row.language,
          count: row.count,
        }))}
        active={language}
        onSelect={(value) => setParam('language', value)}
      />
      <FacetSection
        title="Tactic"
        options={(list.data?.facets.tactics ?? []).map((row) => ({
          value: row.tactic,
          count: row.count,
        }))}
        active={tactic}
        onSelect={(value) => setParam('tactic', value)}
        max={10}
      />
    </FacetPanel>
  );

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Intelligence"
        title="Hunt Library"
        description="Detection-as-code queries for KQL, SPL, Sigma, YARA and PowerShell — copy, adapt, deploy."
        actions={
          hasRole('contributor') && (
            <Button
              variant="primary"
              icon={<Plus />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              New hunt
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-20">{facets}</div>
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              onClear={() => setSearchDraft('')}
              placeholder="Search hunts…"
              className="w-full sm:w-80"
            />
            <Select
              aria-label="Difficulty filter"
              value={difficulty ?? ''}
              onChange={(event) => setParam('difficulty', event.target.value || null)}
              className="w-[150px]"
            >
              <option value="">All levels</option>
              {DIFFICULTIES.map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </Select>
            <Button
              variant="secondary"
              className="lg:hidden"
              icon={<SlidersHorizontal />}
              onClick={() => setMobileFilters(true)}
            >
              Filters
            </Button>
            {hasFilters && (
              <Button variant="ghost" size="sm" icon={<X />} onClick={clearFilters}>
                Clear
              </Button>
            )}
            <span className="ml-auto text-[13px] text-ink-3">
              {list.loading ? 'Loading…' : `${total} hunts`}
            </span>
          </div>

          {list.error && <ErrorState error={list.error} onRetry={list.refetch} />}

          {!list.error && !list.loading && rows.length === 0 && (
            <div className="rounded-lg border border-line bg-surface">
              <EmptyState
                icon={<SearchX />}
                title="No hunts found"
                description="No queries match the current search and filters."
              />
            </div>
          )}

          {!list.error && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((hunt, index) => (
                <button
                  key={hunt.id}
                  type="button"
                  onClick={() => setParam('focus', hunt.id)}
                  className="group flex flex-col overflow-hidden rounded-lg border border-line bg-surface text-left shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-pop animate-slide-up"
                  style={{ animationDelay: `${Math.min(index, 8) * 25}ms`, animationFillMode: 'backwards' }}
                >
                  <div className="flex items-center gap-2 border-b border-line bg-surface2/50 px-4 py-2.5">
                    <Badge tone="accent">{hunt.language}</Badge>
                    <DifficultyBadge difficulty={hunt.difficulty} />
                    <span className="ml-auto text-[11px] text-ink-3">{relativeTime(hunt.updatedAt)}</span>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <h3 className="text-[14px] font-semibold leading-5 text-ink transition-colors group-hover:text-accent">
                      {hunt.title}
                    </h3>
                    <p className="line-clamp-2 text-[13px] leading-5 text-ink-3">{hunt.description}</p>
                    <pre className="mt-auto max-h-[72px] overflow-hidden rounded-md border border-line bg-bg/60 p-2.5 font-mono text-[11px] leading-4 text-ink-3">
                      {hunt.query.split('\n').slice(0, 3).join('\n')}
                    </pre>
                    <div className="flex flex-wrap gap-1">
                      {hunt.tactics.slice(0, 2).map((tacticName) => (
                        <Tag key={tacticName}>{tacticName}</Tag>
                      ))}
                      {hunt.techniques.slice(0, 2).map((technique) => (
                        <Tag key={technique}>{technique}</Tag>
                      ))}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {total > 12 && (
            <div className="overflow-hidden rounded-lg border border-line bg-surface">
              <Pagination page={page} pageSize={12} total={total} onPageChange={(next) => setParam('page', String(next))} />
            </div>
          )}
        </div>
      </div>

      <Modal open={mobileFilters} onClose={() => setMobileFilters(false)} title="Filter hunts">
        <div className="-m-5">{facets}</div>
      </Modal>

      <HuntDetailModal
        huntId={focus}
        onClose={() => setParam('focus', null)}
        onEdit={(hunt) => {
          setEditing(hunt);
          setFormOpen(true);
        }}
        onChanged={list.refetch}
      />

      <HuntFormModal
        open={formOpen}
        hunt={editing}
        onClose={() => setFormOpen(false)}
        onSaved={list.refetch}
      />
    </PageTransition>
  );
}
