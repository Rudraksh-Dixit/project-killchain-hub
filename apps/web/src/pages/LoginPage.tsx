import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Eye, EyeOff, ShieldCheck, Terminal, Users } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Input';
import { Avatar } from '../components/ui/Avatar';
import { Logo } from '../components/layout/Logo';

const DEMOS = [
  {
    label: 'Administrator',
    name: 'Avery Chen',
    username: 'admin',
    password: 'admin123',
    desc: 'Full control — approve, delete, manage',
  },
  {
    label: 'Contributor',
    name: 'Jordan Blake',
    username: 'contributor',
    password: 'contrib123',
    desc: 'Create and update intelligence content',
  },
  {
    label: 'Viewer',
    name: 'Sam Okafor',
    username: 'viewer',
    password: 'viewer123',
    desc: 'Read-only access to all modules',
  },
];

const FEATURES = [
  '130+ tracked IOCs with faceted search and STIX/CSV export',
  'Detection-as-code hunt library — KQL, SPL, Sigma, YARA',
  'Engagement reports with CVSS scoring and Markdown export',
];

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const user = await login(username.trim(), password);
      toast.success(`Welcome back, ${user.displayName}`);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen bg-bg lg:grid-cols-2">
      {/* brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-line bg-surface p-10 lg:flex">
        <div className="pkc-grid-bg absolute inset-0 opacity-70" aria-hidden="true" />

        <div className="relative">
          <Logo />
        </div>

        <motion.div
          className="relative max-w-md space-y-5"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <h1 className="font-display text-[34px] font-semibold leading-[1.15] tracking-tight text-ink">
            Track every artifact.
            <br />
            <span className="text-accent">Hunt every chain.</span>
          </h1>
          <p className="text-[15px] leading-6 text-ink-2">
            An open-source red/blue knowledge hub — IOCs, detection hunts, research and
            client-ready reports in one fast, keyboard-driven workspace.
          </p>
          <ul className="space-y-2.5">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5 text-[13px] leading-5 text-ink-2">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                {feature}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          className="relative overflow-hidden rounded-lg border border-line bg-bg/80 p-4 shadow-card backdrop-blur-sm"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.12, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div className="mb-3 flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
            <span className="ml-2 font-mono text-[10px] text-ink-3">killchain — zsh</span>
          </div>
          <pre className="overflow-x-auto font-mono text-[11.5px] leading-5 text-ink-2">
            <code>
              <span className="text-accent">$</span> killchain iocs list{' '}
              <span className="text-ink-3">--severity critical</span>{'\n'}
              <span className="text-ink-3">→ 132 indicators · 8 families · 4 categories</span>{'\n'}
              <span className="text-accent">$</span> killchain hunts run t1566-phish{' '}
              <span className="text-ink-3">--lang kql</span>
            </code>
          </pre>
        </motion.div>

        <p className="relative text-xs text-ink-3">
          Demo workspace · synthetic data only (RFC 5737 documentation ranges)
        </p>
      </div>

      {/* sign-in panel */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12">
        <motion.div
          className="mx-auto w-full max-w-sm"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div className="lg:hidden">
            <Logo />
          </div>

          <div className="mt-8 lg:mt-0">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">Sign in</h2>
            <p className="mt-1.5 text-[13px] text-ink-2">
              Pick a demo role below — or enter credentials manually.
            </p>
          </div>

          <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
            {error && (
              <div role="alert" className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2.5 text-[13px] text-danger">
                {error}
              </div>
            )}

            <Field label="Username" htmlFor="username">
              <Input
                id="username"
                name="username"
                autoComplete="username"
                autoFocus
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="admin"
              />
            </Field>

            <Field label="Password" htmlFor="password">
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className="pr-10"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm p-1 text-ink-3 transition-colors hover:text-ink"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              loading={submitting}
              iconRight={<ArrowRight />}
            >
              Sign in to workspace
            </Button>
          </form>

          <div className="mt-8 space-y-2">
            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-3">
              <span className="h-px flex-1 bg-line" />
              Demo accounts
              <span className="h-px flex-1 bg-line" />
            </div>

            {DEMOS.map((demo) => (
              <button
                key={demo.username}
                type="button"
                onClick={() => {
                  setUsername(demo.username);
                  setPassword(demo.password);
                  setError(null);
                }}
                className="group flex w-full items-center justify-between gap-3 rounded-md border border-line bg-surface px-3 py-2.5 text-left transition-all duration-150 hover:border-accent/50 hover:bg-surface2"
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  <Avatar name={demo.name} size="sm" />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium text-ink">
                      {demo.label}
                      <span className="ml-2 font-normal text-ink-3">{demo.desc}</span>
                    </span>
                    <span className="block truncate font-mono text-[11px] text-ink-3">
                      {demo.username} / {demo.password}
                    </span>
                  </span>
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-ink-3 transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
              </button>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-center gap-4 text-[11px] text-ink-3">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> JWT sessions
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> 3 roles
            </span>
            <span className="flex items-center gap-1">
              <Terminal className="h-3.5 w-3.5" /> API-first
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
