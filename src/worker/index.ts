import crypto from 'node:crypto';

export interface Env {
  DB: any;
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  ENVIRONMENT: string;
  FACILITY_NAME: string;
  TIMEZONE: string;
}

function hashPasscode(passcode: string, salt: string): string {
  return crypto.pbkdf2Sync(passcode, salt, 10000, 32, 'sha256').toString('hex');
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // ==========================================
    // 1. AUTH: LOGIN
    // ==========================================
    if (url.pathname === '/api/auth/login' && request.method === 'POST') {
      try {
        const body: any = await request.json().catch(() => ({}));
        const { username, passcode } = body;

        const user = await env.DB.prepare(
          'SELECT * FROM users WHERE LOWER(username) = LOWER(?)'
        ).bind(username?.trim() || '').first();

        if (!user || user.status !== 'active') {
          return new Response(JSON.stringify({ error: 'Nama pengguna atau kata laluan tidak sah.' }), {
            status: 401,
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

        const token = crypto.randomBytes(32).toString('hex');
        const sessionId = 'ses_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        await env.DB.prepare(
          'INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)'
        ).bind(sessionId, user.id, token, expiresAt).run();

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
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // ==========================================
    // 2. AUTH: ME
    // ==========================================
    if (url.pathname === '/api/auth/me') {
      try {
        const cookie = request.headers.get('cookie') || '';
        const token = (cookie.match(/convee_session=([^;]+)/) || [])[1] || request.headers.get('authorization')?.replace(/^Bearer\s+/, '');
        if (!token) return new Response(JSON.stringify({ user: null }), { headers: { 'Content-Type': 'application/json' } });

        const session = await env.DB.prepare(
          "SELECT user_id FROM sessions WHERE token = ? AND datetime(expires_at) > datetime('now')"
        ).bind(token).first();

        if (!session) return new Response(JSON.stringify({ user: null }), { headers: { 'Content-Type': 'application/json' } });

        const user = await env.DB.prepare(
          'SELECT id, username, full_name, role, status, must_change_passcode FROM users WHERE id = ?'
        ).bind(session.user_id).first();

        return new Response(JSON.stringify({ user }), { headers: { 'Content-Type': 'application/json' } });
      } catch {
        return new Response(JSON.stringify({ user: null }), { headers: { 'Content-Type': 'application/json' } });
      }
    }

    // ==========================================
    // 3. API: PATIENTS
    // ==========================================
    if (url.pathname === '/api/patients' && request.method === 'GET') {
      try {
        const zone = url.searchParams.get('zone');
        let query = `
          SELECT p.*, a.id as admission_id, a.admission_date, a.lifecycle_status, a.kanban_stage,
                 CAST(julianday('now') - julianday(a.admission_date) AS INTEGER) as length_of_stay
          FROM patients p
          LEFT JOIN admissions a ON a.patient_id = p.id AND a.lifecycle_status = 'Active'
          WHERE 1=1
        `;
        const params: any[] = [];
        if (zone) {
          query += ' AND p.zone = ?';
          params.push(zone);
        }
        query += ' ORDER BY p.room_bed ASC';

        const { results: patients } = await env.DB.prepare(query).bind(...params).all();
        return new Response(JSON.stringify({ patients: patients || [] }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // ==========================================
    // 4. API: DASHBOARD SUMMARY (Complete payload for React UI)
    // ==========================================
    if (url.pathname === '/api/dashboard/summary' && request.method === 'GET') {
      try {
        const totalPatients = (await env.DB.prepare(
          "SELECT COUNT(*) as count FROM admissions WHERE lifecycle_status = 'Active'"
        ).first())?.count || 0;

        const stableCount = (await env.DB.prepare(
          "SELECT COUNT(*) as count FROM admissions WHERE lifecycle_status = 'Active' AND kanban_stage = 'Stable'"
        ).first())?.count || 0;

        const criticalCount = (await env.DB.prepare(
          "SELECT COUNT(*) as count FROM admissions WHERE lifecycle_status = 'Active' AND kanban_stage = 'High Attention'"
        ).first())?.count || 0;

        const dischargesTotal = (await env.DB.prepare(
          "SELECT COUNT(*) as count FROM admissions WHERE lifecycle_status = 'Discharged'"
        ).first())?.count || 0;

        const newAdmissions7d = (await env.DB.prepare(
          "SELECT COUNT(*) as count FROM admissions WHERE datetime(admission_date) >= datetime('now', '-7 days')"
        ).first())?.count || 0;

        const recentActs = (await env.DB.prepare(`
          SELECT m.*, p.full_name as patient_name, p.mrn, p.zone, p.room_bed
          FROM monitoring_records m
          JOIN patients p ON m.patient_id = p.id
          ORDER BY m.timestamp DESC
          LIMIT 10
        `).all())?.results || [];

        return new Response(JSON.stringify({
          total_active_patients: totalPatients,
          stable_count: stableCount,
          critical_count: criticalCount,
          discharged_count: dischargesTotal,
          discharges_total: dischargesTotal,
          new_admissions_7d: newAdmissions7d,
          updates_today: {
            total: recentActs.length,
            morning: 0,
            evening: 0,
            night: 0
          },
          recent_activities: recentActs,
          facility_name: env.FACILITY_NAME || 'Convee Care Centre',
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // Static Assets fallback
    return env.ASSETS.fetch(request);
  },
};
