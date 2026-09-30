import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config';
import { requireAuth } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/error';
import { articlesRouter } from './routes/articles';
import { authRouter } from './routes/auth';
import { dashboardRouter } from './routes/dashboard';
import { huntsRouter } from './routes/hunts';
import { iocsRouter } from './routes/iocs';
import { reportsRouter } from './routes/reports';
import { resourcesRouter } from './routes/resources';
import { searchRouter } from './routes/search';
import { submissionsRouter } from './routes/submissions';
import { toolsRouter } from './routes/tools';
import { activityRouter } from './routes/activity';

export function createApp(): express.Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cors({ origin: config.corsOrigins, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
  app.use(express.json({ limit: '12mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'project-killchain-hub-api',
      version: '1.0.0',
      time: new Date().toISOString(),
    });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/iocs', requireAuth, iocsRouter);
  app.use('/api/hunts', requireAuth, huntsRouter);
  app.use('/api/articles', requireAuth, articlesRouter);
  app.use('/api/tools', requireAuth, toolsRouter);
  app.use('/api/resources', requireAuth, resourcesRouter);
  app.use('/api/reports', requireAuth, reportsRouter);
  app.use('/api/submissions', requireAuth, submissionsRouter);
  app.use('/api/dashboard', requireAuth, dashboardRouter);
  app.use('/api/search', requireAuth, searchRouter);
  app.use('/api/activity', requireAuth, activityRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
