import { useState } from 'react';
import { Keyboard, Monitor, Moon, Shield, Sun, Terminal } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { api } from '../lib/api';
import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { CopyButton } from '../components/ui/CopyButton';
import { Kbd } from '../components/ui/Kbd';
import { PageHeader, PageTransition, SectionCard } from '../components/ui';

const SHORTCUTS: { keys: string[]; label: string }[] = [
  { keys: ['⌘', 'K'], label: 'Command palette / global search' },
  { keys: ['⌘', 'B'], label: 'Collapse or expand sidebar' },
  { keys: ['?'], label: 'Keyboard shortcut reference' },
  { keys: ['Esc'], label: 'Close modal, drawer or palette' },
];

const HEALTH_CURL = `curl -s http://localhost:4000/api/health`;

export function SettingsPage() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const toast = useToast();
  const [health, setHealth] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  async function checkApi() {
    setChecking(true);
    try {
      const res = await api<{ status: string; time: string }>('/health');
      setHealth(`${res.status} · ${res.time}`);
      toast.success('API is healthy');
    } catch {
      setHealth('unreachable');
      toast.error('API unreachable', 'Is the backend running on port 4000?');
    } finally {
      setChecking(false);
    }
  }

  return (
    <PageTransition>
      <PageHeader
        eyebrow="System"
        title="Settings"
        description="Workspace preferences, session details and developer endpoints for this demo instance."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Profile" description="Current session identity">
          {user && (
            <div className="flex items-center gap-4">
              <Avatar name={user.displayName} />
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium text-ink">{user.displayName}</p>
                <p className="truncate font-mono text-[12px] text-ink-3">@{user.username}</p>
              </div>
              <Badge tone="accent" className="ml-auto capitalize">
                {user.role}
              </Badge>
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-md border border-line bg-surface2/60 p-3 text-[12.5px]">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">Permissions</p>
              <p className="mt-1 text-ink-2">
                {user?.role === 'admin'
                  ? 'Read, write, delete, approve'
                  : user?.role === 'contributor'
                    ? 'Read, create, update'
                    : 'Read only'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">Auth</p>
              <p className="mt-1 text-ink-2">Bearer JWT · localStorage</p>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Appearance" description="Theme applies instantly and persists">
          <div className="grid grid-cols-2 gap-3">
            {(['dark', 'light'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setTheme(option)}
                className={`flex flex-col items-center gap-2 rounded-lg border p-4 transition-all ${
                  theme === option
                    ? 'border-accent/60 bg-accent/[0.07] text-ink'
                    : 'border-line bg-surface2/50 text-ink-3 hover:border-line-strong'
                }`}
              >
                {option === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                <span className="text-[13px] font-medium capitalize">{option}</span>
                <span className="text-[11px]">{option === 'dark' ? 'Command-center default' : 'Daylight ops'}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center gap-2 text-[12.5px] text-ink-3">
            <Monitor className="h-3.5 w-3.5" />
            Stored as <code className="rounded bg-surface2 px-1.5 py-0.5 font-mono text-[11px]">localStorage["pkc.theme"]</code>
            — applied before first paint.
          </div>
        </SectionCard>

        <SectionCard
          title="API endpoint"
          description="The web client proxies /api to the Express server"
          actions={
            <Button variant="secondary" size="sm" loading={checking} onClick={checkApi}>
              Ping health
            </Button>
          }
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-md border border-line bg-surface2/60 px-3 py-2.5">
              <Terminal className="h-4 w-4 shrink-0 text-ink-3" />
              <code className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-ink-2">{HEALTH_CURL}</code>
              <CopyButton value={HEALTH_CURL} />
            </div>
            {health && (
              <p className="font-mono text-[12.5px]">
                <span className={health.startsWith('ok') ? 'text-success' : 'text-danger'}>→ {health}</span>
              </p>
            )}
            <ul className="space-y-1.5 text-[12.5px] text-ink-3">
              <li>· Vite dev server proxies to <span className="font-mono text-ink-2">http://localhost:4000</span></li>
              <li>· Override with <span className="font-mono text-ink-2">VITE_API_PROXY</span></li>
              <li>· Base path: <span className="font-mono text-ink-2">/api</span></li>
            </ul>
          </div>
        </SectionCard>

        <SectionCard title="Keyboard shortcuts" description="Built for fast, mouse-optional navigation">
          <ul className="divide-y divide-line/70">
            {SHORTCUTS.map((shortcut) => (
              <li key={shortcut.label} className="flex items-center justify-between py-2.5 text-[13px]">
                <span className="text-ink-2">{shortcut.label}</span>
                <span className="flex items-center gap-1">
                  {shortcut.keys.map((key) => (
                    <Kbd key={key}>{key}</Kbd>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Data safety" description="This demo ships with synthetic content only" className="lg:col-span-2">
          <div className="flex items-start gap-3 text-[13px] leading-6 text-ink-2">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <p>
              All indicators use reserved documentation ranges (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24),
              example.com / example.org domains and fabricated hashes. Content is for UI demonstration —
              never blocklist these values in production. Export formats: CSV, JSON and STIX 2.1.
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge tone="neutral">RFC 5737</Badge>
            <Badge tone="neutral">RFC 2606</Badge>
            <Badge tone="neutral">No real IOCs</Badge>
            <Badge tone="neutral">No secrets</Badge>
          </div>
        </SectionCard>

        <SectionCard title="About" description="Stack and build info" className="lg:col-span-2">
          <div className="grid gap-4 text-[12.5px] sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">Frontend</p>
              <p className="mt-1 text-ink-2">React 19 · Vite · Tailwind · Framer Motion · Recharts</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">Backend</p>
              <p className="mt-1 text-ink-2">Express · TypeScript · better-sqlite3 · Zod · JWT</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">Roles</p>
              <p className="mt-1 text-ink-2">admin · contributor · viewer</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-3">Docs</p>
              <p className="mt-1 text-ink-2">README · docs/ · API reference in repo</p>
            </div>
          </div>
        </SectionCard>
      </div>

      <p className="flex items-center justify-center gap-2 pt-2 text-[11px] text-ink-3">
        <Keyboard className="h-3 w-3" />
        Press <Kbd>⌘</Kbd> <Kbd>K</Kbd> anywhere to search the workspace
      </p>
    </PageTransition>
  );
}
