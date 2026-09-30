import { useNavigate } from 'react-router-dom';
import { ArrowLeft, SearchX } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { PageTransition } from '../components/ui';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <PageTransition className="flex min-h-[62vh] flex-col items-center justify-center text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-line bg-surface2 text-ink-3">
        <SearchX className="h-6 w-6" />
      </div>
      <p className="mt-6 font-display text-6xl font-semibold tracking-tight text-accent/40">404</p>
      <h1 className="mt-3 text-xl font-semibold text-ink">Page not found</h1>
      <p className="mt-1.5 max-w-sm text-[13px] leading-5 text-ink-3">
        The route you requested does not exist in this workspace. It may have been moved or the link
        is out of date.
      </p>
      <div className="mt-7 flex items-center gap-2">
        <Button variant="primary" icon={<ArrowLeft />} onClick={() => navigate('/')}>
          Back to dashboard
        </Button>
        <Button variant="secondary" onClick={() => navigate('/iocs')}>
          Browse IOCs
        </Button>
      </div>
    </PageTransition>
  );
}
