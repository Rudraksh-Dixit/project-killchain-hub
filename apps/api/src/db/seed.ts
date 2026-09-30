import fs from 'node:fs';
import path from 'node:path';
import type { Database } from 'better-sqlite3';
import { config } from '../config';
import { ensureUser } from '../routes/auth';
import { uid } from '../utils/ids';
import { isValidIocValue } from '../utils/ioc';
import { normalizeIocValue, toIsoDate } from '../utils/serialize';
import { closeDb, getDb } from './index';

/* ── helpers ──────────────────────────────────────────────────── */

function readJson<T>(name: string, fallback: T): T {
  const file = path.join(config.dataDir, name);
  if (!fs.existsSync(file)) {
    console.warn(`[seed] ${name} not found — skipping`);
    return fallback;
  }
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
  } catch (error) {
    console.warn(`[seed] failed to parse ${name}:`, error);
    return fallback;
  }
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(0x51ed2026);
const pick = <T>(items: readonly T[]): T => items[Math.floor(rand() * items.length)];
const randInt = (min: number, max: number): number => min + Math.floor(rand() * (max - min + 1));

function randomHex(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) out += '0123456789abcdef'[Math.floor(rand() * 16)];
  return out;
}

/* ── IOC generation (all values are documentation-safe) ───────── */

interface SeedIoc {
  type: string;
  value: string;
  malwareFamily: string;
  category: string;
  severity: string;
  confidence: string;
  firstSeen: string;
  lastSeen: string;
  tags: string[];
  source: string;
  description: string;
}

const FAMILIES = [
  { name: 'Redline', category: 'stealer', severity: 'high' },
  { name: 'Amadey', category: 'loader', severity: 'medium' },
  { name: 'Smoke Loader', category: 'loader', severity: 'high' },
  { name: 'Lumma', category: 'stealer', severity: 'critical' },
  { name: 'Vidar', category: 'stealer', severity: 'high' },
  { name: 'Raccoon', category: 'stealer', severity: 'medium' },
  { name: 'Formbook', category: 'stealer', severity: 'high' },
  { name: 'IcedID', category: 'loader', severity: 'critical' },
  { name: 'Qakbot', category: 'network', severity: 'critical' },
  { name: 'Agent Tesla', category: 'stealer', severity: 'medium' },
  { name: 'Danabot', category: 'stealer', severity: 'medium' },
  { name: 'EvilProxy', category: 'phishing', severity: 'critical' },
  { name: 'Headwind', category: 'phishing', severity: 'high' },
  { name: 'Maldoc Kit47', category: 'phishing', severity: 'high' },
  { name: 'SnabWind', category: 'network', severity: 'medium' },
] as const;

const IP_RANGES = ['192.0.2', '198.51.100', '203.0.113'] as const;

const DOMAIN_PREFIXES = [
  'login-portal', 'secure-update', 'account-check', 'auth-verify', 'cdn-static',
  'mail-relay', 'file-share', 'sync-node', 'billing-notice', 'docs-viewer',
  'portal-sso', 'mobile-api', 'static-assets', 'edge-cache', 'forms-collect',
  'track-click', 'session-restore', 'db-backup', 'vpn-gateway', 'webmail-access',
  'intranet-hr', 'survey-secure', 'invoice-pdf', 'delivery-status', 'renewal-center',
  'identity-help', 'support-desk', 'recovery-choice', 'storage-sync', 'calendar-invite',
  'profile-settings', 'quote-request', 'tracking-update', 'wire-notice', 'payroll-info',
  'vendor-portal', 'crm-export', 'ticket-help', 'status-page', 'build-agent',
  'update-check', 'lab-c2', 'edge-relay', 'telemetry-drop',
] as const;

const DOMAIN_TLDS = ['example.com', 'example.org', 'example.net'] as const;

const URL_PATHS = [
  'login/index.html',
  'verify/account.html',
  'assets/app.js',
  'download/update.bin',
  'account/session.html',
  'invoice/view.pdf',
  'auth/continue',
  'cdn/script.min.js',
] as const;

const IOC_TAGS = [
  'c2', 'loader-stage', 'stealer-log', 'phishing', 'redirector', 'exfil',
  'fake-update', 'seo-poisoning', 'mfa-bypass', 'lab-range', 'command-channel',
  'initial-access', 'second-stage', 'malvertising', 'spam', 'brand-impersonation',
  'geo-targeted', 'cdn-fronting', 'bot-checkin', 'network',
] as const;

const IOC_SOURCES = [
  'PKC Research', 'Community Submission', 'Hunt Alert', 'Sinkhole Telemetry',
  'Mail Gateway', 'EDR Alert', 'Proxy Telemetry', 'Honeypot Netflow',
] as const;

const DESCRIPTIONS: Record<string, string> = {
  stealer: 'Training indicator associated with simulated infostealer collection and exfiltration traffic.',
  loader: 'Fictional documentation-range indicator representing loader staging and callback activity.',
  phishing: 'Fictional phishing infrastructure indicator used for analyst training and detection labs.',
  network: 'Fictional network indicator for command-and-control profiling exercises.',
};

function generateIocs(count: number): SeedIoc[] {
  const used = new Set<string>();
  const items: SeedIoc[] = [];
  let guard = 0;

  const typePool = ['ip', 'ip', 'domain', 'domain', 'domain', 'url', 'url', 'hash', 'hash', 'hash'];

  while (items.length < count && guard < count * 60) {
    guard += 1;
    const type = pick(typePool);
    let value = '';

    if (type === 'ip') {
      value = `${pick(IP_RANGES)}.${randInt(1, 254)}`;
    } else if (type === 'domain') {
      value = `${pick(DOMAIN_PREFIXES)}.${pick(DOMAIN_TLDS)}`;
    } else if (type === 'url') {
      const useIp = rand() < 0.4;
      value = useIp
        ? `http://${pick(IP_RANGES)}.${randInt(1, 254)}/${pick(URL_PATHS)}`
        : `https://${pick(DOMAIN_PREFIXES)}.${pick(DOMAIN_TLDS)}/${pick(URL_PATHS)}`;
    } else {
      const length = pick([32, 32, 40, 64, 64, 64, 128]);
      value = randomHex(length);
    }

    const key = `${type}:${value}`;
    if (used.has(key)) continue;
    if (!isValidIocValue(type, value)) continue;
    used.add(key);

    const family = pick(FAMILIES);
    const age = randInt(0, 300);
    const firstSeen = new Date(Date.now() - age * 86400000);
    const lastSeen = new Date(Date.now() - randInt(0, age) * 86400000);
    const tags = new Set<string>();
    const tagCount = randInt(2, 4);
    while (tags.size < tagCount) tags.add(pick(IOC_TAGS));

    items.push({
      type,
      value: normalizeIocValue(type, value),
      malwareFamily: family.name,
      category: family.category,
      severity: rand() < 0.12 ? 'info' : family.severity,
      confidence: pick(['high', 'high', 'medium', 'medium', 'medium', 'low']),
      firstSeen: firstSeen.toISOString(),
      lastSeen: lastSeen.toISOString(),
      tags: [...tags],
      source: pick(IOC_SOURCES),
      description: DESCRIPTIONS[family.category],
    });
  }

  return items;
}

/* ── inserts ──────────────────────────────────────────────────── */

function insertIoc(db: Database, item: SeedIoc, createdBy: string): boolean {
  const type = item.type;
  const value = normalizeIocValue(type, item.value);
  if (!['ip', 'domain', 'url', 'hash'].includes(type)) return false;
  if (!isValidIocValue(type, value)) {
    console.warn(`[seed] skipped invalid ${type}: ${value}`);
    return false;
  }

  const now = new Date().toISOString();
  db.prepare(
    `INSERT OR IGNORE INTO iocs (id, type, value, malware_family, category, severity, confidence,
                                 first_seen, last_seen, tags, source, description, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    uid('ioc'),
    type,
    value,
    item.malwareFamily || 'Unknown',
    item.category,
    item.severity,
    item.confidence,
    toIsoDate(item.firstSeen),
    toIsoDate(item.lastSeen),
    JSON.stringify(item.tags ?? []),
    item.source ?? '',
    item.description ?? '',
    createdBy,
    now,
    now,
  );
  return true;
}

function pushActivity(
  db: Database,
  actor: string,
  action: string,
  subjectType: string,
  subjectId: string,
  detail: Record<string, unknown>,
  minutesAgo: number,
): void {
  db.prepare(
    `INSERT INTO activity (id, actor, action, subject_type, subject_id, detail, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    uid('act'),
    actor,
    action,
    subjectType,
    subjectId,
    JSON.stringify(detail),
    new Date(Date.now() - minutesAgo * 60000).toISOString(),
  );
}

/* ── main ─────────────────────────────────────────────────────── */

const CONTENT_TABLES = ['iocs', 'hunts', 'articles', 'tools', 'resources', 'reports', 'submissions', 'activity'];

function main(): void {
  const db = getDb();
  console.log(`[seed] database: ${config.dbPath}`);

  const resetting = !process.argv.includes('--no-reset');
  if (resetting) {
    db.exec(CONTENT_TABLES.map((table) => `DELETE FROM ${table};`).join('\n'));
    console.log('[seed] cleared content tables');
  }

  // Users
  ensureUser('admin', 'admin123', 'Avery Chen', 'admin');
  ensureUser('contributor', 'contrib123', 'Jordan Blake', 'contributor');
  ensureUser('viewer', 'viewer123', 'Sam Okafor', 'viewer');
  console.log('[seed] users ready (admin/admin123, contributor/contrib123, viewer/viewer123)');

  // IOCs: hand-picked samples + generated corpus
  const samples = readJson<SeedIoc[]>('iocs.json', []);
  const generated = generateIocs(120);
  const all = [...samples, ...generated];
  let inserted = 0;
  const insertAll = db.transaction((rows: SeedIoc[]) => {
    for (const row of rows) if (insertIoc(db, row, 'seed')) inserted += 1;
  });
  insertAll(all);
  console.log(`[seed] iocs: ${inserted} (target 120+)`);

  // Hunts
  type HuntSeed = {
    title: string; description: string; query: string; language: string; difficulty: string;
    tactics: string[]; techniques: string[]; tags: string[]; author: string;
  };
  const hunts = readJson<HuntSeed[]>('hunts.json', []);
  const insertHunts = db.transaction((rows: HuntSeed[]) => {
    for (const row of rows) {
      const now = new Date().toISOString();
      db.prepare(
        `INSERT INTO hunts (id, title, description, query, language, difficulty, tactics, techniques, tags, author, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        uid('hnt'), row.title, row.description, row.query, row.language, row.difficulty,
        JSON.stringify(row.tactics ?? []), JSON.stringify(row.techniques ?? []),
        JSON.stringify(row.tags ?? []), row.author ?? 'PKC', now, now,
      );
    }
  });
  insertHunts(hunts);
  console.log(`[seed] hunts: ${hunts.length}`);

  // Articles
  type ArticleSeed = {
    title: string; slug: string; excerpt: string; content: string; category: string;
    tags: string[]; author: string; readTime: number; publishedAt: string;
  };
  const articles = readJson<ArticleSeed[]>('articles.json', []);
  const insertArticles = db.transaction((rows: ArticleSeed[]) => {
    for (const row of rows) {
      const now = new Date().toISOString();
      db.prepare(
        `INSERT OR IGNORE INTO articles (id, title, slug, excerpt, content, category, tags, author, read_time, published_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        uid('art'), row.title, row.slug, row.excerpt, row.content, row.category,
        JSON.stringify(row.tags ?? []), row.author ?? 'PKC', row.readTime ?? 5,
        toIsoDate(row.publishedAt), now,
      );
    }
  });
  insertArticles(articles);
  console.log(`[seed] articles: ${articles.length}`);

  // Tools
  type ToolSeed = {
    name: string; description: string; category: string; language: string;
    scriptPath: string; usage: string; tags: string[]; stars: number;
  };
  const tools = readJson<ToolSeed[]>('tools.json', []);
  const insertTools = db.transaction((rows: ToolSeed[]) => {
    for (const row of rows) {
      db.prepare(
        `INSERT INTO tools (id, name, description, category, language, script_path, usage, tags, stars, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        uid('tool'), row.name, row.description, row.category, row.language,
        row.scriptPath ?? '', row.usage ?? '', JSON.stringify(row.tags ?? []),
        row.stars ?? 0, new Date().toISOString(),
      );
    }
  });
  insertTools(tools);
  console.log(`[seed] tools: ${tools.length}`);

  // Resources
  type ResourceSeed = { name: string; description: string; category: string; url: string; tags: string[] };
  const resources = readJson<ResourceSeed[]>('resources.json', []);
  const insertResources = db.transaction((rows: ResourceSeed[]) => {
    for (const row of rows) {
      db.prepare(
        'INSERT INTO resources (id, name, description, category, url, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ).run(uid('res'), row.name, row.description, row.category, row.url, JSON.stringify(row.tags ?? []), new Date().toISOString());
    }
  });
  insertResources(resources);
  console.log(`[seed] resources: ${resources.length}`);

  // Reports
  type FindingSeed = Record<string, unknown>;
  type ReportSeed = {
    title: string; client: string; scope: string; executiveSummary: string;
    methodology: string; status: string; findings: FindingSeed[];
  };
  const reports = readJson<ReportSeed[]>('reports.json', []);
  const insertReports = db.transaction((rows: ReportSeed[]) => {
    for (const row of rows) {
      const now = new Date().toISOString();
      db.prepare(
        `INSERT INTO reports (id, title, client, scope, executive_summary, methodology, findings, status, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        uid('rpt'), row.title, row.client, row.scope, row.executiveSummary, row.methodology,
        JSON.stringify(row.findings ?? []), row.status ?? 'draft', 'seed', now, now,
      );
    }
  });
  insertReports(reports);
  console.log(`[seed] reports: ${reports.length}`);

  // Community submissions (queue examples)
  type SubmissionSeed = {
    kind: string; title: string; body: string; payload: Record<string, unknown>;
    submitter: string; status: string; reviewer?: string; reviewNote?: string;
  };
  const submissions = readJson<SubmissionSeed[]>('submissions.json', []);
  const insertSubmissions = db.transaction((rows: SubmissionSeed[]) => {
    for (const row of rows) {
      const created = new Date(Date.now() - randInt(30, 4000) * 60000).toISOString();
      db.prepare(
        `INSERT INTO submissions (id, kind, title, body, payload, submitter, status, reviewer, review_note, created_at, reviewed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        uid('sub'), row.kind, row.title, row.body, JSON.stringify(row.payload ?? {}),
        row.submitter, row.status, row.reviewer ?? null, row.reviewNote ?? null,
        created, row.reviewer ? created : null,
      );
    }
  });
  insertSubmissions(submissions);
  console.log(`[seed] submissions: ${submissions.length}`);

  // Historical activity so the dashboard feed is alive
  pushActivity(db, 'admin', 'report.update', 'report', 'rpt_sample', { title: reports[0]?.title ?? 'Report' }, 24);
  pushActivity(db, 'contributor', 'ioc.import', 'ioc', 'bulk', { imported: inserted }, 95);
  pushActivity(db, 'admin', 'submission.reject', 'submission', 'sub_sample', { title: 'Sysmon Config Diff' }, 310);
  pushActivity(db, 'contributor', 'article.create', 'article', 'art_sample', { title: articles[0]?.title ?? 'Article' }, 1400);
  pushActivity(db, 'admin', 'hunt.create', 'hunt', 'hnt_sample', { title: hunts[0]?.title ?? 'Hunt' }, 2600);
  pushActivity(db, 'admin', 'seed.run', 'system', 'seed', { iocs: inserted }, 5);

  const summary = {
    iocs: (db.prepare('SELECT COUNT(*) AS c FROM iocs').get() as { c: number }).c,
    hunts: (db.prepare('SELECT COUNT(*) AS c FROM hunts').get() as { c: number }).c,
    articles: (db.prepare('SELECT COUNT(*) AS c FROM articles').get() as { c: number }).c,
    tools: (db.prepare('SELECT COUNT(*) AS c FROM tools').get() as { c: number }).c,
    resources: (db.prepare('SELECT COUNT(*) AS c FROM resources').get() as { c: number }).c,
    reports: (db.prepare('SELECT COUNT(*) AS c FROM reports').get() as { c: number }).c,
    submissions: (db.prepare('SELECT COUNT(*) AS c FROM submissions').get() as { c: number }).c,
    users: (db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number }).c,
  };
  console.log('[seed] done:', JSON.stringify(summary));
}

main();
closeDb();
