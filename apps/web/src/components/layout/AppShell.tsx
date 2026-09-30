import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { CommandPalette } from './CommandPalette';
import { ShortcutsDialog } from './ShortcutsDialog';
import { Toaster } from '../ui/Toaster';
import { useHotkeys } from '../../hooks/useHotkeys';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { cn } from '../../lib/cn';

export function AppShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [collapsed, setCollapsed] = useLocalStorage('pkc.sidebarCollapsed', false);
  const { pathname } = useLocation();

  useHotkeys({
    'mod+k': () => setPaletteOpen((value) => !value),
    'mod+b': () => setCollapsed(!collapsed),
    '?': () => setShortcutsOpen(true),
    escape: () => {
      setNavOpen(false);
      setShortcutsOpen(false);
    },
  });

  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (navOpen) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previous;
      };
    }
  }, [navOpen]);

  return (
    <div className="min-h-screen">
      <Sidebar
        collapsed={collapsed}
        mobileOpen={navOpen}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        onCloseMobile={() => setNavOpen(false)}
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />

      <div
        className={cn(
          'flex min-h-screen flex-col transition-[padding] duration-200 ease-smooth',
          collapsed ? 'lg:pl-16' : 'lg:pl-60',
        )}
      >
        <Topbar onOpenNav={() => setNavOpen(true)} onOpenPalette={() => setPaletteOpen(true)} />

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </main>

        <footer className="mx-auto w-full max-w-[1440px] px-4 pb-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-[11px] text-ink-3">
            <span>KillChain Hub · open-source intelligence platform</span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-success" />
              API connected
            </span>
          </div>
        </footer>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <ShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <Toaster />
    </div>
  );
}
