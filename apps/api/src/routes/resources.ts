import { Router } from 'express';
import { getDb } from '../db';
import { currentUser, requireRole } from '../middleware/auth';
import { resourceBodySchema, resourceListQuerySchema, resourceUpdateSchema } from '../schemas';
import { notFound } from '../utils/errors';
import { logActivity } from '../utils/activity';
import { uid } from '../utils/ids';
import { parseJsonObject } from '../utils/serialize';

export const resourcesRouter = Router();

const canWrite = requireRole('admin', 'contributor');
const isAdmin = requireRole('admin');

interface ResourceRow {
  id: string;
  name: string;
  description: string;
  category: string;
  url: string;
  tags: string;
  created_at: string;
}

function serializeResource(row: ResourceRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    url: row.url,
    tags: parseJsonObject<string[]>(row.tags, []),
    createdAt: row.created_at,
  };
}

resourcesRouter.get('/', (req, res) => {
  const q = resourceListQuerySchema.parse(req.query);
  const db = getDb();
  const clauses: string[] = ['1=1'];
  const params: unknown[] = [];

  if (q.q) {
    clauses.push('(name LIKE ? OR description LIKE ? OR tags LIKE ?)');
    const like = `%${q.q}%`;
    params.push(like, like, like);
  }
  if (q.category) {
    clauses.push('category = ?');
    params.push(q.category);
  }
  if (q.tag) {
    clauses.push('tags LIKE ?');
    params.push(`%"${q.tag}"%`);
  }

  const where = clauses.join(' AND ');
  const rows = db
    .prepare(`SELECT * FROM resources WHERE ${where} ORDER BY category ASC, name ASC`)
    .all(...params) as ResourceRow[];

  const categories = db
    .prepare('SELECT category AS value, COUNT(*) AS count FROM resources GROUP BY category ORDER BY count DESC')
    .all() as { value: string; count: number }[];

  res.json({
    items: rows.map(serializeResource),
    total: rows.length,
    facets: {
      categories: categories.map((c) => ({ category: c.value, count: c.count })),
    },
  });
});

resourcesRouter.get('/:id', (req, res) => {
  const row = getDb().prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id) as
    | ResourceRow
    | undefined;
  if (!row) throw notFound('Resource not found');
  res.json({ resource: serializeResource(row) });
});

resourcesRouter.post('/', canWrite, (req, res) => {
  const body = resourceBodySchema.parse(req.body);
  const db = getDb();
  const user = currentUser(req);
  const id = uid('res');

  db.prepare(
    `INSERT INTO resources (id, name, description, category, url, tags, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    body.name,
    body.description,
    body.category,
    body.url,
    JSON.stringify(body.tags),
    new Date().toISOString(),
  );

  logActivity(db, user.username, 'resource.create', 'resource', id, { name: body.name });
  const row = db.prepare('SELECT * FROM resources WHERE id = ?').get(id) as ResourceRow;
  res.status(201).json(serializeResource(row));
});

resourcesRouter.put('/:id', canWrite, (req, res) => {
  const body = resourceUpdateSchema.parse(req.body);
  const db = getDb();
  const user = currentUser(req);
  const row = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id) as
    | ResourceRow
    | undefined;
  if (!row) throw notFound('Resource not found');

  const merged = {
    name: body.name ?? row.name,
    description: body.description ?? row.description,
    category: body.category ?? row.category,
    url: body.url ?? row.url,
    tags: body.tags ? JSON.stringify(body.tags) : row.tags,
  };

  db.prepare(
    'UPDATE resources SET name = ?, description = ?, category = ?, url = ?, tags = ? WHERE id = ?',
  ).run(merged.name, merged.description, merged.category, merged.url, merged.tags, row.id);

  logActivity(db, user.username, 'resource.update', 'resource', row.id, { name: merged.name });
  const updated = db.prepare('SELECT * FROM resources WHERE id = ?').get(row.id) as ResourceRow;
  res.json(serializeResource(updated));
});

resourcesRouter.delete('/:id', isAdmin, (req, res) => {
  const db = getDb();
  const user = currentUser(req);
  const row = db.prepare('SELECT * FROM resources WHERE id = ?').get(req.params.id) as
    | ResourceRow
    | undefined;
  if (!row) throw notFound('Resource not found');
  db.prepare('DELETE FROM resources WHERE id = ?').run(row.id);
  logActivity(db, user.username, 'resource.delete', 'resource', row.id, { name: row.name });
  res.json({ deleted: true, id: row.id });
});
