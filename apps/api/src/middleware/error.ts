import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { ApiError } from '../utils/errors';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { message: 'Route not found', code: 'not_found' } });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ApiError) {
    res.status(err.status).json({
      error: { message: err.message, code: err.code, details: err.details ?? null },
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        message: 'Validation failed',
        code: 'validation_error',
        details: err.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
    return;
  }

  const maybeBodyError = err as { type?: string; status?: number; message?: string };
  if (maybeBodyError?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { message: 'Malformed JSON body', code: 'bad_json' } });
    return;
  }

  console.error('[api] unhandled error:', err);
  res.status(500).json({ error: { message: 'Internal server error', code: 'internal' } });
}
