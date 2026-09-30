import { FacetPanel, FacetSection } from '../../components/Facets';
import type { IocFacets } from '../../lib/types';

export type IocFilterKey = 'type' | 'severity' | 'category' | 'family' | 'tag';

export type IocFilterState = Record<IocFilterKey, string | null>;

export function IocFilters({
  facets,
  active,
  onSelect,
  className,
}: {
  facets: IocFacets | null;
  active: IocFilterState;
  onSelect: (key: IocFilterKey, value: string | null) => void;
  className?: string;
}) {
  return (
    <FacetPanel className={className}>
      <div className="border-b border-line bg-surface2/60 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-3">
        Refine results
      </div>
      <FacetSection
        title="Type"
        options={(facets?.types ?? []).map((row) => ({ value: row.type, count: row.count }))}
        active={active.type}
        onSelect={(value) => onSelect('type', value)}
      />
      <FacetSection
        title="Severity"
        options={(facets?.severities ?? []).map((row) => ({ value: row.severity, count: row.count }))}
        active={active.severity}
        onSelect={(value) => onSelect('severity', value)}
      />
      <FacetSection
        title="Category"
        options={(facets?.categories ?? []).map((row) => ({ value: row.category, count: row.count }))}
        active={active.category}
        onSelect={(value) => onSelect('category', value)}
      />
      <FacetSection
        title="Malware family"
        options={(facets?.families ?? []).map((row) => ({ value: row.family, count: row.count }))}
        active={active.family}
        onSelect={(value) => onSelect('family', value)}
      />
      <FacetSection
        title="Tags"
        options={(facets?.tags ?? []).map((row) => ({ value: row.tag, count: row.count }))}
        active={active.tag}
        onSelect={(value) => onSelect('tag', value)}
        max={10}
      />
    </FacetPanel>
  );
}
