import { Router } from 'express';
import { getDb } from '../db';
import { globalSearchQuerySchema } from '../schemas';
import { parseJsonObject } from '../utils/serialize';

export const searchRouter = Router();

interface Match {
  id: string;
  title: string;
  subtitle: string;
}

searchRouter.get('/', (req, res) => {
  const { q, limit } = globalSearchQuerySchema.parse(req.query);
  const db = getDb();
  const like = `%${q}%`;

  const iocs = (
    db
      .prepare(
        `SELECT id, value, malware_family, type, severity FROM iocs
         WHERE value LIKE ? OR malware_family LIKE ? OR tags LIKE ?
         ORDER BY last_seen DESC LIMIT ?`,
      )
      .all(like, like, like, limit) as {
      id: string;
      value: string;
      malware_family: string;
      type: string;
      severity: string;
    }[]
  ).map((row) => ({
    id: row.id,
    title: row.value,
    subtitle: `${row.type} · ${row.malware_family} · ${row.severity}`,
  }));

  const hunts = (
    db
      .prepare(
        'SELECT id, title, language, difficulty FROM hunts WHERE title LIKE ? OR tags LIKE ? OR query LIKE ? ORDER BY created_at DESC LIMIT ?',
      )
      .all(like, like, like, limit) as {
      id: string;
      title: string;
      language: string;
      difficulty: string;
    }[]
  ).map((row) => ({ id: row.id, title: row.title, subtitle: `${row.language} · ${row.difficulty}` }));

  const articles = (
    db
      .prepare(
        'SELECT id, title, slug, category FROM articles WHERE title LIKE ? OR excerpt LIKE ? OR tags LIKE ? ORDER BY published_at DESC LIMIT ?',
      )
      .all(like, like, like, limit) as {
      id: string;
      title: string;
      slug: string;
      category: string;
    }[]
  ).map((row) => ({ id: row.id, title: row.title, subtitle: `${row.category} · ${row.slug}` }));

  const tools = (
    db
      .prepare(
        'SELECT id, name, category FROM tools WHERE name LIKE ? OR description LIKE ? OR tags LIKE ? ORDER BY name ASC LIMIT ?',
      )
      .all(like, like, like, limit) as { id: string; name: string; category: string }[]
  ).map((row) => ({ id: row.id, title: row.name, subtitle: row.category }));

  const resources = (
    db
      .prepare(
        'SELECT id, name, category FROM resources WHERE name LIKE ? OR description LIKE ? ORDER BY name ASC LIMIT ?',
      )
      .all(like, like, limit) as { id: string; name: string; category: string }[]
  ).map((row) => ({ id: row.id, title: row.name, subtitle: row.category }));

  const reports = (
    db
      .prepare(
        'SELECT id, title, client, status FROM reports WHERE title LIKE ? OR client LIKE ? ORDER BY updated_at DESC LIMIT ?',
      )
      .all(like, like, limit) as { id: string; title: string; client: string; status: string }[]
  ).map((row) => ({ id: row.id, title: row.title, subtitle: `${row.client || 'internal'} · ${row.status}` }));

  const submissions = (
    db
      .prepare(
        'SELECT id, title, kind, status FROM submissions WHERE title LIKE ? ORDER BY created_at DESC LIMIT ?',
      )
      .all(like, limit) as { id: string; title: string; kind: string; status: string }[]
  ).map((row) => ({ id: row.id, title: row.title, subtitle: `${row.kind} · ${row.status}` }));

  const results: Record<string, Match[]> = {
    iocs,
    hunts,
    articles,
    tools,
    resources,
    reports,
    submissions,
  };

  const total = Object.values(results).reduce((sum, group) => sum + group.length, 0);
  res.json({ query: q, total, results });
});

/** Full-text-ish detail payload used by the command palette preview. */
searchRouter.get('/tags', (_req, res) => {
  const rows = getDb()
    .prepare(
      'SELECT je.value AS tag, COUNT(*) AS count FROM iocs, json_each(iocs.tags) je GROUP BY je.value ORDER BY count DESC LIMIT 40',
    )
    .all() as { tag: string; count: number }[];
  res.json({
    tags: rows.map((row) => ({
      tag: row.tag,
      count: row.count,
      detail: parseJsonObject<Record<string, unknown>>('{}', {}),
    })),
  });
});
