import type { Database } from 'better-sqlite3';
import { uid } from './ids';

export interface ActivityRow {
  id: string;
  actor: string;
  action: string;
  subject_type: string;
  subject_id: string;
  detail: string;
  created_at: string;
}

export function logActivity(
  db: Database,
  actor: string,
  action: string,
  subjectType: string,
  subjectId: string,
  detail: Record<string, unknown> = {},
): void {
  db.prepare(
    `INSERT INTO activity (id, actor, action, subject_type, subject_id, detail, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(uid('act'), actor, action, subjectType, subjectId, JSON.stringify(detail), new Date().toISOString());
}
