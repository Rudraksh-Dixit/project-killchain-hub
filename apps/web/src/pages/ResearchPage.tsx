import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Clock, SearchX, SlidersHorizontal, X } from 'lucide-react';
import { qs } from '../lib/query';
import { useQuery } from '../hooks/useQuery';
import { useDebounced } from '../hooks/useDebounced';
import { formatDate } from '../lib/format';
import type { Article, ArticleListResponse } from '../lib/types';
import {
  Badge,
  Button,
  EmptyState,
  ErrorState,
  Modal,
  PageHeader,
  PageTransition,
  Pagination,
  SearchInput,
  Tag,
} from '../components/ui';
import { FacetPanel, FacetSection } from '../components/Facets';

function ArticleCard({ article, featured = false }: { article: Article; featured?: boolean }) {
  return (
    <Link
      to={`/research/${article.id}`}
      className={`group flex flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-card transition-all duration-150 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-pop ${
        featured ? 'sm:col-span-2 xl:col-span-2' : ''
      }`}
    >
      <div className="flex items-center gap-2 border-b border-line bg-surface2/50 px-4 py-2.5">
        <Badge tone="accent">{article.category}</Badge>
        <span className="ml-auto flex items-center gap-1 text-[11px] text-ink-3">
          <Clock className="h-3 w-3" />
          {article.readTime} min read
        </span>
      </div>
      <div className={`flex flex-1 flex-col gap-2 p-4 ${featured ? 'sm:p-6' : ''}`}>
        <h3
          className={`font-display font-semibold leading-snug text-ink transition-colors group-hover:text-accent ${
            featured ? 'text-xl' : 'text-[15px]'
          }`}
        >
          {article.title}
        </h3>
        <p className={`text-[13px] leading-6 text-ink-3 ${featured ? 'line-clamp-3' : 'line-clamp-2'}`}>
          {article.excerpt}
        </p>
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-3">
          {article.tags.slice(0, 3).map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
          <span className="ml-auto flex items-center gap-1 text-[11px] text-ink-3">
            {article.author} · {formatDate(article.publishedAt)}
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function ResearchPage() {
  const [params, setParams] = useSearchParams();

  const q = params.get('q') ?? '';
  const category = params.get('category');
  const tag = params.get('tag');
  const page = Math.max(1, Number(params.get('page') ?? 1));

  const listQuery = useMemo(() => qs({ q, category, tag, page, pageSize: 12 }), [q, category, tag, page]);
  const list = useQuery<ArticleListResponse>(`/articles${listQuery}`);

  const [searchDraft, setSearchDraft] = useState(q);
  const debouncedSearch = useDebounced(searchDraft, 350);
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
  const hasFilters = Boolean(category || tag);

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
      />
      <FacetSection
        title="Tags"
        options={(list.data?.facets.tags ?? []).map((row) => ({ value: row.tag, count: row.count }))}
        active={tag}
        onSelect={(value) => setParam('tag', value)}
        max={10}
      />
    </FacetPanel>
  );

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Research"
        title="Knowledge Base"
        description="Tradecraft write-ups, threat deep-dives and defensive playbooks from the community."
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
              placeholder="Search articles…"
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
            {hasFilters && (
              <Button variant="ghost" size="sm" icon={<X />} onClick={clearFilters}>
                Clear
              </Button>
            )}
            <span className="ml-auto text-[13px] text-ink-3">
              {list.loading ? 'Loading…' : `${total} articles`}
            </span>
          </div>

          {list.error && <ErrorState error={list.error} onRetry={list.refetch} />}

          {!list.error && !list.loading && rows.length === 0 && (
            <div className="rounded-lg border border-line bg-surface">
              <EmptyState
                icon={<SearchX />}
                title="No articles found"
                description="Nothing matches the current search and filters."
              />
            </div>
          )}

          {!list.error && rows.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((article, index) => (
                <ArticleCard key={article.id} article={article} featured={index === 0 && page === 1 && !hasFilters && !q} />
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

      <Modal open={mobileFilters} onClose={() => setMobileFilters(false)} title="Filter articles">
        <div className="-m-5">{facets}</div>
      </Modal>
    </PageTransition>
  );
}
