import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Crosshair,
  FileText,
  Library,
  LogOut,
  Moon,
  Radar,
  Search,
  Settings,
  Sun,
  Terminal,
  Wrench,
} from 'lucide-react';
import { useQuery } from '../../hooks/useQuery';
import { useDebounced } from '../../hooks/useDebounced';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import type { SearchResults } from '../../lib/types';
import { Kbd } from '../ui/Kbd';
import { cn } from '../../lib/cn';

interface Command {
  id: string;
  group: string;
  label: string;
  subtitle?: string;
  icon: ReactNode;
  run: () => void;
}

interface Group {
  name: string;
  commands: Command[];
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const trimmed = query.trim();
  const debounced = useDebounced(trimmed, 220);
  const search = useQuery<SearchResults>(
    open && debounced.length >= 2 ? `/search?q=${encodeURIComponent(debounced)}` : null,
    [debounced],
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      const timer = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(timer);
    }
  }, [open]);

  const staticCommands = useMemo<Command[]>(() => {
    const go = (to: string) => () => {
      onClose();
      navigate(to);
    };

    const nav: Command[] = [
      { id: 'nav-dashboard', group: 'Navigate', label: 'Dashboard', icon: <Search className="h-4 w-4" />, run: go('/') },
      { id: 'nav-iocs', group: 'Navigate', label: 'IOC Explorer', icon: <Crosshair className="h-4 w-4" />, run: go('/iocs') },
      { id: 'nav-hunts', group: 'Navigate', label: 'Hunt Library', icon: <Radar className="h-4 w-4" />, run: go('/hunts') },
      { id: 'nav-research', group: 'Navigate', label: 'Knowledge Base', icon: <BookOpen className="h-4 w-4" />, run: go('/research') },
      { id: 'nav-tools', group: 'Navigate', label: 'Tools', icon: <Wrench className="h-4 w-4" />, run: go('/tools') },
      { id: 'nav-resources', group: 'Navigate', label: 'Resources', icon: <Library className="h-4 w-4" />, run: go('/resources') },
      { id: 'nav-reports', group: 'Navigate', label: 'Reports', icon: <FileText className="h-4 w-4" />, run: go('/reports') },
      { id: 'nav-community', group: 'Navigate', label: 'Community', icon: <Terminal className="h-4 w-4" />, run: go('/community') },
      { id: 'nav-settings', group: 'Navigate', label: 'Settings', icon: <Settings className="h-4 w-4" />, run: go('/settings') },
    ];

    const actions: Command[] = [
      {
        id: 'action-theme',
        group: 'Actions',
        label: theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme',
        icon: theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />,
        run: () => {
          toggleTheme();
          onClose();
        },
      },
      ...(user
        ? [
            {
              id: 'action-signout',
              group: 'Actions',
              label: 'Sign out',
              icon: <LogOut className="h-4 w-4" />,
              run: () => {
                logout();
                onClose();
                navigate('/login');
              },
            } satisfies Command,
          ]
        : []),
    ];

    return [...nav, ...actions];
  }, [navigate, onClose, theme, toggleTheme, user, logout]);

  const groups = useMemo<Group[]>(() => {
    const q = query.trim().toLowerCase();
    const filteredStatic = q
      ? staticCommands.filter((command) => command.label.toLowerCase().includes(q))
      : staticCommands;

    const resultGroups: Group[] = [];
    const data = search.data;

    if (q.length >= 2 && data) {
      const map: [keyof SearchResults['results'], string, ReactNode][] = [
        ['iocs', 'IOCs', <Crosshair key="ioc" className="h-4 w-4" />],
        ['hunts', 'Hunts', <Radar key="hunt" className="h-4 w-4" />],
        ['articles', 'Research', <BookOpen key="art" className="h-4 w-4" />],
        ['tools', 'Tools', <Wrench key="tool" className="h-4 w-4" />],
        ['resources', 'Resources', <Library key="res" className="h-4 w-4" />],
      ];

      for (const [key, name, icon] of map) {
        const items = (data.results?.[key] ?? []).map<Command>((item) => ({
          id: `${key}-${item.id}`,
          group: name,
          label: item.title,
          subtitle: item.subtitle,
          icon,
          run: () => {
            onClose();
            if (key === 'articles') navigate(`/research/${item.id}`);
            else if (key === 'iocs') navigate(`/iocs?focus=${item.id}`);
            else if (key === 'hunts') navigate(`/hunts?focus=${item.id}`);
            else if (key === 'tools') navigate(`/tools?focus=${item.id}`);
            else navigate('/resources');
          },
        }));
        if (items.length > 0) resultGroups.push({ name, commands: items });
      }
    }

    const byGroup = new Map<string, Command[]>();
    for (const command of filteredStatic) {
      const list = byGroup.get(command.group) ?? [];
      list.push(command);
      byGroup.set(command.group, list);
    }
    const staticGroups: Group[] = [...byGroup.entries()].map(([name, commands]) => ({ name, commands }));

    return [...resultGroups, ...staticGroups];
  }, [query, staticCommands, search.data, navigate, onClose]);

  const flat = useMemo(() => groups.flatMap((group) => group.commands), [groups]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    const node = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    node?.scrollIntoView({ block: 'nearest' });
  }, [active, groups]);

  const runActive = () => {
    const command = flat[active];
    if (command) command.run();
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((index) => (flat.length === 0 ? 0 : (index + 1) % flat.length));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((index) => (flat.length === 0 ? 0 : (index - 1 + flat.length) % flat.length));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      runActive();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  };

  let index = -1;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-start justify-center p-4 pt-[12vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-[3px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.14 }}
          onClick={onClose}
        />
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
          className="relative w-full max-w-xl overflow-hidden rounded-xl border border-line bg-surface shadow-overlay"
          initial={{ opacity: 0, y: -8, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.985 }}
          transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-ink-3" />
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search IOCs, hunts, research, tools…"
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
              aria-label="Search commands"
              autoComplete="off"
              spellCheck={false}
            />
            {search.loading && <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-ink-3 border-t-transparent" />}
            <Kbd>esc</Kbd>
          </div>

          <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-1.5">
            {flat.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-ink-2">No results for “{query}”</p>
                <p className="mt-1 text-xs text-ink-3">Try a different search term</p>
              </div>
            ) : (
              groups.map((group) => (
                <div key={group.name} className="mb-1 last:mb-0">
                  <div className="px-2.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">
                    {group.name}
                  </div>
                  {group.commands.map((command) => {
                    index += 1;
                    const currentIndex = index;
                    const isActive = currentIndex === active;
                    return (
                      <button
                        key={command.id}
                        data-active={isActive}
                        type="button"
                        onMouseMove={() => setActive(currentIndex)}
                        onClick={() => command.run()}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors',
                          isActive ? 'bg-accent/10 text-ink' : 'text-ink-2 hover:bg-surface2',
                        )}
                      >
                        <span className={cn('shrink-0', isActive ? 'text-accent' : 'text-ink-3')}>
                          {command.icon}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium">{command.label}</span>
                        {command.subtitle && (
                          <span className="max-w-[45%] truncate text-xs text-ink-3">{command.subtitle}</span>
                        )}
                        {isActive && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-accent" />}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          <div className="flex items-center justify-between border-t border-line bg-surface2/50 px-4 py-2 text-[11px] text-ink-3">
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> navigate</span>
              <span className="flex items-center gap-1"><Kbd>↵</Kbd> open</span>
            </span>
            <span className="flex items-center gap-1"><Kbd>⌘</Kbd><Kbd>K</Kbd> toggle</span>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
