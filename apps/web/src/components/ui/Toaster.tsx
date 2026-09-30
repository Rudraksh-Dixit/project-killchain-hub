import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useToast, type ToastTone } from '../../contexts/ToastContext';
import { cn } from '../../lib/cn';

const ICONS: Record<ToastTone, typeof Info> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const TONES: Record<ToastTone, string> = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-accent',
  warning: 'text-warning',
};

const STRIPES: Record<ToastTone, string> = {
  success: 'bg-success',
  error: 'bg-danger',
  info: 'bg-accent',
  warning: 'bg-warning',
};

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return createPortal(
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone];
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 32, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.97 }}
              transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
              className="pointer-events-auto relative overflow-hidden rounded-lg border border-line bg-surface shadow-pop"
            >
              <span className={cn('absolute inset-y-0 left-0 w-[3px]', STRIPES[toast.tone])} />
              <div className="flex items-start gap-2.5 py-3 pl-4 pr-3">
                <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', TONES[toast.tone])} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium leading-5 text-ink">{toast.title}</p>
                  {toast.description && (
                    <p className="mt-0.5 text-xs leading-5 text-ink-3">{toast.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Dismiss notification"
                  onClick={() => dismiss(toast.id)}
                  className="rounded-sm p-1 text-ink-3 transition-colors hover:bg-surface2 hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>,
    document.body,
  );
}
