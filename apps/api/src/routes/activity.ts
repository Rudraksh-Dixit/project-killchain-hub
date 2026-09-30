import { Router } from 'express';
import { getDb } from '../db';
import { activityQuerySchema } from '../schemas';
import { parseJsonObject } from '../utils/serialize';

export const activityRouter = Router();

activityRouter.get('/', (req, res) => {
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
    total: rows.length,
  });
});
