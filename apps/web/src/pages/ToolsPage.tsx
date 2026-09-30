import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ExternalLink, SearchX, Star, Terminal } from 'lucide-react';
import { qs } from '../lib/query';
import { useQuery } from '../hooks/useQuery';
import { useDebounced } from '../hooks/useDebounced';
import type { Tool, ToolListResponse } from '../lib/types';
import {
  Badge,
  Button,
  CodeBlock,
  EmptyState,
  ErrorState,
  Modal,
  PageHeader,
  PageTransition,
  SearchInput,
  Select,
  Tag,
} from '../components/ui';
import { FacetPanel, FacetSection } from '../components/Facets';

const CATEGORY_LABELS: Record<string, string> = {
  'web-security': 'Web Security',
  windows: 'Windows',
  'azure-kql': 'Azure KQL',
  'phishing-analysis': 'Phishing Analysis',
  'reverse-engineering': 'Reverse Engineering',
  hashing: 'Hashing',
};

function ToolDetailModal({ toolId, onClose }: { toolId: string | null; onClose: () => void }) {
  const detail = useQuery<{ tool: Tool }>(toolId ? `/tools/${toolId}` : null, [toolId]);
  const tool = detail.data?.tool;

  return (
    <Modal
      open={Boolean(toolId)}
      onClose={onClose}
      size="lg"
      title={tool ? tool.name : 'Loading tool…'}
      description={tool ? `${CATEGORY_LABELS[tool.category] ?? tool.category} · ${tool.language}` : undefined}
      footer={
        <Button variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      {detail.loading && (
        <div className="space-y-3">
          <div className="pkc-skeleton h-4 w-2/3" />
          <div className="pkc-skeleton h-32 w-full" />
        </div>
      )}
      {detail.error && <ErrorState error={detail.error} onRetry={detail.refetch} />}
      {tool && (
        <div className="space-y-5">
          <p className="text-[13.5px] leading-6 text-ink-2">{tool.description}</p>

          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">Category</dt>
              <dd className="mt-1"><Badge tone="accent">{CATEGORY_LABELS[tool.category] ?? tool.category}</Badge></dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">Language</dt>
              <dd className="mt-1 text-[13px] text-ink-2">{tool.language}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">Stars</dt>
              <dd className="mt-1 flex items-center gap-1 text-[13px] text-ink-2">
                <Star className="h-3.5 w-3.5 text-warning" />
                {tool.stars.toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">Script path</dt>
              <dd className="mt-1 truncate font-mono text-[12.5px] text-ink-2" title={tool.scriptPath}>
                {tool.scriptPath || '—'}
              </dd>
            </div>
          </dl>

          <div>
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">Usage</h3>
            <CodeBlock code={tool.usage || '# No usage notes provided.'} language="powershell" maxLines={16} />
          </div>

          {tool.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {tool.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export function ToolsPage() {
  const [params, setParams] = useSearchParams();

  const q = params.get('q') ?? '';
  const category = params.get('category');
  const sort = params.get('sort') ?? 'stars';
  const focus = params.get('focus');

  const listQuery = useMemo(() => qs({ q, category, sort, order: 'desc', pageSize: 48 }), [q, category, sort]);
  const list = useQuery<ToolListResponse>(`/tools${listQuery}`);

  const [searchDraft, setSearchDraft] = useState(q);
  const debouncedSearch = useDebounced(searchDraft, 350);

  useEffect(() => {
    if (debouncedSearch === q) return;
    const next = new URLSearchParams(params);
    if (debouncedSearch) next.set('q', debouncedSearch);
    else next.delete('q');
    setParams(next, { replace: true });
  }, [debouncedSearch]);

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, value);
    setParams(next);
  }

  const rows = list.data?.items ?? [];

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Arsenal"
        title="Tools"
        description="Curated offensive and defensive utilities with copy-paste usage notes — everything the toolkit page needs."
        actions={
          <Badge tone="accent" icon={<Terminal />}>
            {list.data?.total ?? 0} tools
          </Badge>
        }
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-20">
            <FacetPanel>
              <FacetSection
                title="Category"
                options={(list.data?.facets.categories ?? []).map((row) => ({
                  value: row.category,
                  count: row.count,
                }))}
                active={category}
                onSelect={(value) => setParam('category', value)}
                max={8}
              />
            </FacetPanel>
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              onClear={() => setSearchDraft('')}
              placeholder="Search tools…"
              className="w-full sm:w-80"
            />
            <Select
              aria-label="Sort tools"
              value={sort}
              onChange={(event) => setParam('sort', event.target.value)}
              className="w-[150px]"
            >
              <option value="stars">Most starred</option>
              <option value="name">Name (A–Z)</option>
              <option value="category">Category</option>
              <option value="created_at">Newest</option>
            </Select>
            <span className="ml-auto text-[13px] text-ink-3">
              {list.loading ? 'Loading…' : `${list.data?.total ?? 0} results`}
            </span>
          </div>

          {list.error && <ErrorState error={list.error} onRetry={list.refetch} />}

          {!list.error && !list.loading && rows.length === 0 && (
            <div className="rounded-lg border border-line bg-surface">
              <EmptyState icon={<SearchX />} title="No tools found" description="Try another search or category." />
            </div>
          )}

          {!list.error && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((tool, index) => (
                <button
                  key={tool.id}
                  type="button"
                  onClick={() => setParam('focus', tool.id)}
                  className={`group flex flex-col rounded-lg border bg-surface p-4 text-left shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-pop animate-slide-up ${
                    focus === tool.id ? 'border-accent/60' : 'border-line'
                  }`}
                  style={{ animationDelay: `${Math.min(index, 8) * 25}ms`, animationFillMode: 'backwards' }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-[14.5px] font-semibold leading-5 text-ink transition-colors group-hover:text-accent">
                      {tool.name}
                    </h3>
                    <span className="flex shrink-0 items-center gap-1 rounded-sm bg-surface2 px-1.5 py-0.5 font-mono text-[11px] text-ink-3">
                      <Star className="h-3 w-3 text-warning" />
                      {tool.stars}
                    </span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 flex-1 text-[13px] leading-5 text-ink-3">{tool.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <Badge tone="accent">{CATEGORY_LABELS[tool.category] ?? tool.category}</Badge>
                    <Tag>{tool.language}</Tag>
                    <span className="ml-auto flex items-center gap-1 text-[11px] text-ink-3 opacity-0 transition-opacity group-hover:opacity-100">
                      Usage <ExternalLink className="h-3 w-3" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <ToolDetailModal toolId={focus} onClose={() => setParam('focus', null)} />
    </PageTransition>
  );
}
