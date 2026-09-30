import { Router } from 'express';
import { getDb } from '../db';
import { currentUser, requireRole } from '../middleware/auth';
import {
  articleBodySchema,
  huntBodySchema,
  iocBodySchema,
  resourceBodySchema,
  reviewSchema,
  submissionBodySchema,
  submissionListQuerySchema,
  toolBodySchema,
} from '../schemas';
import { badRequest, conflict, notFound } from '../utils/errors';
import { logActivity } from '../utils/activity';
import { uid } from '../utils/ids';
import { isValidIocValue } from '../utils/ioc';
import { normalizeIocValue, parseJsonObject, toIsoDate } from '../utils/serialize';

export const submissionsRouter = Router();

const isAdmin = requireRole('admin');

interface SubmissionRow {
  id: string;
  kind: string;
  title: string;
  body: string;
  payload: string;
  submitter: string;
  status: string;
  reviewer: string | null;
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

function serializeSubmission(row: SubmissionRow) {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    payload: parseJsonObject<Record<string, unknown>>(row.payload, {}),
    submitter: row.submitter,
    status: row.status,
    reviewer: row.reviewer,
    reviewNote: row.review_note,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140);
}

/** Materialises an approved submission into its target table. */
function approveInto(kind: string, payload: Record<string, unknown>): void {
  const db = getDb();
  const now = new Date().toISOString();

  if (kind === 'ioc') {
    const body = iocBodySchema.parse(payload);
    const value = normalizeIocValue(body.type, body.value);
    if (!isValidIocValue(body.type, value)) {
      throw badRequest(`Payload contains an invalid ${body.type} value`);
    }
    const dup = db
      .prepare('SELECT id FROM iocs WHERE type = ? AND value = ?')
      .get(body.type, value) as { id: string } | undefined;
    if (dup) throw conflict('Indicator already exists', { existing: dup });
    db.prepare(
      `INSERT INTO iocs (id, type, value, malware_family, category, severity, confidence,
                         first_seen, last_seen, tags, source, description, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'community', ?, ?)`,
    ).run(
      uid('ioc'),
      body.type,
      value,
      body.malwareFamily,
      body.category,
      body.severity,
      body.confidence,
      toIsoDate(body.firstSeen),
      toIsoDate(body.lastSeen),
      JSON.stringify(body.tags),
      body.source,
      body.description,
      now,
      now,
    );
    return;
  }

  if (kind === 'hunt') {
    const body = huntBodySchema.parse(payload);
    const id = uid('hnt');
    db.prepare(
      `INSERT INTO hunts (id, title, description, query, language, difficulty, tactics, techniques, tags, author, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      body.title,
      body.description,
      body.query,
      body.language,
      body.difficulty,
      JSON.stringify(body.tactics),
      JSON.stringify(body.techniques),
      JSON.stringify(body.tags),
      body.author,
      now,
      now,
    );
    return;
  }

  if (kind === 'article') {
    const body = articleBodySchema.parse(payload);
    let slug = body.slug ?? slugify(body.title);
    const clash = db.prepare('SELECT id FROM articles WHERE slug = ?').get(slug) as
      | { id: string }
      | undefined;
    if (clash) slug = `${slug}-${uid('x').slice(-4)}`;
    db.prepare(
      `INSERT INTO articles (id, title, slug, excerpt, content, category, tags, author, read_time, published_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      uid('art'),
      body.title,
      slug,
      body.excerpt,
      body.content,
      body.category,
      JSON.stringify(body.tags),
      body.author,
      body.readTime ?? Math.max(1, Math.round(body.content.split(/\s+/).length / 200)),
      body.publishedAt ?? now,
      now,
    );
    return;
  }

  if (kind === 'tool') {
    const body = toolBodySchema.parse(payload);
    db.prepare(
      `INSERT INTO tools (id, name, description, category, language, script_path, usage, tags, stars, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      uid('tool'),
      body.name,
      body.description,
      body.category,
      body.language,
      body.scriptPath,
      body.usage,
      JSON.stringify(body.tags),
      body.stars,
      now,
    );
    return;
  }

  if (kind === 'resource') {
    const body = resourceBodySchema.parse(payload);
    db.prepare(
      'INSERT INTO resources (id, name, description, category, url, tags, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(uid('res'), body.name, body.description, body.category, body.url, JSON.stringify(body.tags), now);
    return;
  }

  throw badRequest(`Unknown submission kind "${kind}"`);
}

submissionsRouter.get('/', (req, res) => {
  const q = submissionListQuerySchema.parse(req.query);
  const db = getDb();
  const user = currentUser(req);

  const clauses: string[] = ['1=1'];
  const params: unknown[] = [];

  if (!['admin'].includes(user.role)) {
    clauses.push('(submitter = ? OR status = ?)');
    params.push(user.username, 'approved');
  }
  if (q.status) {
    clauses.push('status = ?');
    params.push(q.status);
  }
  if (q.kind) {
    clauses.push('kind = ?');
    params.push(q.kind);
  }
  if (q.mine) {
    clauses.push('submitter = ?');
    params.push(user.username);
  }

  const where = clauses.join(' AND ');
  const total = (
    db.prepare(`SELECT COUNT(*) AS count FROM submissions WHERE ${where}`).get(...params) as {
      count: number;
    }
  ).count;
  const rows = db
    .prepare(`SELECT * FROM submissions WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, q.pageSize, (q.page - 1) * q.pageSize) as SubmissionRow[];

  const statusCounts = db
    .prepare('SELECT status, COUNT(*) AS count FROM submissions GROUP BY status')
    .all() as { status: string; count: number }[];

  res.json({
    items: rows.map(serializeSubmission),
    total,
    page: q.page,
    pageSize: q.pageSize,
    totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
    facets: {
      statuses: statusCounts.map((row) => ({ status: row.status, count: row.count })),
    },
  });
});

submissionsRouter.get('/:id', (req, res) => {
  const row = getDb().prepare('SELECT * FROM submissions WHERE id = ?').get(req.params.id) as
    | SubmissionRow
    | undefined;
  if (!row) throw notFound('Submission not found');
  res.json({ submission: serializeSubmission(row) });
});

submissionsRouter.post('/', (req, res) => {
  const body = submissionBodySchema.parse(req.body);
  const db = getDb();
  const user = currentUser(req);
  const id = uid('sub');

  db.prepare(
    `INSERT INTO submissions (id, kind, title, body, payload, submitter, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
  ).run(id, body.kind, body.title, body.body, JSON.stringify(body.payload), user.username, new Date().toISOString());

  logActivity(db, user.username, 'submission.create', 'submission', id, {
    kind: body.kind,
    title: body.title,
  });

  const row = db.prepare('SELECT * FROM submissions WHERE id = ?').get(id) as SubmissionRow;
  res.status(201).json(serializeSubmission(row));
});

submissionsRouter.post('/:id/approve', isAdmin, (req, res) => {
  const db = getDb();
  const user = currentUser(req);
  const row = db.prepare('SELECT * FROM submissions WHERE id = ?').get(req.params.id) as
    | SubmissionRow
    | undefined;
  if (!row) throw notFound('Submission not found');
  if (row.status !== 'pending') throw conflict('Submission has already been reviewed');

  const payload = parseJsonObject<Record<string, unknown>>(row.payload, {});
  approveInto(row.kind, payload);

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE submissions SET status = 'approved', reviewer = ?, review_note = ?, reviewed_at = ? WHERE id = ?`,
  ).run(user.username, reviewSchema.parse(req.body).note ?? 'Approved by admin', now, row.id);

  logActivity(db, user.username, 'submission.approve', 'submission', row.id, {
    kind: row.kind,
    title: row.title,
  });

  const updated = db.prepare('SELECT * FROM submissions WHERE id = ?').get(row.id) as SubmissionRow;
  res.json({ submission: serializeSubmission(updated) });
});

submissionsRouter.post('/:id/reject', isAdmin, (req, res) => {
  const db = getDb();
  const user = currentUser(req);
  const row = db.prepare('SELECT * FROM submissions WHERE id = ?').get(req.params.id) as
    | SubmissionRow
    | undefined;
  if (!row) throw notFound('Submission not found');
  if (row.status !== 'pending') throw conflict('Submission has already been reviewed');

  const note = reviewSchema.parse(req.body).note ?? 'Rejected by admin';
  db.prepare(
    `UPDATE submissions SET status = 'rejected', reviewer = ?, review_note = ?, reviewed_at = ? WHERE id = ?`,
  ).run(user.username, note, new Date().toISOString(), row.id);

  logActivity(db, user.username, 'submission.reject', 'submission', row.id, {
    kind: row.kind,
    title: row.title,
  });

  const updated = db.prepare('SELECT * FROM submissions WHERE id = ?').get(row.id) as SubmissionRow;
  res.json({ submission: serializeSubmission(updated) });
});
