import type { User } from './types';

const TOKEN_KEY = 'pkc.token';
const USER_KEY = 'pkc.user';

export interface ApiErrorPayload {
  message: string;
  code: string;
  details?: unknown;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, payload: ApiErrorPayload) {
    super(payload.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = payload.code;
    this.details = payload.details;
  }
}

export const authStore = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  getUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  },
  setAuth(token: string, user: User): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  setUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

const BASE = import.meta.env.VITE_API_BASE ?? '/api';

function buildUrl(path: string): string {
  return path.startsWith('http') ? path : `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

async function parseError(response: Response): Promise<ApiError> {
  let payload: ApiErrorPayload = {
    message: `Request failed (${response.status})`,
    code: 'unknown',
  };
  try {
    const body = (await response.json()) as { error?: ApiErrorPayload };
    if (body?.error?.message) payload = body.error;
  } catch {
    /* keep default payload */
  }
  return new ApiError(response.status, payload);
}

function handleUnauthorized(): void {
  authStore.clear();
  window.dispatchEvent(new CustomEvent('pkc:unauthorized'));
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

export async function apiRaw<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = authStore.getToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...options.headers,
  };

  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(buildUrl(path), {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });

  if (response.status === 401 && authStore.getToken()) {
    handleUnauthorized();
  }

  if (!response.ok) throw await parseError(response);

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) return (await response.json()) as T;
  return (await response.text()) as unknown as T;
}

export function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return apiRaw<T>(path, options);
}

/** Downloads a protected endpoint and triggers a browser save dialog. */
export async function apiDownload(path: string, filename: string): Promise<void> {
  const token = authStore.getToken();
  const response = await fetch(buildUrl(path), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw await parseError(response);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
