import { NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronsLeft, Keyboard, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Logo } from './Logo';
import { NAV_GROUPS } from './nav';
import { Kbd } from '../ui/Kbd';
import { Tooltip } from '../ui/Tooltip';

export interface SidebarProps {
  collapsed: boolean;
  mobileOpen: boolean;
  onToggleCollapse: () => void;
  onCloseMobile: () => void;
  onOpenShortcuts: () => void;
}

function SidebarContent({
  collapsed,
  onToggleCollapse,
  onCloseMobile,
  onOpenShortcuts,
}: Omit<SidebarProps, 'mobileOpen'>) {
  return (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          'flex h-14 shrink-0 items-center border-b border-line',
          collapsed ? 'justify-between px-2' : 'justify-between px-4',
        )}
      >
        <Logo compact={collapsed} />
        {collapsed && (
          <Tooltip label="Expand sidebar" side="right">
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Expand sidebar"
              className="rounded-md p-1.5 text-ink-3 transition-colors hover:bg-surface2 hover:text-ink-2"
            >
              <ChevronsLeft className="h-4 w-4 rotate-180" />
            </button>
          </Tooltip>
        )}
        {!collapsed && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onOpenShortcuts}
              aria-label="Keyboard shortcuts"
              className="rounded-md p-1.5 text-ink-3 transition-colors hover:bg-surface2 hover:text-ink-2"
            >
              <Keyboard className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
              className="hidden rounded-md p-1.5 text-ink-3 transition-colors hover:bg-surface2 hover:text-ink-2 lg:block"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onCloseMobile}
              aria-label="Close navigation"
              className="rounded-md p-1.5 text-ink-3 transition-colors hover:bg-surface2 hover:text-ink-2 lg:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2.5 py-4" aria-label="Primary">
        {NAV_GROUPS.map((group, groupIndex) => (
          <div key={group.label} className={cn(groupIndex > 0 && 'mt-5')}>
            {!collapsed && (
              <div className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3/80">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const inner = (
                  <span
                    className={cn(
                      'flex min-w-0 items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium',
                      'transition-colors duration-150',
                      collapsed && 'justify-center px-0 py-2.5',
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" strokeWidth={2} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </span>
                );

                const nav = (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={onCloseMobile}
                    aria-label={collapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      cn(
                        'relative block rounded-md transition-colors duration-150',
                        isActive
                          ? 'bg-accent/10 text-ink'
                          : 'text-ink-2 hover:bg-surface2/80 hover:text-ink',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <motion.span
                            layoutId="nav-active"
                            className="absolute inset-y-1 left-0 w-[3px] rounded-full bg-accent"
                            transition={{ type: 'spring', stiffness: 480, damping: 36 }}
                          />
                        )}
                        {inner}
                      </>
                    )}
                  </NavLink>
                );

                return collapsed ? (
                  <Tooltip key={item.to} label={item.label} side="right">
                    {nav}
                  </Tooltip>
                ) : (
                  nav
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn('shrink-0 border-t border-line p-3', collapsed && 'px-2')}>
        <button
          type="button"
          onClick={onOpenShortcuts}
          className={cn(
            'flex w-full items-center rounded-md border border-line bg-surface2/60 text-ink-3 transition-colors hover:border-line-strong hover:text-ink-2',
            collapsed ? 'justify-center px-0 py-2' : 'justify-between px-3 py-2',
          )}
        >
          {collapsed ? (
            <Keyboard className="h-3.5 w-3.5" />
          ) : (
            <>
              <span className="text-xs">Quick search</span>
              <span className="flex items-center gap-1">
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function Sidebar({
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onCloseMobile,
  onOpenShortcuts,
}: SidebarProps) {
  const contentProps = { collapsed, onToggleCollapse, onCloseMobile, onOpenShortcuts };

  return (
    <>
      {/* desktop rail */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 hidden border-r border-line bg-surface transition-[width] duration-200 ease-smooth lg:block',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <SidebarContent {...contentProps} />
      </aside>

      {/* mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={onCloseMobile}
            />
            <motion.aside
              className="absolute inset-y-0 left-0 w-64 border-r border-line bg-surface"
              initial={{ x: -272 }}
              animate={{ x: 0 }}
              exit={{ x: -272 }}
              transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <SidebarContent {...contentProps} collapsed={false} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
