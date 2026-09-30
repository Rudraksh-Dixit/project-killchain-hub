import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Download,
  Plus,
  SearchX,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { api, apiDownload } from '../lib/api';
import { qs } from '../lib/query';
import { useQuery } from '../hooks/useQuery';
import { useDebounced } from '../hooks/useDebounced';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { relativeTime } from '../lib/format';
import type { Ioc, IocListResponse } from '../lib/types';
import {
  Badge,
  Button,
  ConfidenceBar,
  DataTable,
  DropdownMenu,
  EmptyState,
  ErrorState,
  Modal,
  PageHeader,
  PageTransition,
  Pagination,
  SearchInput,
  SeverityBadge,
  Tag,
  type Column,
} from '../components/ui';
import { IocFilters, type IocFilterKey, type IocFilterState } from './iocs/IocFilters';
import { IocDetailDrawer } from './iocs/IocDetailDrawer';
import { IocFormModal } from './iocs/IocFormModal';
import { IocImportModal } from './iocs/IocImportModal';

const FILTER_KEYS = ['type', 'severity', 'category', 'family', 'tag'] as const;

export function IocsPage() {
  const [params, setParams] = useSearchParams();
  const { hasRole } = useAuth();
  const toast = useToast();

  const canWrite = hasRole('contributor');
  const canDelete = hasRole('admin');

  const q = params.get('q') ?? '';
  const sort = params.get('sort') ?? 'last_seen';
  const order = (params.get('order') ?? 'desc') as 'asc' | 'desc';
  const page = Math.max(1, Number(params.get('page') ?? 1));
  const pageSize = Math.min(200, Math.max(1, Number(params.get('pageSize') ?? 25)));
  const focus = params.get('focus');

  const filters = useMemo(() => {
    const state = {} as IocFilterState;
    for (const key of FILTER_KEYS) state[key] = params.get(key);
    return state;
  }, [params]);

  const filterQs = useMemo(
    () => qs({ q, ...filters, sort, order, page, pageSize }),
    [q, filters, sort, order, page, pageSize],
  );

  const list = useQuery<IocListResponse>(`/iocs${filterQs}`);

  const [searchDraft, setSearchDraft] = useState(q);
  const debouncedSearch = useDebounced(searchDraft, 350);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Ioc | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [mobileFilters, setMobileFilters] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    if (debouncedSearch === q) return;
    const next = new URLSearchParams(params);
    if (debouncedSearch) next.set('q', debouncedSearch);
    else next.delete('q');
    next.delete('page');
    setParams(next, { replace: true });
  }, [debouncedSearch]);

  useEffect(() => {
    setSelected(new Set());
  }, [filterQs]);

  function updateParams(patch: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(patch)) {
      if (value === null || value === '') next.delete(key);
      else next.set(key, value);
    }
    setParams(next);
  }

  function setFilter(key: IocFilterKey, value: string | null) {
    const next = new URLSearchParams(params);
    if (value === null) next.delete(key);
    else next.set(key, value);
    next.delete('page');
    setParams(next);
  }

  function clearAllFilters() {
    const next = new URLSearchParams();
    if (searchDraft) next.set('q', searchDraft);
    setParams(next);
  }

  const activeFilters = FILTER_KEYS.filter((key) => filters[key]);

  const rows = list.data?.items ?? [];
  const total = list.data?.total ?? 0;

  const selectAll = rows.length > 0 && rows.every((row) => selected.has(row.id));

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(() => {
      if (selectAll) return new Set<string>();
      return new Set(rows.map((row) => row.id));
    });
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    try {
      const res = await api<{ deleted: number }>('/iocs/bulk/delete', {
        method: 'POST',
        body: { ids: [...selected] },
      });
      toast.success(`Deleted ${res.deleted} indicators`);
      setSelected(new Set());
      list.refetch();
    } catch (error) {
      toast.error('Bulk delete failed', error instanceof Error ? error.message : undefined);
    } finally {
      setBulkDeleting(false);
    }
  }

  const columns: Column<Ioc>[] = [
    ...(canDelete
      ? [
          {
            key: 'select',
            header: (
              <input
                type="checkbox"
                aria-label="Select all indicators on this page"
                checked={selectAll}
                onChange={toggleAll}
                disabled={rows.length === 0}
                className="h-3.5 w-3.5 accent-[rgb(var(--c-accent))]"
              />
            ),
            width: '40px',
            cell: (row: Ioc) => (
              <input
                type="checkbox"
                aria-label={`Select ${row.value}`}
                checked={selected.has(row.id)}
                onClick={(event) => event.stopPropagation()}
                onChange={() => toggleRow(row.id)}
                className="h-3.5 w-3.5 accent-[rgb(var(--c-accent))]"
              />
            ),
          } satisfies Column<Ioc>,
        ]
      : []),
    {
      key: 'severity',
      header: 'Severity',
      sortKey: 'severity',
      width: '104px',
      cell: (row) => <SeverityBadge severity={row.severity} />,
    },
    {
      key: 'value',
      header: 'Indicator',
      sortKey: 'value',
      cell: (row) => (
        <span className="block max-w-[340px] truncate font-mono text-[13px] text-ink" title={row.value}>
          {row.value}
        </span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      sortKey: 'type',
      width: '84px',
      cell: (row) => <Badge tone="neutral">{row.type}</Badge>,
    },
    {
      key: 'family',
      header: 'Family',
      sortKey: 'malware_family',
      width: '140px',
      cell: (row) => (
        <span className="block max-w-[140px] truncate text-[13px]" title={row.malwareFamily}>
          {row.malwareFamily}
        </span>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      sortKey: 'category',
      width: '110px',
      cell: (row) => <Badge tone="accent">{row.category}</Badge>,
    },
    {
      key: 'tags',
      header: 'Tags',
      width: '170px',
      cell: (row) => (
        <span className="flex max-w-[170px] flex-wrap gap-1">
          {row.tags.slice(0, 2).map((tag) => (
            <Tag key={tag}>{tag}</Tag>
          ))}
          {row.tags.length > 2 && <Tag>+{row.tags.length - 2}</Tag>}
        </span>
      ),
    },
    {
      key: 'confidence',
      header: 'Confidence',
      sortKey: 'confidence',
      width: '120px',
      cell: (row) => <ConfidenceBar confidence={row.confidence} />,
    },
    {
      key: 'lastSeen',
      header: 'Last seen',
      sortKey: 'last_seen',
      width: '110px',
      align: 'right',
      cell: (row) => <span className="whitespace-nowrap text-[13px]">{relativeTime(row.lastSeen)}</span>,
    },
  ];

  const facetProps = {
    facets: list.data?.facets ?? null,
    active: filters,
    onSelect: setFilter,
  };

  return (
    <PageTransition>
      <PageHeader
        eyebrow="Intelligence"
        title="IOC Explorer"
        description="Faceted search across every tracked indicator — filter, export to CSV/JSON/STIX, and drill into context."
        actions={
          <>
            <DropdownMenu
              trigger={
                <Button variant="secondary" icon={<Download />}>
                  Export
                </Button>
              }
              items={[
                {
                  label: 'Download CSV',
                  onSelect: () =>
                    apiDownload(`/iocs/export?format=csv${filterQs}`, 'pkc-iocs.csv').catch(() =>
                      toast.error('Export failed'),
                    ),
                },
                {
                  label: 'Download JSON',
                  onSelect: () =>
                    apiDownload(`/iocs/export?format=json${filterQs}`, 'pkc-iocs.json').catch(() =>
                      toast.error('Export failed'),
                    ),
                },
                {
                  label: 'Download STIX 2.1',
                  onSelect: () =>
                    apiDownload(`/iocs/export?format=stix${filterQs}`, 'pkc-iocs.stix.json').catch(() =>
                      toast.error('Export failed'),
                    ),
                },
              ]}
            />
            {canWrite && (
              <Button variant="secondary" icon={<Upload />} onClick={() => setImportOpen(true)}>
                Import
              </Button>
            )}
            {canWrite && (
              <Button
                variant="primary"
                icon={<Plus />}
                onClick={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              >
                New IOC
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <aside className="hidden w-60 shrink-0 lg:block">
          <IocFilters {...facetProps} className="sticky top-20" />
        </aside>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              onClear={() => setSearchDraft('')}
              placeholder="Search value, family, source, tags…"
              className="w-full sm:w-80"
            />
            <Button
              variant="secondary"
              className="lg:hidden"
              icon={<SlidersHorizontal />}
              onClick={() => setMobileFilters(true)}
            >
              Filters
              {activeFilters.length > 0 && (
                <span className="ml-1 rounded-sm bg-accent/20 px-1 font-mono text-[10px] text-accent">
                  {activeFilters.length}
                </span>
              )}
            </Button>

            {(activeFilters.length > 0 || q) && (
              <Button variant="ghost" size="sm" icon={<X />} onClick={clearAllFilters}>
                Clear
              </Button>
            )}

            <div className="ml-auto text-[13px] text-ink-3">
              {list.loading ? 'Loading…' : `${total.toLocaleString()} indicators`}
            </div>
          </div>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              {activeFilters.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key, null)}
                  className="group inline-flex items-center gap-1.5 rounded-sm border border-accent/30 bg-accent/10 px-2 py-1 text-[11px] font-medium text-accent transition-colors hover:border-accent/60"
                >
                  {key}: {filters[key]}
                  <X className="h-3 w-3 opacity-60 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          )}

          {canDelete && selected.size > 0 && (
            <div className="flex items-center justify-between rounded-md border border-accent/30 bg-accent/[0.07] px-3 py-2">
              <span className="text-[13px] text-ink">
                {selected.size} selected
              </span>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 />}
                loading={bulkDeleting}
                onClick={handleBulkDelete}
              >
                Delete selected
              </Button>
            </div>
          )}

          {list.error ? (
            <ErrorState error={list.error} onRetry={list.refetch} />
          ) : (
            <>
              <DataTable
                columns={columns}
                rows={rows}
                rowKey={(row) => row.id}
                loading={list.loading}
                sort={{ key: sort, dir: order }}
                onSortChange={(next) => updateParams({ sort: next.key, order: next.dir, page: null })}
                onRowClick={(row) => updateParams({ focus: row.id })}
                isRowActive={(row) => row.id === focus}
                minWidth="980px"
                empty={
                  <EmptyState
                    compact
                    icon={<SearchX />}
                    title="No indicators match these filters"
                    description="Try a different search term, or clear the active filters to browse the full set."
                    action={
                      activeFilters.length > 0 ? (
                        <Button variant="secondary" size="sm" onClick={clearAllFilters}>
                          Clear filters
                        </Button>
                      ) : undefined
                    }
                  />
                }
              />
              {total > 0 && (
                <div className="overflow-hidden rounded-lg border border-line bg-surface">
                  <Pagination
                    page={page}
                    pageSize={pageSize}
                    total={total}
                    onPageChange={(next) => updateParams({ page: String(next) })}
                    onPageSizeChange={(next) => updateParams({ pageSize: String(next), page: null })}
                    pageSizeOptions={[25, 50, 100]}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* mobile filters */}
      <Modal open={mobileFilters} onClose={() => setMobileFilters(false)} title="Filter indicators">
        <IocFilters {...facetProps} className="-m-5 border-0" />
      </Modal>

      <IocDetailDrawer
        iocId={focus}
        onClose={() => updateParams({ focus: null })}
        onFocusIoc={(id) => updateParams({ focus: id })}
        onEdit={(ioc) => {
          setEditing(ioc);
          setFormOpen(true);
        }}
        onChanged={list.refetch}
      />

      <IocFormModal
        open={formOpen}
        ioc={editing}
        onClose={() => setFormOpen(false)}
        onSaved={list.refetch}
      />

      <IocImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={list.refetch}
      />
    </PageTransition>
  );
}
