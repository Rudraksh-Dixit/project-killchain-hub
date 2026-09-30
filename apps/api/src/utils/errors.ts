export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, message: string, code = 'error', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new ApiError(400, message, 'bad_request', details);

export const unauthorized = (message = 'Authentication required') =>
  new ApiError(401, message, 'unauthorized');

export const forbidden = (message = 'Insufficient permissions') =>
  new ApiError(403, message, 'forbidden');

export const notFound = (message = 'Resource not found') => new ApiError(404, message, 'not_found');

export const conflict = (message: string, details?: unknown) =>
  new ApiError(409, message, 'conflict', details);
