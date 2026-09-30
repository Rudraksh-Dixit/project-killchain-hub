import { Router } from 'express';
import { getDb } from '../db';
import { currentUser, requireRole } from '../middleware/auth';
import { articleBodySchema, articleListQuerySchema, articleUpdateSchema } from '../schemas';
import { conflict, notFound } from '../utils/errors';
import { logActivity } from '../utils/activity';
import { uid } from '../utils/ids';
import { parseJsonObject } from '../utils/serialize';

export const articlesRouter = Router();

const canWrite = requireRole('admin', 'contributor');
const isAdmin = requireRole('admin');

interface ArticleRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string;
  author: string;
  read_time: number;
  published_at: string;
  created_at: string;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 140);
}

function estimateReadTime(content: string): number {
  const words = content.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function estimateExcerpt(content: string): string {
  const plain = content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`[\]()!-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > 240 ? `${plain.slice(0, 237)}...` : plain;
}

function serializeArticle(row: ArticleRow, includeContent = false) {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    category: row.category,
    tags: parseJsonObject<string[]>(row.tags, []),
    author: row.author,
    readTime: row.read_time,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    ...(includeContent ? { content: row.content } : {}),
  };
}

articlesRouter.get('/', (req, res) => {
  const q = articleListQuerySchema.parse(req.query);
  const db = getDb();
  const clauses: string[] = ['1=1'];
  const params: unknown[] = [];

  if (q.q) {
    clauses.push('(title LIKE ? OR excerpt LIKE ? OR content LIKE ? OR tags LIKE ?)');
    const like = `%${q.q}%`;
    params.push(like, like, like, like);
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
  const total = (
    db.prepare(`SELECT COUNT(*) AS count FROM articles WHERE ${where}`).get(...params) as {
      count: number;
    }
  ).count;

  const rows = db
    .prepare(
      `SELECT id, title, slug, excerpt, category, tags, author, read_time, published_at, created_at
       FROM articles WHERE ${where} ORDER BY published_at DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, q.pageSize, (q.page - 1) * q.pageSize) as ArticleRow[];

  const categories = db
    .prepare('SELECT category AS value, COUNT(*) AS count FROM articles GROUP BY category ORDER BY count DESC')
    .all() as { value: string; count: number }[];
  const tags = db
    .prepare(
      'SELECT je.value AS value, COUNT(*) AS count FROM articles, json_each(articles.tags) je GROUP BY je.value ORDER BY count DESC LIMIT 30',
    )
    .all() as { value: string; count: number }[];

  res.json({
    items: rows.map((row) => serializeArticle(row)),
    total,
    page: q.page,
    pageSize: q.pageSize,
    totalPages: Math.max(1, Math.ceil(total / q.pageSize)),
    facets: {
      categories: categories.map((c) => ({ category: c.value, count: c.count })),
      tags: tags.map((t) => ({ tag: t.value, count: t.count })),
    },
  });
});

articlesRouter.get('/:idOrSlug', (req, res) => {
  const db = getDb();
  const key = req.params.idOrSlug;
  const row = db
    .prepare('SELECT * FROM articles WHERE id = ? OR slug = ?')
    .get(key, key) as ArticleRow | undefined;
  if (!row) throw notFound('Article not found');

  const related = db
    .prepare(
      `SELECT id, title, slug, excerpt, category, tags, author, read_time, published_at, created_at
       FROM articles WHERE category = ? AND id != ? ORDER BY published_at DESC LIMIT 4`,
    )
    .all(row.category, row.id) as ArticleRow[];

  res.json({
    article: serializeArticle(row, true),
    related: related.map((item) => serializeArticle(item)),
  });
});

articlesRouter.post('/', canWrite, (req, res) => {
  const body = articleBodySchema.parse(req.body);
  const db = getDb();
  const user = currentUser(req);

  const slug = body.slug ?? slugify(body.title);
  const clash = db.prepare('SELECT id FROM articles WHERE slug = ?').get(slug) as
    | { id: string }
    | undefined;
  if (clash) throw conflict('An article with this slug already exists', { existing: clash });

  const id = uid('art');
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO articles (id, title, slug, excerpt, content, category, tags, author, read_time, published_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    body.title,
    slug,
    body.excerpt || estimateExcerpt(body.content),
    body.content,
    body.category,
    JSON.stringify(body.tags),
    body.author,
    body.readTime ?? estimateReadTime(body.content),
    body.publishedAt ?? now,
    now,
  );

  logActivity(db, user.username, 'article.create', 'article', id, { title: body.title });
  const row = db.prepare('SELECT * FROM articles WHERE id = ?').get(id) as ArticleRow;
  res.status(201).json(serializeArticle(row, true));
});

articlesRouter.put('/:id', canWrite, (req, res) => {
  const body = articleUpdateSchema.parse(req.body);
  const db = getDb();
  const user = currentUser(req);
  const row = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id) as
    | ArticleRow
    | undefined;
  if (!row) throw notFound('Article not found');

  const slug = body.slug ? slugify(body.slug) : row.slug;
  if (slug !== row.slug) {
    const clash = db.prepare('SELECT id FROM articles WHERE slug = ? AND id != ?').get(slug, row.id) as
      | { id: string }
      | undefined;
    if (clash) throw conflict('An article with this slug already exists', { existing: clash });
  }

  const content = body.content ?? row.content;
  db.prepare(
    `UPDATE articles SET title = ?, slug = ?, excerpt = ?, content = ?, category = ?, tags = ?,
                         author = ?, read_time = ?, published_at = ?
     WHERE id = ?`,
  ).run(
    body.title ?? row.title,
    slug,
    body.excerpt ?? row.excerpt,
    content,
    body.category ?? row.category,
    body.tags ? JSON.stringify(body.tags) : row.tags,
    body.author ?? row.author,
    body.readTime ?? row.read_time,
    body.publishedAt ?? row.published_at,
    row.id,
  );

  logActivity(db, user.username, 'article.update', 'article', row.id, { title: body.title ?? row.title });
  const updated = db.prepare('SELECT * FROM articles WHERE id = ?').get(row.id) as ArticleRow;
  res.json(serializeArticle(updated, true));
});

articlesRouter.delete('/:id', isAdmin, (req, res) => {
  const db = getDb();
  const user = currentUser(req);
  const row = db.prepare('SELECT * FROM articles WHERE id = ?').get(req.params.id) as
    | ArticleRow
    | undefined;
  if (!row) throw notFound('Article not found');
  db.prepare('DELETE FROM articles WHERE id = ?').run(row.id);
  logActivity(db, user.username, 'article.delete', 'article', row.id, { title: row.title });
  res.json({ deleted: true, id: row.id });
});
