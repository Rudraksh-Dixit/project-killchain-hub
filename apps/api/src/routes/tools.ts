import { Router } from 'express';
import { getDb } from '../db';
import { currentUser, requireRole } from '../middleware/auth';
import { toolBodySchema, toolListQuerySchema, toolUpdateSchema } from '../schemas';
import { notFound } from '../utils/errors';
import { logActivity } from '../utils/activity';
import { uid } from '../utils/ids';
import { parseJsonObject } from '../utils/serialize';

export const toolsRouter = Router();

const canWrite = requireRole('admin', 'contributor');
const isAdmin = requireRole('admin');

interface ToolRow {
  id: string;
  name: string;
  description: string;
  category: string;
  language: string;
  script_path: string;
  usage: string;
  tags: string;
  stars: number;
  created_at: string;
}

function serializeTool(row: ToolRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    language: row.language,
    scriptPath: row.script_path,
    usage: row.usage,
    tags: parseJsonObject<string[]>(row.tags, []),
    stars: row.stars,
    createdAt: row.created_at,
  };
}

toolsRouter.get('/', (req, res) => {
  const q = toolListQuerySchema.parse(req.query);
  const db = getDb();
  const clauses: string[] = ['1=1'];
  const params: unknown[] = [];

  if (q.q) {
    clauses.push('(name LIKE ? OR description LIKE ? OR tags LIKE ? OR language LIKE ?)');
    const like = `%${q.q}%`;
    params.push(like, like, like, like);
  }
  if (q.category) {
    clauses.push('category = ?');
    params.push(q.category);
  }
  if (q.language) {
    clauses.push('language = ?');
    params.push(q.language);
  }

  const where = clauses.join(' AND ');
  const total = (
    db.prepare(`SELECT COUNT(*) AS count FROM tools WHERE ${where}`).get(...params) as {
      count: number;
    }
  ).count;

  const sortColumn =
    q.sort === 'stars' ? 'stars' : q.sort === 'category' ? 'category' : q.sort === 'name' ? 'name' : 'created_at';
  const dir = q.order === 'asc' ? 'ASC' : 'DESC';
  const rows = db
    .prepare(`SELECT * FROM tools WHERE ${where} ORDER BY ${sortColumn} ${dir} LIMIT ? OFFSET ?`)
    .all(...params, q.pageSize, (q.page - 1) * q.pageSize) as ToolRow[];

  const categories = db
    .prepare('SELECT category AS value, COUNT(*) AS count FROM tools GROUP BY category ORDER BY count DESC')
    .all() as { value: string; count: number }[];

  res.json({
    items: rows.map(serializeTool),
    total,
    page: q.page,
    pageSize: q.pageSize,
    totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
    facets: {
      categories: categories.map((c) => ({ category: c.value, count: c.count })),
    },
  });
});

toolsRouter.get('/:id', (req, res) => {
  const row = getDb().prepare('SELECT * FROM tools WHERE id = ?').get(req.params.id) as
    | ToolRow
    | undefined;
  if (!row) throw notFound('Tool not found');
  res.json({ tool: serializeTool(row) });
});

toolsRouter.post('/', canWrite, (req, res) => {
  const body = toolBodySchema.parse(req.body);
  const db = getDb();
  const user = currentUser(req);
  const id = uid('tool');

  db.prepare(
    `INSERT INTO tools (id, name, description, category, language, script_path, usage, tags, stars, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    body.name,
    body.description,
    body.category,
    body.language,
    body.scriptPath,
    body.usage,
    JSON.stringify(body.tags),
    body.stars,
    new Date().toISOString(),
  );

  logActivity(db, user.username, 'tool.create', 'tool', id, { name: body.name });
  const row = db.prepare('SELECT * FROM tools WHERE id = ?').get(id) as ToolRow;
  res.status(201).json(serializeTool(row));
});

toolsRouter.put('/:id', canWrite, (req, res) => {
  const body = toolUpdateSchema.parse(req.body);
  const db = getDb();
  const user = currentUser(req);
  const row = db.prepare('SELECT * FROM tools WHERE id = ?').get(req.params.id) as ToolRow | undefined;
  if (!row) throw notFound('Tool not found');

  const merged = {
    name: body.name ?? row.name,
    description: body.description ?? row.description,
    category: body.category ?? row.category,
    language: body.language ?? row.language,
    scriptPath: body.scriptPath ?? row.script_path,
    usage: body.usage ?? row.usage,
    tags: body.tags ? JSON.stringify(body.tags) : row.tags,
    stars: body.stars ?? row.stars,
  };

  db.prepare(
    `UPDATE tools SET name = ?, description = ?, category = ?, language = ?, script_path = ?,
                      usage = ?, tags = ?, stars = ?
     WHERE id = ?`,
  ).run(
    merged.name,
    merged.description,
    merged.category,
    merged.language,
    merged.scriptPath,
    merged.usage,
    merged.tags,
    merged.stars,
    row.id,
  );

  logActivity(db, user.username, 'tool.update', 'tool', row.id, { name: merged.name });
  const updated = db.prepare('SELECT * FROM tools WHERE id = ?').get(row.id) as ToolRow;
  res.json(serializeTool(updated));
});

toolsRouter.delete('/:id', isAdmin, (req, res) => {
  const db = getDb();
  const user = currentUser(req);
  const row = db.prepare('SELECT * FROM tools WHERE id = ?').get(req.params.id) as ToolRow | undefined;
  if (!row) throw notFound('Tool not found');
  db.prepare('DELETE FROM tools WHERE id = ?').run(row.id);
  logActivity(db, user.username, 'tool.delete', 'tool', row.id, { name: row.name });
  res.json({ deleted: true, id: row.id });
});
