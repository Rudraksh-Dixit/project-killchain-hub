import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Copy, Pencil, Trash2, X } from 'lucide-react';
import { useQuery } from '../../hooks/useQuery';
import { useCopy } from '../../hooks/useCopy';
import { api } from '../../lib/api';
import { formatDateTime, relativeTime } from '../../lib/format';
import type { Ioc } from '../../lib/types';
import {
  Badge,
  Button,
  ConfidenceBar,
  ErrorState,
  SeverityBadge,
  Skeleton,
} from '../../components/ui';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

interface DetailResponse {
  ioc: Ioc;
  related: Ioc[];
}

function Meta({ label, title, children }: { label: string; title?: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">{label}</dt>
      <dd className="mt-0.5 truncate text-[13px] text-ink-2" title={title}>{children}</dd>
    </div>
  );
}

export function IocDetailDrawer({
  iocId,
  onClose,
  onFocusIoc,
  onEdit,
  onChanged,
}: {
  iocId: string | null;
  onClose: () => void;
  onFocusIoc: (id: string) => void;
  onEdit: (ioc: Ioc) => void;
  onChanged: () => void;
}) {
  const detail = useQuery<DetailResponse>(iocId ? `/iocs/${iocId}` : null, [iocId]);
  const { copied, copy } = useCopy();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!iocId) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [iocId, onClose]);

  const ioc = detail.data?.ioc;

  async function handleDelete() {
    if (!ioc) return;
    setDeleting(true);
    try {
      await api(`/iocs/${ioc.id}`, { method: 'DELETE' });
      setConfirmDelete(false);
      onClose();
      onChanged();
    } finally {
      setDeleting(false);
    }
  }

  return createPortal(
    <AnimatePresence>
      {iocId && (
        <div className="fixed inset-0 z-[70]">
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Indicator details"
            className="absolute inset-y-0 right-0 flex w-full max-w-[460px] flex-col border-l border-line bg-surface shadow-overlay"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <header className="flex items-start gap-3 border-b border-line px-5 py-4">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  {ioc && <SeverityBadge severity={ioc.severity} />}
                  {ioc && <Badge tone="neutral">{ioc.type}</Badge>}
                </div>
                <p className="break-all font-mono text-[15px] font-medium leading-6 text-ink">
                  {ioc ? ioc.value : <Skeleton className="h-5 w-56" />}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close details"
                className="-m-1 rounded-md p-1 text-ink-3 transition-colors hover:bg-surface2 hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto">
              {detail.loading && (
                <div className="space-y-4 p-5">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-24 w-full" />
                </div>
              )}

              {detail.error && <ErrorState error={detail.error} onRetry={detail.refetch} />}

              {ioc && (
                <div className="space-y-6 p-5">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={copied === ioc.value ? <Check className="text-success" /> : <Copy />}
                      onClick={() => copy(ioc.value)}
                    >
                      {copied === ioc.value ? 'Copied' : 'Copy value'}
                    </Button>
                    <Button variant="secondary" size="sm" icon={<Pencil />} onClick={() => onEdit(ioc)}>
                      Edit
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="text-danger"
                      icon={<Trash2 />}
                      onClick={() => setConfirmDelete(true)}
                    >
                      Delete
                    </Button>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                    <Meta label="Malware family">{ioc.malwareFamily}</Meta>
                    <Meta label="Category">
                      <Badge tone="accent">{ioc.category}</Badge>
                    </Meta>
                    <Meta label="Confidence">
                      <ConfidenceBar confidence={ioc.confidence} />
                    </Meta>
                    <Meta label="Source">{ioc.source || '—'}</Meta>
                    <Meta label="First seen" title={ioc.firstSeen}>
                      {formatDateTime(ioc.firstSeen)}
                    </Meta>
                    <Meta label="Last seen" title={ioc.lastSeen}>
                      {relativeTime(ioc.lastSeen)}
                    </Meta>
                    <Meta label="Created by">{ioc.createdBy ?? 'system'}</Meta>
                    <Meta label="Updated">{relativeTime(ioc.updatedAt)}</Meta>
                  </dl>

                  <div>
                    <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                      Description
                    </h3>
                    <p className="text-[13px] leading-6 text-ink-2">
                      {ioc.description || 'No description provided for this indicator.'}
                    </p>
                  </div>

                  <div>
                    <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                      Tags
                    </h3>
                    {ioc.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {ioc.tags.map((tag) => (
                          <Badge key={tag} tone="neutral">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[13px] text-ink-3">No tags.</p>
                    )}
                  </div>

                  {(detail.data?.related.length ?? 0) > 0 && (
                    <div>
                      <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">
                        Related indicators ({detail.data?.related.length})
                      </h3>
                      <ul className="space-y-1">
                        {detail.data?.related.map((rel) => (
                          <li key={rel.id}>
                            <button
                              type="button"
                              onClick={() => onFocusIoc(rel.id)}
                              className="flex w-full items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-left transition-colors hover:border-line hover:bg-surface2"
                            >
                              <SeverityBadge severity={rel.severity} withIcon={false} />
                              <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-ink-2">
                                {rel.value}
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.aside>

          <ConfirmDialog
            open={confirmDelete}
            title="Delete indicator"
            message={`Permanently delete ${ioc?.value ?? 'this indicator'}? This cannot be undone.`}
            confirmLabel="Delete"
            danger
            loading={deleting}
            onConfirm={handleDelete}
            onClose={() => setConfirmDelete(false)}
          />
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
