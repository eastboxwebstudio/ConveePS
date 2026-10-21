import crypto from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { all, first, run } from './db.js';

export interface AuthUser {
  id: string;
  username: string;
  full_name: string;
  role: 'admin' | 'staff_nurse';
  status: 'active' | 'inactive';
  must_change_passcode: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      sessionToken?: string;
    }
  }
}

// PBKDF2 hashing
export function hashPasscode(passcode: string, salt: string): string {
  return crypto.pbkdf2Sync(passcode, salt, 10000, 32, 'sha256').toString('hex');
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// In-memory rate limiting for login attempts
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

export function checkRateLimit(ipOrUsername: string): { allowed: boolean; remainingSec: number } {
  const now = Date.now();
  const record = loginAttempts.get(ipOrUsername);
  if (!record) return { allowed: true, remainingSec: 0 };

  if (record.lockedUntil > now) {
    const remainingSec = Math.ceil((record.lockedUntil - now) / 1000);
    return { allowed: false, remainingSec };
  }

  return { allowed: true, remainingSec: 0 };
}

export function recordFailedLogin(ipOrUsername: string) {
  const now = Date.now();
  const record = loginAttempts.get(ipOrUsername) || { count: 0, lockedUntil: 0 };
  record.count += 1;
  if (record.count >= 5) {
    // Lock out for 5 minutes after 5 failed attempts
    record.lockedUntil = now + 5 * 60 * 1000;
  }
  loginAttempts.set(ipOrUsername, record);
}

export function clearFailedLogin(ipOrUsername: string) {
  loginAttempts.delete(ipOrUsername);
}

// Authentication middleware
export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const cookieHeader = req.headers.cookie || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const parts = c.trim().split('=');
      return [parts[0], decodeURIComponent(parts.slice(1).join('='))];
    })
  );

  const authHeader = req.headers.authorization;
  const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const token = bearerToken || cookies['convee_session'];

  if (!token) {
    return next();
  }

  try {
    const session = await first<{ user_id: string; expires_at: string }>(
      "SELECT user_id, expires_at FROM sessions WHERE token = ? AND datetime(expires_at) > datetime('now')",
      [token]
    );

    if (!session) {
      return next();
    }

    const user = await first<AuthUser>(
      'SELECT id, username, full_name, role, status, must_change_passcode FROM users WHERE id = ?',
      [session.user_id]
    );

    if (user && user.status === 'active') {
      req.user = user;
      req.sessionToken = token;
    }
  } catch (err) {
    console.error('Error validating session token:', err);
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Sesi tidak sah atau telah tamat. Sila log masuk semula.' });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Akses ditolak. Tindakan ini memerlukan kebenaran Pentadbir (Admin).' });
  }
  next();
}

// Helper to log audit actions
export async function logAudit(
  actor: AuthUser | { id: string; full_name: string; role: string },
  action: string,
  targetEntity: string,
  targetId: string | null,
  details: string,
  ipAddress?: string
) {
  try {
    const id = 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    await run(
      `INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, target_entity, target_id, details, ip_address, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [id, actor.id, actor.full_name, actor.role, action, targetEntity, targetId || null, details, ipAddress || '']
    );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
