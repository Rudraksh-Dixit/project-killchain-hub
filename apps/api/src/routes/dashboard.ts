import { Router } from 'express';
import { getDb } from '../db';
import { activityQuerySchema } from '../schemas';
import { parseJsonObject } from '../utils/serialize';

export const dashboardRouter = Router();

function count(table: string): number {
  const row = getDb().prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number };
  return row.count;
}

function fillMonths(buckets: Map<string, number>, months = 8): { month: string; count: number }[] {
  const result: { month: string; count: number }[] = [];
  const now = new Date();
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    result.push({ month: key, count: buckets.get(key) ?? 0 });
  }
  return result;
}

dashboardRouter.get('/stats', (_req, res) => {
  const db = getDb();

  const familyRows = db
    .prepare(
      'SELECT malware_family AS family, COUNT(*) AS count FROM iocs GROUP BY malware_family ORDER BY count DESC, family ASC LIMIT 8',
    )
    .all() as { family: string; count: number }[];

  const severityRows = db
    .prepare(
      `SELECT severity, COUNT(*) AS count FROM iocs GROUP BY severity
       ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END`,
    )
    .all() as { severity: string; count: number }[];

  const categoryRows = db
    .prepare('SELECT category, COUNT(*) AS count FROM iocs GROUP BY category ORDER BY count DESC')
    .all() as { category: string; count: number }[];

  const typeRows = db
    .prepare('SELECT type, COUNT(*) AS count FROM iocs GROUP BY type ORDER BY count DESC')
    .all() as { type: string; count: number }[];

  const timeRows = db
    .prepare(
      `SELECT substr(first_seen, 1, 7) AS month, COUNT(*) AS count FROM iocs
       WHERE first_seen IS NOT NULL GROUP BY month`,
    )
    .all() as { month: string; count: number }[];

  const tagRows = db
    .prepare(
      'SELECT je.value AS tag, COUNT(*) AS count FROM iocs, json_each(iocs.tags) je GROUP BY je.value ORDER BY count DESC, tag ASC LIMIT 10',
    )
    .all() as { tag: string; count: number }[];

  const confidenceRows = db
    .prepare('SELECT confidence, COUNT(*) AS count FROM iocs GROUP BY confidence')
    .all() as { confidence: string; count: number }[];

  const pendingRow = db
    .prepare("SELECT COUNT(*) AS count FROM submissions WHERE status = 'pending'")
    .get() as { count: number };

  const openFindings = db.prepare('SELECT findings FROM reports').all() as { findings: string }[];
  const findingCounts = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  let openTotal = 0;
  for (const row of openFindings) {
    const findings = parseJsonObject<{ severity?: string; status?: string }[]>(row.findings, []);
    for (const finding of findings) {
      const severity = finding.severity as keyof typeof findingCounts;
      if (severity in findingCounts) findingCounts[severity] += 1;
      if ((finding.status ?? 'open') === 'open') openTotal += 1;
    }
  }

  const monthMap = new Map<string, number>();
  for (const row of timeRows) monthMap.set(row.month, row.count);

  const activityRows = db
    .prepare('SELECT * FROM activity ORDER BY created_at DESC LIMIT 14')
    .all() as {
    id: string;
    actor: string;
    action: string;
    subject_type: string;
    subject_id: string;
    detail: string;
    created_at: string;
  }[];

  res.json({
    totals: {
      iocs: count('iocs'),
      hunts: count('hunts'),
      articles: count('articles'),
      tools: count('tools'),
      resources: count('resources'),
      reports: count('reports'),
      pendingSubmissions: pendingRow.count,
      openFindings: openTotal,
    },
    iocsByFamily: familyRows,
    iocsOverTime: fillMonths(monthMap, 8),
    topTags: tagRows,
    severityBreakdown: severityRows,
    categoryBreakdown: categoryRows,
    typeBreakdown: typeRows,
    confidenceBreakdown: confidenceRows,
    findingBreakdown: findingCounts,
    recentActivity: activityRows.map((row) => ({
      id: row.id,
      actor: row.actor,
      action: row.action,
      subjectType: row.subject_type,
      subjectId: row.subject_id,
      detail: parseJsonObject<Record<string, unknown>>(row.detail, {}),
      createdAt: row.created_at,
    })),
  });
});

dashboardRouter.get('/activity', (req, res) => {
  const { limit } = activityQuerySchema.parse(req.query);
  const rows = getDb()
    .prepare('SELECT * FROM activity ORDER BY created_at DESC LIMIT ?')
    .all(limit) as {
    id: string;
    actor: string;
    action: string;
    subject_type: string;
    subject_id: string;
    detail: string;
    created_at: string;
  }[];

  res.json({
    items: rows.map((row) => ({
      id: row.id,
      actor: row.actor,
      action: row.action,
      subjectType: row.subject_type,
      subjectId: row.subject_id,
      detail: parseJsonObject<Record<string, unknown>>(row.detail, {}),
      createdAt: row.created_at,
    })),
  });
});
