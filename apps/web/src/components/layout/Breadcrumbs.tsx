import { NavLink, useLocation } from 'react-router-dom';
import { Fragment } from 'react';
import { ChevronRight } from 'lucide-react';
import { breadcrumbLabel } from './nav';

export function Breadcrumbs() {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return (
      <nav aria-label="Breadcrumb" className="min-w-0">
        <span className="text-[13px] font-medium text-ink">Dashboard</span>
      </nav>
    );
  }

  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 md:flex">
      <NavLink
        to="/"
        className="shrink-0 text-[13px] text-ink-3 transition-colors hover:text-ink-2"
      >
        KillChain
      </NavLink>
      {segments.map((segment, index) => {
        const to = `/${segments.slice(0, index + 1).join('/')}`;
        const last = index === segments.length - 1;
        const label = breadcrumbLabel(segment);
        return (
          <Fragment key={to}>
            <ChevronRight className="h-3 w-3 shrink-0 text-ink-3/60" />
            {last ? (
              <span className="truncate text-[13px] font-medium text-ink">{label}</span>
            ) : (
              <NavLink to={to} className="shrink-0 text-[13px] text-ink-3 transition-colors hover:text-ink-2">
                {label}
              </NavLink>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
