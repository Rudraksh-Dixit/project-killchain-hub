import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ExternalLink, Library, SearchX, SlidersHorizontal, X } from 'lucide-react';
import { qs } from '../lib/query';
import { useQuery } from '../hooks/useQuery';
import { useDebounced } from '../hooks/useDebounced';
import { titleCase } from '../lib/format';
import type { ResourceListResponse } from '../lib/types';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Modal,
  PageHeader,
  PageTransition,
  SearchInput,
  Tag,
} from '../components/ui';
import { FacetPanel, FacetSection } from '../components/Facets';

export function ResourcesPage() {
  const [params, setParams] = useSearchParams();

  const q = params.get('q') ?? '';
  const category = params.get('category');

  const listQuery = useMemo(() => qs({ q, category }), [q, category]);
  const list = useQuery<ResourceListResponse>(`/resources${listQuery}`);

  const [searchDraft, setSearchDraft] = useState(q);
  const debouncedSearch = useDebounced(searchDraft, 350);
  const [mobileFilters, setMobileFilters] = useState(false);

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

  const items = list.data?.items ?? [];

  const grouped = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const item of items) {
      const bucket = map.get(item.category) ?? [];
      bucket.push(item);
      map.set(item.category, bucket);
    }
    return [...map.entries()];
  }, [items]);

  const facets = (
    <FacetPanel>
      <FacetSection
        title="Category"
        options={(list.data?.facets.categories ?? []).map((row) => ({
          value: row.category,
          count: row.count,
        }))}
        active={category}
        onSelect={(value) => setParam('category', value)}
        max={10}
      />
    </FacetPanel>
  );

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Arsenal"
        title="Resources"
        description="Hand-picked references — analyst tooling, C2 intelligence, LOLbins, SIEM docs, certifications and OSINT sources."
        actions={
          <Badge tone="accent" icon={<Library />}>
            {list.data?.total ?? 0} links
          </Badge>
        }
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-20">{facets}</div>
        </aside>

        <div className="min-w-0 flex-1 space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              onClear={() => setSearchDraft('')}
              placeholder="Search resources…"
              className="w-full sm:w-80"
            />
            <Button
              variant="secondary"
              className="lg:hidden"
              icon={<SlidersHorizontal />}
              onClick={() => setMobileFilters(true)}
            >
              Filters
            </Button>
            {(category || q) && (
              <Button
                variant="ghost"
                size="sm"
                icon={<X />}
                onClick={() => {
                  setSearchDraft('');
                  setParams(new URLSearchParams());
                }}
              >
                Clear
              </Button>
            )}
            <span className="ml-auto text-[13px] text-ink-3">
              {list.loading ? 'Loading…' : `${list.data?.total ?? 0} results`}
            </span>
          </div>

          {list.error && <ErrorState error={list.error} onRetry={list.refetch} />}

          {!list.error && !list.loading && items.length === 0 && (
            <div className="rounded-lg border border-line bg-surface">
              <EmptyState icon={<SearchX />} title="No resources found" description="Try another search or category." />
            </div>
          )}

          {!list.error &&
            grouped.map(([group, entries]) => (
              <section key={group}>
                <h2 className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">
                  {titleCase(group)}
                  <span className="font-mono font-normal text-ink-3/70">{entries.length}</span>
                </h2>
                <div className="divide-y divide-line/70 overflow-hidden rounded-lg border border-line bg-surface">
                  {entries.map((resource) => (
                    <a
                      key={resource.id}
                      href={resource.url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-start gap-4 px-4 py-3.5 transition-colors hover:bg-surface2/70"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-medium text-ink transition-colors group-hover:text-accent">
                            {resource.name}
                          </span>
                          <ExternalLink className="h-3 w-3 shrink-0 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
                        </div>
                        <p className="mt-0.5 text-[13px] leading-5 text-ink-3">{resource.description}</p>
                        {resource.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {resource.tags.slice(0, 4).map((tag) => (
                              <Tag key={tag}>{tag}</Tag>
                            ))}
                          </div>
                        )}
                      </div>
                      <Badge tone="neutral" className="shrink-0">
                        {resource.category}
                      </Badge>
                    </a>
                  ))}
                </div>
              </section>
            ))}
        </div>
      </div>

      <Modal open={mobileFilters} onClose={() => setMobileFilters(false)} title="Filter resources">
        <div className="-m-5">{facets}</div>
      </Modal>
    </PageTransition>
  );
}
