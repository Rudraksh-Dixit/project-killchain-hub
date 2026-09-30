import { Router } from 'express';
import { getDb } from '../db';
import { currentUser, requireAuth } from '../middleware/auth';
import { loginSchema } from '../schemas';
import { unauthorized } from '../utils/errors';
import { logActivity } from '../utils/activity';
import { uid } from '../utils/ids';
import { hashPassword, verifyPassword } from '../utils/password';
import { signToken, type JwtUser, type Role } from '../utils/jwt';

export const authRouter = Router();

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  display_name: string;
  role: Role;
  created_at: string;
}

export const PUBLIC_ACCOUNTS = [
  { username: 'admin', password: 'admin123', displayName: 'Avery Chen', role: 'admin' as Role },
  {
    username: 'contributor',
    password: 'contrib123',
    displayName: 'Jordan Blake',
    role: 'contributor' as Role,
  },
  { username: 'viewer', password: 'viewer123', displayName: 'Sam Okafor', role: 'viewer' as Role },
];

authRouter.post('/login', (req, res) => {
  const { username, password } = loginSchema.parse(req.body);
  const db = getDb();
  const row = db
    .prepare('SELECT id, username, password_hash, display_name, role, created_at FROM users WHERE username = ?')
    .get(username) as UserRow | undefined;

  if (!row || !verifyPassword(password, row.password_hash)) {
    throw unauthorized('Invalid username or password');
  }

  const user: JwtUser = {
    id: row.id,
    username: row.username,
    role: row.role,
    displayName: row.display_name,
  };

  logActivity(db, user.username, 'auth.login', 'user', user.id, { role: user.role });
  res.json({ token: signToken(user), user });
});

authRouter.get('/me', requireAuth, (req, res) => {
  res.json({ user: currentUser(req) });
});

authRouter.get('/accounts', (_req, res) => {
  res.json({
    accounts: PUBLIC_ACCOUNTS.map(({ username, displayName, role }) => ({
      username,
      displayName,
      role,
    })),
  });
});

/** Used by the seed script to keep password hashing in one place. */
export function ensureUser(
  username: string,
  password: string,
  displayName: string,
  role: Role,
): void {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username) as
    | { id: string }
    | undefined;
  if (existing) {
    db.prepare('UPDATE users SET password_hash = ?, display_name = ?, role = ? WHERE id = ?').run(
      hashPassword(password),
      displayName,
      role,
      existing.id,
    );
    return;
  }
  db.prepare(
    `INSERT INTO users (id, username, password_hash, display_name, role, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(uid('usr'), username, hashPassword(password), displayName, role, new Date().toISOString());
}
