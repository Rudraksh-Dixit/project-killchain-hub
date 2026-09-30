import { Router } from 'express';
import { getDb } from '../db';
import { currentUser, requireRole } from '../middleware/auth';
import {
  bulkIdsSchema,
  iocBodySchema,
  iocImportSchema,
  iocListQuerySchema,
  iocUpdateSchema,
} from '../schemas';
import { badRequest, conflict, notFound } from '../utils/errors';
import { logActivity } from '../utils/activity';
import { csvToObjects, objectsToCsv } from '../utils/csv';
import { uid } from '../utils/ids';
import { coerceIocRecord, isValidIocValue, toStixPattern } from '../utils/ioc';
import { normalizeIocValue, parseJsonObject, toJsonArray, toIsoDate } from '../utils/serialize';

export const iocsRouter = Router();

const canWrite = requireRole('admin', 'contributor');
const isAdmin = requireRole('admin');

export interface IocRow {
  id: string;
  type: string;
  value: string;
  malware_family: string;
  category: string;
  severity: string;
  confidence: string;
  first_seen: string;
  last_seen: string;
  tags: string;
  source: string;
  description: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function serializeIoc(row: IocRow) {
  return {
    id: row.id,
    type: row.type,
    value: row.value,
    malwareFamily: row.malware_family,
    category: row.category,
    severity: row.severity,
    confidence: row.confidence,
    firstSeen: row.first_seen,
    lastSeen: row.last_seen,
    tags: parseJsonObject<string[]>(row.tags, []),
    source: row.source,
    description: row.description,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type SerializedIoc = ReturnType<typeof serializeIoc>;

const SORT_COLUMNS: Record<string, string> = {
  value: 'iocs.value',
  malware_family: 'iocs.malware_family',
  type: 'iocs.type',
  category: 'iocs.category',
  first_seen: 'iocs.first_seen',
  last_seen: 'iocs.last_seen',
  created_at: 'iocs.created_at',
  severity:
    "CASE iocs.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END",
  confidence: "CASE iocs.confidence WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END",
};

interface Filters {
  where: string;
  params: unknown[];
}

type ListQuery = ReturnType<typeof iocListQuerySchema.parse>;

function buildFilters(q: ListQuery): Filters {
  const clauses: string[] = ['1=1'];
  const params: unknown[] = [];

  if (q.q) {
    clauses.push(
      '(iocs.value LIKE ? OR iocs.malware_family LIKE ? OR iocs.source LIKE ? OR iocs.description LIKE ? OR iocs.tags LIKE ?)',
    );
    const like = `%${q.q}%`;
    params.push(like, like, like, like, like);
  }
  if (q.type) {
    clauses.push('iocs.type = ?');
    params.push(q.type);
  }
  if (q.category) {
    clauses.push('iocs.category = ?');
    params.push(q.category);
  }
  if (q.severity) {
    clauses.push('iocs.severity = ?');
    params.push(q.severity);
  }
  if (q.confidence) {
    clauses.push('iocs.confidence = ?');
    params.push(q.confidence);
  }
  if (q.family) {
    clauses.push('iocs.malware_family = ?');
    params.push(q.family);
  }
  if (q.tag) {
    clauses.push('iocs.tags LIKE ?');
    params.push(`%"${q.tag}"%`);
  }
  if (q.source) {
    clauses.push('iocs.source = ?');
    params.push(q.source);
  }

  return { where: clauses.join(' AND '), params };
}

function fetchFacets(where: string, params: unknown[]) {
  const db = getDb();
  const facet = (column: string, label: string, limit = 40) =>
    (
      db
        .prepare(
          `SELECT ${column} AS value, COUNT(*) AS count FROM iocs WHERE ${where}
           GROUP BY ${column} ORDER BY count DESC, 1 ASC LIMIT ${limit}`,
        )
        .all(...params) as { value: string; count: number }[]
    ).map((row) => ({ [label]: row.value, count: row.count }));

  const tags = db
    .prepare(
      `SELECT je.value AS value, COUNT(*) AS count
       FROM iocs, json_each(iocs.tags) je
       WHERE ${where}
       GROUP BY je.value ORDER BY count DESC, 1 ASC LIMIT 40`,
    )
    .all(...params) as { value: string; count: number }[];

  return {
    families: facet('malware_family', 'family'),
    severities: facet('severity', 'severity'),
    categories: facet('category', 'category'),
    types: facet('type', 'type'),
    tags: tags.map((row) => ({ tag: row.value, count: row.count })),
  };
}

function queryIocs(q: ListQuery, paginate: boolean) {
  const db = getDb();
  const { where, params } = buildFilters(q);
  const total = (
    db.prepare(`SELECT COUNT(*) AS count FROM iocs WHERE ${where}`).get(...params) as {
      count: number;
    }
  ).count;

  const sortExpr = SORT_COLUMNS[q.sort] ?? 'iocs.last_seen';
  const dir = q.order === 'asc' ? 'ASC' : 'DESC';
  const limitClause = paginate ? 'LIMIT ? OFFSET ?' : '';
  const limitParams = paginate ? [q.pageSize, (q.page - 1) * q.pageSize] : [];

  const rows = db
    .prepare(
      `SELECT iocs.* FROM iocs WHERE ${where} ORDER BY ${sortExpr} ${dir}, iocs.value ASC ${limitClause}`,
    )
    .all(...params, ...limitParams) as IocRow[];

  return {
    items: rows.map(serializeIoc),
    total,
    page: q.page,
    pageSize: q.pageSize,
    totalPages: paginate ? Math.max(1, Math.ceil(total / q.pageSize)) : 1,
    facets: fetchFacets(where, params),
  };
}

/* ── List ─────────────────────────────────────────────────────── */

iocsRouter.get('/', (req, res) => {
  const query = iocListQuerySchema.parse(req.query);
  res.json(queryIocs(query, true));
});

/* ── Export (must be registered before /:id) ──────────────────── */

iocsRouter.get('/export', (req, res) => {
  const query = { ...iocListQuerySchema.parse(req.query), page: 1, pageSize: 200 };
  const format = String(req.query.format ?? 'json').toLowerCase();
  const { items } = queryIocs(query, false);

  if (format === 'csv') {
    const csv = objectsToCsv(items as unknown as Record<string, unknown>[], [
      'type',
      'value',
      'malwareFamily',
      'category',
      'severity',
      'confidence',
      'firstSeen',
      'lastSeen',
      'tags',
      'source',
      'description',
    ]);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="pkc-iocs.csv"');
    res.send(csv);
    return;
  }

  if (format === 'stix') {
    const bundle = {
      type: 'bundle',
      id: `bundle--${uid('b')}`,
      created: new Date().toISOString(),
      objects: items.map((item) => ({
        type: 'indicator',
        spec_version: '2.1',
        id: `indicator--${item.id.replace(/^ioc_/, '')}`,
        created: item.createdAt,
        modified: item.updatedAt,
        name: `${item.malwareFamily} ${item.type} indicator`,
        description: item.description || `Fictional training indicator (${item.malwareFamily})`,
        pattern: toStixPattern(item.type, item.value),
        pattern_type: 'stix',
        valid_from: item.firstSeen,
        labels: ['malicious-activity', item.category],
        confidence: item.confidence === 'high' ? 85 : item.confidence === 'medium' ? 55 : 25,
        x_pkc_severity: item.severity,
        x_pkc_malware_family: item.malwareFamily,
        x_pkc_tags: item.tags,
        x_pkc_source: item.source,
      })),
    };
    res.setHeader('Content-Disposition', 'attachment; filename="pkc-iocs-stix.json"');
    res.json(bundle);
    return;
  }

  res.setHeader('Content-Disposition', 'attachment; filename="pkc-iocs.json"');
  res.json({ generatedAt: new Date().toISOString(), count: items.length, iocs: items });
});

/* ── Bulk import (before /:id) ────────────────────────────────── */

iocsRouter.post('/import', canWrite, (req, res) => {
  const body = iocImportSchema.parse(req.body);
  const db = getDb();
  const user = currentUser(req);

  let records: Record<string, unknown>[] = [];
  if (body.format === 'csv') {
    records = csvToObjects(body.data);
  } else {
    const parsed = JSON.parse(body.data) as unknown;
    records = Array.isArray(parsed)
      ? (parsed as Record<string, unknown>[])
      : Array.isArray((parsed as { items?: unknown }).items)
        ? ((parsed as { items: Record<string, unknown>[] }).items)
        : [];
  }

  if (records.length === 0) throw badRequest('No records found in payload');
  if (records.length > 5000) throw badRequest('Import limit is 5000 indicators per request');

  const result = {
    imported: 0,
    skipped: [] as { value: string; reason: string }[],
    invalid: [] as { index: number; reason: string }[],
  };

  const existsStmt = db.prepare('SELECT id FROM iocs WHERE type = ? AND value = ?');
  const insertStmt = db.prepare(
    `INSERT INTO iocs (id, type, value, malware_family, category, severity, confidence,
                       first_seen, last_seen, tags, source, description, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const updateStmt = db.prepare(
    `UPDATE iocs SET malware_family = ?, category = ?, severity = ?, confidence = ?,
                     last_seen = ?, tags = ?, source = ?, description = ?, updated_at = ?
     WHERE id = ?`,
  );

  const run = db.transaction(() => {
    records.forEach((raw, index) => {
      const record = coerceIocRecord(raw);
      const type = record.type;
      const value = record.value;

      if (!['ip', 'domain', 'url', 'hash'].includes(type)) {
        result.invalid.push({ index, reason: `Unknown type "${type || 'empty'}"` });
        return;
      }
      if (!value || !isValidIocValue(type, value)) {
        result.invalid.push({ index, reason: `Invalid ${type} value "${value || 'empty'}"` });
        return;
      }

      const category = ['stealer', 'loader', 'phishing', 'network'].includes(record.category || '')
        ? record.category!
        : 'network';
      const severity = ['critical', 'high', 'medium', 'low', 'info'].includes(
        record.severity || '',
      )
        ? record.severity!
        : 'medium';
      const confidence = ['high', 'medium', 'low'].includes(record.confidence || '')
        ? record.confidence!
        : 'medium';

      const existing = existsStmt.get(type, value) as { id: string } | undefined;
      const tags = toJsonArray(record.tags);
      const now = new Date().toISOString();

      if (existing) {
        if (!body.skipDuplicates) {
          updateStmt.run(
            record.malwareFamily || 'Unknown',
            category,
            severity,
            confidence,
            toIsoDate(record.lastSeen || now),
            tags,
            record.source || '',
            record.description || '',
            now,
            existing.id,
          );
          result.imported += 1;
        } else {
          result.skipped.push({ value, reason: 'duplicate' });
        }
        return;
      }

      insertStmt.run(
        uid('ioc'),
        type,
        value,
        record.malwareFamily || 'Unknown',
        category,
        severity,
        confidence,
        toIsoDate(record.firstSeen || now),
        toIsoDate(record.lastSeen || now),
        tags,
        record.source || '',
        record.description || '',
        user.id,
        now,
        now,
      );
      result.imported += 1;
    });
  });

  run();
  logActivity(db, user.username, 'iocs.import', 'ioc', 'bulk', {
    imported: result.imported,
    skipped: result.skipped.length,
    invalid: result.invalid.length,
  });

  res.status(201).json(result);
});

/* ── Bulk delete (before /:id) ────────────────────────────────── */

iocsRouter.post('/bulk/delete', isAdmin, (req, res) => {
  const { ids } = bulkIdsSchema.parse(req.body);
  const db = getDb();
  const user = currentUser(req);
  const stmt = db.prepare('DELETE FROM iocs WHERE id = ?');
  let deleted = 0;
  const run = db.transaction(() => {
    for (const id of ids) {
      deleted += stmt.run(id).changes;
    }
  });
  run();
  logActivity(db, user.username, 'iocs.bulk_delete', 'ioc', 'bulk', { deleted });
  res.json({ deleted });
});

/* ── Create ───────────────────────────────────────────────────── */

iocsRouter.post('/', canWrite, (req, res) => {
  const body = iocBodySchema.parse(req.body);
  const value = normalizeIocValue(body.type, body.value);

  if (!isValidIocValue(body.type, value)) {
    throw badRequest(`"${value}" is not a valid ${body.type} indicator`);
  }

  const db = getDb();
  const user = currentUser(req);

  const existing = db
    .prepare('SELECT id, type, value, malware_family, last_seen FROM iocs WHERE type = ? AND value = ?')
    .get(body.type, value) as
    | { id: string; type: string; value: string; malware_family: string; last_seen: string }
    | undefined;

  if (existing) {
    throw conflict('Indicator already exists in the database', { existing });
  }

  const now = new Date().toISOString();
  const id = uid('ioc');
  db.prepare(
    `INSERT INTO iocs (id, type, value, malware_family, category, severity, confidence,
                       first_seen, last_seen, tags, source, description, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
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
    user.id,
    now,
    now,
  );

  logActivity(db, user.username, 'ioc.create', 'ioc', id, { type: body.type, value });
  const row = db.prepare('SELECT * FROM iocs WHERE id = ?').get(id) as IocRow;
  res.status(201).json(serializeIoc(row));
});

/* ── Read one ─────────────────────────────────────────────────── */

iocsRouter.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM iocs WHERE id = ?').get(req.params.id) as IocRow | undefined;
  if (!row) throw notFound('Indicator not found');
  const related = db
    .prepare(
      'SELECT * FROM iocs WHERE malware_family = ? AND id != ? ORDER BY last_seen DESC LIMIT 8',
    )
    .all(row.malware_family, row.id) as IocRow[];
  res.json({ ioc: serializeIoc(row), related: related.map(serializeIoc) });
});

/* ── Update ───────────────────────────────────────────────────── */

iocsRouter.put('/:id', canWrite, (req, res) => {
  const body = iocUpdateSchema.parse(req.body);
  const db = getDb();
  const user = currentUser(req);
  const row = db.prepare('SELECT * FROM iocs WHERE id = ?').get(req.params.id) as IocRow | undefined;
  if (!row) throw notFound('Indicator not found');

  const type = body.type ?? row.type;
  const value = body.value ? normalizeIocValue(type, body.value) : row.value;
  if (!isValidIocValue(type, value)) {
    throw badRequest(`"${value}" is not a valid ${type} indicator`);
  }

  if ((body.type && body.type !== row.type) || (body.value && value !== row.value)) {
    const clash = db
      .prepare('SELECT id FROM iocs WHERE type = ? AND value = ? AND id != ?')
      .get(type, value, row.id) as { id: string } | undefined;
    if (clash) throw conflict('Another indicator with this value already exists', { existing: clash });
  }

  const merged = {
    type,
    value,
    malwareFamily: body.malwareFamily ?? row.malware_family,
    category: body.category ?? row.category,
    severity: body.severity ?? row.severity,
    confidence: body.confidence ?? row.confidence,
    firstSeen: body.firstSeen ? toIsoDate(body.firstSeen) : row.first_seen,
    lastSeen: body.lastSeen ? toIsoDate(body.lastSeen) : row.last_seen,
    tags: body.tags ? JSON.stringify(body.tags) : row.tags,
    source: body.source ?? row.source,
    description: body.description ?? row.description,
  };

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE iocs SET type = ?, value = ?, malware_family = ?, category = ?, severity = ?,
                     confidence = ?, first_seen = ?, last_seen = ?, tags = ?, source = ?,
                     description = ?, updated_at = ?
     WHERE id = ?`,
  ).run(
    merged.type,
    merged.value,
    merged.malwareFamily,
    merged.category,
    merged.severity,
    merged.confidence,
    merged.firstSeen,
    merged.lastSeen,
    merged.tags,
    merged.source,
    merged.description,
    now,
    row.id,
  );

  logActivity(db, user.username, 'ioc.update', 'ioc', row.id, { value: merged.value });
  const updated = db.prepare('SELECT * FROM iocs WHERE id = ?').get(row.id) as IocRow;
  res.json(serializeIoc(updated));
});

/* ── Delete ───────────────────────────────────────────────────── */

iocsRouter.delete('/:id', isAdmin, (req, res) => {
  const db = getDb();
  const user = currentUser(req);
  const row = db.prepare('SELECT * FROM iocs WHERE id = ?').get(req.params.id) as IocRow | undefined;
  if (!row) throw notFound('Indicator not found');
  db.prepare('DELETE FROM iocs WHERE id = ?').run(row.id);
  logActivity(db, user.username, 'ioc.delete', 'ioc', row.id, { value: row.value });
  res.json({ deleted: true, id: row.id });
});
