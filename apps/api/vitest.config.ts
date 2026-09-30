import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      NODE_ENV: 'test',
      DB_PATH: './test-data/pkc-test.db',
      JWT_SECRET: 'pkc-test-secret',
      CORS_ORIGIN: 'http://localhost:5173',
    },
    coverage: {
      provider: 'v8',
      reportsDirectory: '../../coverage/api',
    },
  },
});
