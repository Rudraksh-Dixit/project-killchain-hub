import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from './app';
import { config } from './config';
import { ensureUser } from './routes/auth';
import { closeDb, getDb } from './db';

let server: Server;
let base = '';
let adminToken = '';
let viewerToken = '';

const dbFile = path.resolve(process.cwd(), 'test-data/pkc-test.db');

async function api(
  pathname: string,
  options: RequestInit & { token?: string } = {},
): Promise<Response> {
  const { token, headers, ...rest } = options;
  return fetch(`${base}${pathname}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
}

async function login(username: string, password: string): Promise<string> {
  const res = await api('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  expect(res.status).toBe(200);
  const body = (await res.json()) as { token: string };
  return body.token;
}

beforeAll(async () => {
  fs.rmSync(dbFile, { force: true });
  fs.rmSync(`${dbFile}-wal`, { force: true });
  fs.rmSync(`${dbFile}-shm`, { force: true });

  const db = getDb();
  ensureUser('admin', 'admin123', 'Test Admin', 'admin');
  ensureUser('viewer', 'viewer123', 'Test Viewer', 'viewer');

  // Fixtures from the repository seed data so knowledge modules are populated
  const readData = <T>(name: string): T =>
    JSON.parse(fs.readFileSync(path.join(config.dataDir, name), 'utf8')) as T;
  const now = new Date().toISOString();

  type HuntSeed = {
    title: string; description: string; query: string; language: string; difficulty: string;
    tactics: string[]; techniques: string[]; tags: string[]; author: string;
  };
  const hunt = readData<HuntSeed[]>('hunts.json')[0];
  db.prepare(
    `INSERT INTO hunts (id, title, description, query, language, difficulty, tactics, techniques, tags, author, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    'hnt_fixture', hunt.title, hunt.description, hunt.query, hunt.language, hunt.difficulty,
    JSON.stringify(hunt.tactics), JSON.stringify(hunt.techniques), JSON.stringify(hunt.tags),
    hunt.author, now, now,
  );

  type ArticleSeed = {
    title: string; slug: string; excerpt: string; content: string; category: string;
    tags: string[]; author: string; readTime: number; publishedAt: string;
  };
  const article = readData<ArticleSeed[]>('articles.json')[0];
  db.prepare(
    `INSERT INTO articles (id, title, slug, excerpt, content, category, tags, author, read_time, published_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    'art_fixture', article.title, article.slug, article.excerpt, article.content, article.category,
    JSON.stringify(article.tags), article.author, article.readTime, article.publishedAt, now,
  );

  type ToolSeed = {
    name: string; description: string; category: string; language: string;
    scriptPath: string; usage: string; tags: string[]; stars: number;
  };
  const tool = readData<ToolSeed[]>('tools.json')[0];
  db.prepare(
    `INSERT INTO tools (id, name, description, category, language, script_path, usage, tags, stars, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    'tool_fixture', tool.name, tool.description, tool.category, tool.language,
    tool.scriptPath, tool.usage, JSON.stringify(tool.tags), tool.stars, now,
  );

  type ResourceSeed = { name: string; description: string; category: string; url: string; tags: string[] };
  const resourceStmt = db.prepare(
    'INSERT INTO resources (id, name, description, category, url, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  );
  readData<ResourceSeed[]>('resources.json')
    .slice(0, 12)
    .forEach((resource, index) => {
      resourceStmt.run(
        `res_fixture_${index}`,
        resource.name,
        resource.description,
        resource.category,
        resource.url,
        JSON.stringify(resource.tags),
        now,
      );
    });

  const app = createApp();
  await new Promise<void>((resolve) => {
    server = app.listen(0, resolve);
  });
  const address = server.address() as AddressInfo;
  base = `http://127.0.0.1:${address.port}`;

  adminToken = await login('admin', 'admin123');
  viewerToken = await login('viewer', 'viewer123');
});

afterAll(async () => {
  await new Promise<void>((resolve) => {
    server?.close(() => resolve());
  });
  closeDb();
  fs.rmSync(dbFile, { force: true });
  fs.rmSync(`${dbFile}-wal`, { force: true });
  fs.rmSync(`${dbFile}-shm`, { force: true });
});

describe('health & auth', () => {
  it('serves an unauthenticated health check', async () => {
    const res = await api('/api/health');
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status: string };
    expect(body.status).toBe('ok');
  });

  it('rejects protected routes without a token', async () => {
    const res = await api('/api/iocs');
    expect(res.status).toBe(401);
  });

  it('rejects bad credentials', async () => {
    const res = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', password: 'wrong' }),
    });
    expect(res.status).toBe(401);
  });

  it('returns the current user for a valid token', async () => {
    const res = await api('/api/auth/me', { token: adminToken });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user: { username: string; role: string } };
    expect(body.user.username).toBe('admin');
    expect(body.user.role).toBe('admin');
  });
});

describe('ioc lifecycle', () => {
  let iocId = '';

  it('creates an indicator', async () => {
    const res = await api('/api/iocs', {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({
        type: 'ip',
        value: '192.0.2.55',
        malwareFamily: 'Amadey',
        category: 'loader',
        severity: 'medium',
        confidence: 'high',
        firstSeen: '2026-01-01T00:00:00.000Z',
        lastSeen: '2026-02-01T00:00:00.000Z',
        tags: ['lab'],
        source: 'test',
        description: 'integration fixture',
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; value: string };
    expect(body.value).toBe('192.0.2.55');
    iocId = body.id;
  });

  it('detects duplicates with 409', async () => {
    const res = await api('/api/iocs', {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({
        type: 'ip',
        value: '192.0.2.55',
        category: 'loader',
        severity: 'medium',
        confidence: 'high',
        firstSeen: '2026-01-01T00:00:00.000Z',
        lastSeen: '2026-02-01T00:00:00.000Z',
      }),
    });
    expect(res.status).toBe(409);
  });

  it('rejects invalid values', async () => {
    const res = await api('/api/iocs', {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({
        type: 'ip',
        value: 'not-an-ip',
        category: 'network',
        severity: 'low',
        confidence: 'low',
        firstSeen: '2026-01-01T00:00:00.000Z',
        lastSeen: '2026-02-01T00:00:00.000Z',
      }),
    });
    expect(res.status).toBe(400);
  });

  it('lists and filters indicators', async () => {
    const res = await api('/api/iocs?q=Amadey&pageSize=10', { token: adminToken });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: unknown[]; total: number; facets: unknown };
    expect(body.total).toBeGreaterThanOrEqual(1);
    expect(body.items.length).toBeGreaterThanOrEqual(1);
    expect(body.facets).toBeTruthy();
  });

  it('forbids writes for viewers', async () => {
    const res = await api('/api/iocs', {
      method: 'POST',
      token: viewerToken,
      body: JSON.stringify({
        type: 'domain',
        value: 'blocked.example.com',
        category: 'phishing',
        severity: 'low',
        confidence: 'low',
        firstSeen: '2026-01-01T00:00:00.000Z',
        lastSeen: '2026-02-01T00:00:00.000Z',
      }),
    });
    expect(res.status).toBe(403);
  });

  it('imports CSV rows and reports duplicates', async () => {
    const csv = [
      'type,value,malware_family,category,severity,confidence,first_seen,last_seen,tags,source',
      'domain,phish.example.org,EvilProxy,phishing,high,high,2026-03-01,2026-03-05,phishing,test',
      'ip,192.0.2.55,Amadey,loader,medium,medium,2026-01-01,2026-02-01,dup,test',
      'ip,999.999.999.999,Bad,loader,low,low,2026-01-01,2026-02-01,bad,test',
    ].join('\n');
    const res = await api('/api/iocs/import', {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({ format: 'csv', data: csv }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      imported: number;
      skipped: unknown[];
      invalid: unknown[];
    };
    expect(body.imported).toBe(1);
    expect(body.skipped).toHaveLength(1);
    expect(body.invalid).toHaveLength(1);
  });

  it('exports CSV and STIX bundles', async () => {
    const csvRes = await api('/api/iocs/export?format=csv', { token: adminToken });
    expect(csvRes.status).toBe(200);
    const csv = await csvRes.text();
    expect(csv).toContain('192.0.2.55');

    const stixRes = await api('/api/iocs/export?format=stix', { token: adminToken });
    expect(stixRes.status).toBe(200);
    const bundle = (await stixRes.json()) as {
      type: string;
      objects: { type: string; pattern: string }[];
    };
    expect(bundle.type).toBe('bundle');
    expect(bundle.objects.length).toBeGreaterThanOrEqual(2);
    expect(bundle.objects[0].pattern).toMatch(/^\[/);
  });

  it('updates an indicator', async () => {
    const res = await api(`/api/iocs/${iocId}`, {
      method: 'PUT',
      token: adminToken,
      body: JSON.stringify({ severity: 'high', tags: ['lab', 'updated'] }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { severity: string; tags: string[] };
    expect(body.severity).toBe('high');
    expect(body.tags).toContain('updated');
  });

  it('404s for unknown indicators', async () => {
    const res = await api('/api/iocs/ioc_missing', { token: adminToken });
    expect(res.status).toBe(404);
  });
});

describe('knowledge modules', () => {
  it('lists hunts with facets', async () => {
    const res = await api('/api/hunts?language=kql', { token: adminToken });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: unknown[]; facets: { languages: unknown[] } };
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.facets.languages.length).toBeGreaterThanOrEqual(1);
  });

  it('creates and reads a hunt', async () => {
    const create = await api('/api/hunts', {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({
        title: 'Test Hunt',
        description: 'fixture',
        query: 'DeviceProcessEvents | take 10',
        language: 'kql',
        tactics: ['Execution'],
        techniques: ['T1059'],
        tags: ['test'],
      }),
    });
    expect(create.status).toBe(201);
    const hunt = (await create.json()) as { id: string };
    const read = await api(`/api/hunts/${hunt.id}`, { token: adminToken });
    expect(read.status).toBe(200);
  });

  it('returns an article by slug', async () => {
    const res = await api('/api/articles/anatomy-fake-browser-update-chain', { token: adminToken });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { article: { title: string; content: string } };
    expect(body.article.title).toContain('Fake Browser Update');
    expect(body.article.content.length).toBeGreaterThan(200);
  });

  it('groups resources by category', async () => {
    const res = await api('/api/resources', { token: adminToken });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: unknown[]; total: number };
    expect(body.total).toBeGreaterThan(10);
  });

  it('filters tools by category', async () => {
    const res = await api('/api/tools?category=hashing', { token: adminToken });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: { category: string }[] };
    expect(body.items.every((item) => item.category === 'hashing')).toBe(true);
  });
});

describe('reports, community, dashboard, search', () => {
  it('creates a report and renders markdown', async () => {
    const create = await api('/api/reports', {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({
        title: 'API Report',
        client: 'Internal',
        findings: [
          {
            title: 'Weak CSP',
            severity: 'medium',
            cvss: 4.7,
            description: 'CSP allows unsafe-inline.',
          },
        ],
      }),
    });
    expect(create.status).toBe(201);
    const report = (await create.json()) as { id: string; stats: { total: number } };
    expect(report.stats.total).toBe(1);

    const md = await api(`/api/reports/${report.id}/markdown`, { token: adminToken });
    expect(md.status).toBe(200);
    const body = (await md.json()) as { markdown: string };
    expect(body.markdown).toContain('# API Report');
    expect(body.markdown).toContain('Weak CSP');
  });

  it('queues a submission and lets admins approve it', async () => {
    const create = await api('/api/submissions', {
      method: 'POST',
      token: viewerToken,
      body: JSON.stringify({
        kind: 'ioc',
        title: 'New lab indicator',
        body: 'from a lab exercise',
        payload: {
          type: 'domain',
          value: 'lab-submit.example.org',
          malwareFamily: 'TestFamily',
          category: 'network',
          severity: 'low',
          confidence: 'low',
          firstSeen: '2026-05-01T00:00:00.000Z',
          lastSeen: '2026-05-02T00:00:00.000Z',
          tags: ['lab'],
        },
      }),
    });
    expect(create.status).toBe(201);
    const submission = (await create.json()) as { id: string; status: string };
    expect(submission.status).toBe('pending');

    const approve = await api(`/api/submissions/${submission.id}/approve`, {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({ note: 'looks good' }),
    });
    expect(approve.status).toBe(200);

    const check = await api('/api/iocs?q=lab-submit.example.org', { token: adminToken });
    const body = (await check.json()) as { total: number };
    expect(body.total).toBe(1);
  });

  it('serves dashboard stats', async () => {
    const res = await api('/api/dashboard/stats', { token: adminToken });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      totals: { iocs: number; hunts: number };
      iocsOverTime: unknown[];
      recentActivity: unknown[];
    };
    expect(body.totals.iocs).toBeGreaterThanOrEqual(1);
    expect(body.iocsOverTime).toHaveLength(8);
    expect(body.recentActivity.length).toBeGreaterThan(0);
  });

  it('searches across modules', async () => {
    const res = await api('/api/search?q=Amadey', { token: adminToken });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { total: number; results: Record<string, unknown[]> };
    expect(body.total).toBeGreaterThanOrEqual(1);
    expect(Object.keys(body.results)).toContain('iocs');
  });

  it('returns an activity feed', async () => {
    const res = await api('/api/activity?limit=5', { token: adminToken });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: unknown[] };
    expect(body.items.length).toBeGreaterThan(0);
  });

  it('404s unknown routes', async () => {
    const res = await api('/api/nope', { token: adminToken });
    expect(res.status).toBe(404);
  });
});
