import { useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, Menu, Moon, Search, Settings2, Sun } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { DropdownMenu } from '../ui/DropdownMenu';
import { Kbd } from '../ui/Kbd';
import { Tooltip } from '../ui/Tooltip';
import { Breadcrumbs } from './Breadcrumbs';

export function Topbar({
  onOpenNav,
  onOpenPalette,
}: {
  onOpenNav: () => void;
  onOpenPalette: () => void;
}) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-bg/85 px-4 backdrop-blur-md sm:px-6">
      <button
        type="button"
        onClick={onOpenNav}
        aria-label="Open navigation"
        className="-ml-1 rounded-md p-1.5 text-ink-2 transition-colors hover:bg-surface2 hover:text-ink lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <Breadcrumbs />

      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={onOpenPalette}
          className="hidden items-center gap-2 rounded-md border border-line bg-surface2/70 px-2.5 py-1.5 text-[13px] text-ink-3 transition-colors hover:border-line-strong hover:text-ink-2 sm:flex"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search</span>
          <span className="ml-6 flex items-center gap-1">
            <Kbd>⌘</Kbd>
            <Kbd>K</Kbd>
          </span>
        </button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Search"
          className="sm:hidden"
          onClick={onOpenPalette}
          icon={<Search />}
        />

        <Tooltip label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={toggleTheme}
            icon={theme === 'dark' ? <Sun /> : <Moon />}
          />
        </Tooltip>

        <DropdownMenu
          align="right"
          trigger={
            <button
              type="button"
              className="flex items-center gap-2 rounded-md px-1.5 py-1 transition-colors hover:bg-surface2"
              aria-label="Account menu"
            >
              <Avatar name={user.displayName} size="sm" />
              <span className="hidden text-[13px] font-medium text-ink md:block">{user.displayName}</span>
              <ChevronDown className="h-3.5 w-3.5 text-ink-3" />
            </button>
          }
          items={[
            { label: `@${user.username} · ${user.role}`, disabled: true, onSelect: () => {} },
            {
              label: 'Settings',
              icon: <Settings2 />,
              onSelect: () => navigate('/settings'),
            },
            {
              label: 'Sign out',
              icon: <LogOut />,
              danger: true,
              onSelect: () => {
                logout();
                navigate('/login');
              },
            },
          ]}
        />
      </div>
    </header>
  );
}
