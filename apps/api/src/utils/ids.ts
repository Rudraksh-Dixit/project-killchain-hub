import { randomUUID } from 'node:crypto';

export function uid(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}
