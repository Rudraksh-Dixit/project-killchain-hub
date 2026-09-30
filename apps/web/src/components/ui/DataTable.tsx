import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '../../lib/cn';
import { TableSkeleton } from './Skeleton';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string;
  className?: string;
  sortKey?: string;
}

export interface SortState {
  key: string;
  dir: 'asc' | 'desc';
}

interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  empty?: ReactNode;
  onRowClick?: (row: T) => void;
  isRowActive?: (row: T) => boolean;
  sort?: SortState | null;
  onSortChange?: (sort: SortState) => void;
  dense?: boolean;
  className?: string;
  minWidth?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  loading = false,
  empty,
  onRowClick,
  isRowActive,
  sort,
  onSortChange,
  dense = false,
  className,
  minWidth = '720px',
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        <TableSkeleton rows={6} cols={Math.min(columns.length, 6)} />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg border border-line bg-surface">
        {empty ?? <EmptyState compact title="No results found" description="Try adjusting your filters." />}
      </div>
    );
  }

  const handleSort = (column: Column<T>) => {
    if (!onSortChange) return;
    const key = column.sortKey ?? column.key;
    if (sort?.key === key) {
      onSortChange({ key, dir: sort.dir === 'asc' ? 'desc' : 'asc' });
    } else {
      onSortChange({ key, dir: 'asc' });
    }
  };

  return (
    <div className={cn('overflow-hidden rounded-lg border border-line bg-surface', className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[13px]" style={{ minWidth }}>
          <thead>
            <tr className="border-b border-line bg-surface2/70">
              {columns.map((column) => {
                const key = column.sortKey ?? column.key;
                const active = sort?.key === key;
                const sortable = Boolean(onSortChange);
                return (
                  <th
                    key={column.key}
                    style={column.width ? { width: column.width } : undefined}
                    className={cn(
                      'px-4 py-2.5 font-medium text-ink-3',
                      column.align === 'right' && 'text-right',
                      column.align === 'center' && 'text-center',
                      column.className,
                    )}
                  >
                    {sortable && onSortChange ? (
                      <button
                        type="button"
                        onClick={() => handleSort(column)}
                        className={cn(
                          'inline-flex items-center gap-1 transition-colors hover:text-ink',
                          active && 'text-ink',
                        )}
                      >
                        {column.header}
                        {active ? (
                          sort.dir === 'asc' ? (
                            <ArrowUp className="h-3 w-3" />
                          ) : (
                            <ArrowDown className="h-3 w-3" />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-50" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const active = isRowActive?.(row) ?? false;
              return (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'group/row border-b border-line/70 transition-colors last:border-b-0',
                    onRowClick && 'cursor-pointer',
                    onRowClick && 'hover:bg-surface2/70',
                    active && 'bg-accent/[0.07]',
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        dense ? 'px-4 py-2' : 'px-4 py-3',
                        'align-middle text-ink-2',
                        column.align === 'right' && 'text-right',
                        column.align === 'center' && 'text-center',
                        column.className,
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
