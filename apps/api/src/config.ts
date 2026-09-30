import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';

function findRepoRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 12; i++) {
    const pkgPath = path.join(dir, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { workspaces?: unknown };
        if (pkg.workspaces) return dir;
      } catch {
        /* keep walking */
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

function env(name: string, fallback: string): string {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

const repoRoot = findRepoRoot(process.cwd());
const rawDbPath = env('DB_PATH', path.join(repoRoot, 'data', 'killchain.db'));

export const config = {
  nodeEnv: env('NODE_ENV', 'development'),
  isProd: env('NODE_ENV', 'development') === 'production',
  port: Number(env('PORT', '4000')),
  jwtSecret: env('JWT_SECRET', 'pkc-dev-secret-change-me-in-production'),
  jwtExpiresIn: env('JWT_EXPIRES_IN', '7d'),
  corsOrigins: env('CORS_ORIGIN', 'http://localhost:5173,http://localhost:4173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  repoRoot,
  dataDir: path.join(repoRoot, 'data'),
  dbPath: path.isAbsolute(rawDbPath) ? rawDbPath : path.resolve(process.cwd(), rawDbPath),
  defaultPageSize: 25,
} as const;
