import { Router } from 'express';
import { getDb } from '../db';
import { currentUser, requireRole } from '../middleware/auth';
import { huntBodySchema, huntListQuerySchema, huntUpdateSchema } from '../schemas';
import { notFound } from '../utils/errors';
import { logActivity } from '../utils/activity';
import { uid } from '../utils/ids';
import { parseJsonObject } from '../utils/serialize';

export const huntsRouter = Router();

const canWrite = requireRole('admin', 'contributor');
const isAdmin = requireRole('admin');

interface HuntRow {
  id: string;
  title: string;
  description: string;
  query: string;
  language: string;
  difficulty: string;
  tactics: string;
  techniques: string;
  tags: string;
  author: string;
  created_at: string;
  updated_at: string;
}

function serializeHunt(row: HuntRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    query: row.query,
    language: row.language,
    difficulty: row.difficulty,
    tactics: parseJsonObject<string[]>(row.tactics, []),
    techniques: parseJsonObject<string[]>(row.techniques, []),
    tags: parseJsonObject<string[]>(row.tags, []),
    author: row.author,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const DIFFICULTY_ORDER = "CASE difficulty WHEN 'beginner' THEN 0 WHEN 'intermediate' THEN 1 ELSE 2 END";

huntsRouter.get('/', (req, res) => {
  const q = huntListQuerySchema.parse(req.query);
  const db = getDb();
  const clauses: string[] = ['1=1'];
  const params: unknown[] = [];

  if (q.q) {
    clauses.push('(title LIKE ? OR description LIKE ? OR query LIKE ? OR tags LIKE ?)');
    const like = `%${q.q}%`;
    params.push(like, like, like, like);
  }
  if (q.language) {
    clauses.push('language = ?');
    params.push(q.language);
  }
  if (q.difficulty) {
    clauses.push('difficulty = ?');
    params.push(q.difficulty);
  }
  if (q.tactic) {
    clauses.push('tactics LIKE ?');
    params.push(`%"${q.tactic}"%`);
  }
  if (q.tag) {
    clauses.push('tags LIKE ?');
    params.push(`%"${q.tag}"%`);
  }

  const where = clauses.join(' AND ');
  const total = (
    db.prepare(`SELECT COUNT(*) AS count FROM hunts WHERE ${where}`).get(...params) as {
      count: number;
    }
  ).count;

  const sortExpr =
    q.sort === 'title' ? 'title' : q.sort === 'difficulty' ? DIFFICULTY_ORDER : `${q.sort}`;
  const dir = q.order === 'asc' ? 'ASC' : 'DESC';
  const rows = db
    .prepare(
      `SELECT * FROM hunts WHERE ${where} ORDER BY ${sortExpr} ${dir} LIMIT ? OFFSET ?`,
    )
    .all(...params, q.pageSize, (q.page - 1) * q.pageSize) as HuntRow[];

  const languages = db
    .prepare('SELECT language AS value, COUNT(*) AS count FROM hunts GROUP BY language ORDER BY count DESC')
    .all() as { value: string; count: number }[];
  const tactics = db
    .prepare(`SELECT je.value AS value, COUNT(*) AS count FROM hunts, json_each(hunts.tactics) je GROUP BY je.value ORDER BY count DESC LIMIT 30`)
    .all() as { value: string; count: number }[];

  res.json({
    items: rows.map(serializeHunt),
    total,
    page: q.page,
    pageSize: q.pageSize,
    totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
    facets: {
      languages: languages.map((l) => ({ language: l.value, count: l.count })),
      tactics: tactics.map((t) => ({ tactic: t.value, count: t.count })),
    },
  });
});

huntsRouter.get('/:id', (req, res) => {
  const row = getDb().prepare('SELECT * FROM hunts WHERE id = ?').get(req.params.id) as
    | HuntRow
    | undefined;
  if (!row) throw notFound('Hunt not found');
  res.json({ hunt: serializeHunt(row) });
});

huntsRouter.post('/', canWrite, (req, res) => {
  const body = huntBodySchema.parse(req.body);
  const db = getDb();
  const user = currentUser(req);
  const id = uid('hnt');
  const now = new Date().toISOString();

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

  logActivity(db, user.username, 'hunt.create', 'hunt', id, { title: body.title });
  const row = db.prepare('SELECT * FROM hunts WHERE id = ?').get(id) as HuntRow;
  res.status(201).json(serializeHunt(row));
});

huntsRouter.put('/:id', canWrite, (req, res) => {
  const body = huntUpdateSchema.parse(req.body);
  const db = getDb();
  const user = currentUser(req);
  const row = db.prepare('SELECT * FROM hunts WHERE id = ?').get(req.params.id) as HuntRow | undefined;
  if (!row) throw notFound('Hunt not found');

  const merged = {
    title: body.title ?? row.title,
    description: body.description ?? row.description,
    query: body.query ?? row.query,
    language: body.language ?? row.language,
    difficulty: body.difficulty ?? row.difficulty,
    tactics: body.tactics ? JSON.stringify(body.tactics) : row.tactics,
    techniques: body.techniques ? JSON.stringify(body.techniques) : row.techniques,
    tags: body.tags ? JSON.stringify(body.tags) : row.tags,
    author: body.author ?? row.author,
  };

  db.prepare(
    `UPDATE hunts SET title = ?, description = ?, query = ?, language = ?, difficulty = ?,
                      tactics = ?, techniques = ?, tags = ?, author = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    merged.title,
    merged.description,
    merged.query,
    merged.language,
    merged.difficulty,
    merged.tactics,
    merged.techniques,
    merged.tags,
    merged.author,
    new Date().toISOString(),
    row.id,
  );

  logActivity(db, user.username, 'hunt.update', 'hunt', row.id, { title: merged.title });
  const updated = db.prepare('SELECT * FROM hunts WHERE id = ?').get(row.id) as HuntRow;
  res.json(serializeHunt(updated));
});

huntsRouter.delete('/:id', isAdmin, (req, res) => {
  const db = getDb();
  const user = currentUser(req);
  const row = db.prepare('SELECT * FROM hunts WHERE id = ?').get(req.params.id) as HuntRow | undefined;
  if (!row) throw notFound('Hunt not found');
  db.prepare('DELETE FROM hunts WHERE id = ?').run(row.id);
  logActivity(db, user.username, 'hunt.delete', 'hunt', row.id, { title: row.title });
  res.json({ deleted: true, id: row.id });
});
