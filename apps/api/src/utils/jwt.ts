import jwt from 'jsonwebtoken';
import { config } from '../config';
import { unauthorized } from './errors';

export type Role = 'admin' | 'contributor' | 'viewer';

export interface JwtUser {
  id: string;
  username: string;
  role: Role;
  displayName: string;
}

interface TokenPayload {
  sub: string;
  username: string;
  role: Role;
  displayName: string;
}

export function signToken(user: JwtUser): string {
  const payload: TokenPayload = {
    sub: user.id,
    username: user.username,
    role: user.role,
    displayName: user.displayName,
  };
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn as jwt.SignOptions['expiresIn'],
    issuer: 'pkc-hub',
  });
}

export function verifyToken(token: string): JwtUser {
  try {
    const decoded = jwt.verify(token, config.jwtSecret, { issuer: 'pkc-hub' }) as TokenPayload;
    if (!decoded.sub || !decoded.role) throw new Error('malformed payload');
    return {
      id: decoded.sub,
      username: decoded.username,
      role: decoded.role,
      displayName: decoded.displayName,
    };
  } catch {
    throw unauthorized('Invalid or expired token');
  }
}

export const ROLE_RANK: Record<Role, number> = { viewer: 0, contributor: 1, admin: 2 };
