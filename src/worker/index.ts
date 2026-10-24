import crypto from 'node:crypto';

export interface Env {
  DB: any;
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  ENVIRONMENT: string;
  FACILITY_NAME: string;
  TIMEZONE: string;
}

// PBKDF2 Hashing
function hashPasscode(passcode: string, salt: string): string {
  return crypto.pbkdf2Sync(passcode, salt, 10000, 32, 'sha256').toString('hex');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // ==========================================
    // 1. API: AUTH LOGIN
    // ==========================================
    if (url.pathname === '/api/auth/login' && request.method === 'POST') {
      try {
        const body: any = await request.json().catch(() => ({}));
        const { username, passcode } = body;

        if (!username || !passcode) {
          return new Response(JSON.stringify({ error: 'Sila masukkan nama pengguna dan kata laluan.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Query user from D1 database
        const user = await env.DB.prepare(
          'SELECT * FROM users WHERE LOWER(username) = LOWER(?)'
        ).bind(username.trim()).first();

        if (!user) {
          return new Response(JSON.stringify({ error: 'Nama pengguna atau kata laluan tidak sah.' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        if (user.status !== 'active') {
          return new Response(JSON.stringify({ error: 'Akaun ini telah dinonaktifkan oleh Pentadbir.' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const calculatedHash = hashPasscode(passcode, user.passcode_salt);
        if (calculatedHash !== user.passcode_hash) {
          return new Response(JSON.stringify({ error: 'Nama pengguna atau kata laluan tidak sah.' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Generate session
        const token = crypto.randomBytes(32).toString('hex');
        const sessionId = 'ses_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        await env.DB.prepare(
          'INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)'
        ).bind(sessionId, user.id, token, expiresAt).run();

        await env.DB.prepare(
          "UPDATE users SET last_login_at = datetime('now') WHERE id = ?"
        ).bind(user.id).run();

        const headers = new Headers({
          'Content-Type': 'application/json',
          'Set-Cookie': `convee_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`,
        });

        return new Response(JSON.stringify({
          success: true,
          token,
          user: {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            role: user.role,
            must_change_passcode: user.must_change_passcode,
          },
        }), { status: 200, headers });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: 'Ralat pelayan: ' + err.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // ==========================================
    // 2. API: AUTH CHECK (GET /api/auth/me)
    // ==========================================
    if (url.pathname === '/api/auth/me') {
      try {
        const cookieHeader = request.headers.get('cookie') || '';
        const tokenMatch = cookieHeader.match(/convee_session=([^;]+)/);
        const authHeader = request.headers.get('authorization') || '';
        const token = authHeader.replace(/^Bearer\s+/, '') || (tokenMatch ? tokenMatch[1] : null);

        if (!token) {
          return new Response(JSON.stringify({ user: null }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const session = await env.DB.prepare(
          "SELECT user_id FROM sessions WHERE token = ? AND datetime(expires_at) > datetime('now')"
        ).bind(token).first();

        if (!session) {
          return new Response(JSON.stringify({ user: null }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const user = await env.DB.prepare(
          'SELECT id, username, full_name, role, status, must_change_passcode FROM users WHERE id = ?'
        ).bind(session.user_id).first();

        return new Response(JSON.stringify({ user }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch {
        return new Response(JSON.stringify({ user: null }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // ==========================================
    // 3. API: LOGOUT
    // ==========================================
    if (url.pathname === '/api/auth/logout') {
      const headers = new Headers({
        'Content-Type': 'application/json',
        'Set-Cookie': 'convee_session=; Path=/; Max-Age=0',
      });
      return new Response(JSON.stringify({ success: true }), { status: 200, headers });
    }

    // Serve Static SPA Assets (Frontend UI)
    return env.ASSETS.fetch(request);
  },
};
