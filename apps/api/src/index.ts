import { createApp } from './app';
import { config } from './config';
import { getDb } from './db';

getDb();

if (config.jwtSecret === 'pkc-dev-secret-change-me-in-production') {
  console.warn('[api] WARNING: JWT_SECRET is using the insecure development default.');
}

const app = createApp();

const server = app.listen(config.port, () => {
  console.log(`[api] Project KillChain Hub API listening on http://localhost:${config.port}`);
  console.log(`[api] database: ${config.dbPath}`);
});

function shutdown(signal: string): void {
  console.log(`[api] ${signal} received, shutting down.`);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
