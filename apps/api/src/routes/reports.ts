import { Router } from 'express';
import { getDb } from '../db';
import { currentUser, requireRole } from '../middleware/auth';
import { reportBodySchema, reportListQuerySchema, reportUpdateSchema } from '../schemas';
import { notFound } from '../utils/errors';
import { logActivity } from '../utils/activity';
import { uid } from '../utils/ids';
import {
  findingStats,
  parseFindings,
  renderReportMarkdown,
  type ReportRecord,
} from '../utils/report';

export const reportsRouter = Router();

const canWrite = requireRole('admin', 'contributor');
const isAdmin = requireRole('admin');

function serializeReport(row: ReportRecord, includeFindings = true) {
  const findings = parseFindings(row.findings);
  return {
    id: row.id,
    title: row.title,
    client: row.client,
    scope: row.scope,
    executiveSummary: row.executive_summary,
    methodology: row.methodology,
    status: row.status,
    stats: findingStats(findings),
    findings: includeFindings ? findings : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

reportsRouter.get('/', (req, res) => {
  const q = reportListQuerySchema.parse(req.query);
  const db = getDb();
  const clauses: string[] = ['1=1'];
  const params: unknown[] = [];

  if (q.q) {
    clauses.push('(title LIKE ? OR client LIKE ?)');
    const like = `%${q.q}%`;
    params.push(like, like);
  }
  if (q.status) {
    clauses.push('status = ?');
    params.push(q.status);
  }

  const where = clauses.join(' AND ');
  const total = (
    db.prepare(`SELECT COUNT(*) AS count FROM reports WHERE ${where}`).get(...params) as {
      count: number;
    }
  ).count;
  const rows = db
    .prepare(`SELECT * FROM reports WHERE ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`)
    .all(...params, q.pageSize, (q.page - 1) * q.pageSize) as ReportRecord[];

  res.json({
    items: rows.map((row) => serializeReport(row, false)),
    total,
    page: q.page,
    pageSize: q.pageSize,
    totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
  });
});

reportsRouter.get('/:id', (req, res) => {
  const row = getDb().prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id) as
    | ReportRecord
    | undefined;
  if (!row) throw notFound('Report not found');
  res.json({ report: serializeReport(row) });
});

reportsRouter.get('/:id/markdown', (req, res) => {
  const row = getDb().prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id) as
    | ReportRecord
    | undefined;
  if (!row) throw notFound('Report not found');
  const markdown = renderReportMarkdown(row);
  if (req.query.download === '1') {
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${row.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.md"`,
    );
    res.send(markdown);
    return;
  }
  res.json({ markdown });
});

reportsRouter.post('/', canWrite, (req, res) => {
  const body = reportBodySchema.parse(req.body);
  const db = getDb();
  const user = currentUser(req);
  const id = uid('rpt');
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO reports (id, title, client, scope, executive_summary, methodology, findings, status, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    body.title,
    body.client,
    body.scope,
    body.executiveSummary,
    body.methodology,
    JSON.stringify(body.findings),
    body.status,
    user.id,
    now,
    now,
  );

  logActivity(db, user.username, 'report.create', 'report', id, { title: body.title });
  const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(id) as ReportRecord;
  res.status(201).json(serializeReport(row));
});

reportsRouter.put('/:id', canWrite, (req, res) => {
  const body = reportUpdateSchema.parse(req.body);
  const db = getDb();
  const user = currentUser(req);
  const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id) as
    | ReportRecord
    | undefined;
  if (!row) throw notFound('Report not found');

  const merged = {
    title: body.title ?? row.title,
    client: body.client ?? row.client,
    scope: body.scope ?? row.scope,
    executiveSummary: body.executiveSummary ?? row.executive_summary,
    methodology: body.methodology ?? row.methodology,
    findings: body.findings ? JSON.stringify(body.findings) : row.findings,
    status: body.status ?? row.status,
  };

  db.prepare(
    `UPDATE reports SET title = ?, client = ?, scope = ?, executive_summary = ?, methodology = ?,
                        findings = ?, status = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    merged.title,
    merged.client,
    merged.scope,
    merged.executiveSummary,
    merged.methodology,
    merged.findings,
    merged.status,
    new Date().toISOString(),
    row.id,
  );

  logActivity(db, user.username, 'report.update', 'report', row.id, { title: merged.title });
  const updated = db.prepare('SELECT * FROM reports WHERE id = ?').get(row.id) as ReportRecord;
  res.json(serializeReport(updated));
});

reportsRouter.delete('/:id', isAdmin, (req, res) => {
  const db = getDb();
  const user = currentUser(req);
  const row = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.id) as
    | ReportRecord
    | undefined;
  if (!row) throw notFound('Report not found');
  db.prepare('DELETE FROM reports WHERE id = ?').run(row.id);
  logActivity(db, user.username, 'report.delete', 'report', row.id, { title: row.title });
  res.json({ deleted: true, id: row.id });
});
