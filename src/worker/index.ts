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
    // 3. API: DASHBOARD SUMMARY
    // ==========================================
    if (url.pathname === '/api/dashboard/summary' && request.method === 'GET') {
      try {
        const totalPatients = (await env.DB.prepare(
          "SELECT COUNT(*) as count FROM admissions WHERE lifecycle_status = 'Active'"
        ).first())?.count || 0;

        const maleCount = (await env.DB.prepare(
          "SELECT COUNT(*) as count FROM patients p JOIN admissions a ON a.patient_id = p.id WHERE a.lifecycle_status = 'Active' AND p.zone = 'Zon Lelaki'"
        ).first())?.count || 0;

        const femaleCount = (await env.DB.prepare(
          "SELECT COUNT(*) as count FROM patients p JOIN admissions a ON a.patient_id = p.id WHERE a.lifecycle_status = 'Active' AND p.zone = 'Zon Perempuan'"
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
          male_zone_count: maleCount,
          female_zone_count: femaleCount,
          new_admissions_7d: newAdmissions7d,
          discharges_total: dischargesTotal,
          avg_length_of_stay: 4,
          alerts: {
            red_alert_today: 0,
            refuse_meds_today: 0,
            poor_appetite_today: 0,
          },
          updates_today: {
            am_shift: recentActs.length,
            pm_shift: 0,
            night_shift: 0,
            total: recentActs.length,
          },
          recent_activities: recentActs,
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // ==========================================
    // 4. API: PATIENT DETAILS (GET /api/patients/:id)
    // ==========================================
    const patientDetailMatch = url.pathname.match(/^\/api\/patients\/([^\/]+)$/);
    if (patientDetailMatch && request.method === 'GET') {
      try {
        const patientId = patientDetailMatch[1];

        const patient = await env.DB.prepare(`
          SELECT p.*, a.id as admission_id, a.admission_number, a.admission_date, a.admission_time, 
                 a.lifecycle_status, a.kanban_stage,
                 CAST(julianday('now') - julianday(a.admission_date) AS INTEGER) as length_of_stay
          FROM patients p
          LEFT JOIN admissions a ON a.patient_id = p.id AND a.lifecycle_status = 'Active'
          WHERE p.id = ?
        `).bind(patientId).first();

        if (!patient) {
          return new Response(JSON.stringify({ error: 'Pesakit tidak dijumpai.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }

        const { results: admissions } = await env.DB.prepare(
          'SELECT * FROM admissions WHERE patient_id = ? ORDER BY admission_date DESC'
        ).bind(patientId).all();

        const { results: monitoring } = await env.DB.prepare(
          'SELECT * FROM monitoring_records WHERE patient_id = ? ORDER BY timestamp DESC'
        ).bind(patientId).all();

        const discharge = await env.DB.prepare(
          'SELECT * FROM discharge_records WHERE patient_id = ? ORDER BY discharge_date DESC LIMIT 1'
        ).bind(patientId).first();

        return new Response(JSON.stringify({
          patient,
          admissions: admissions || [],
          monitoring: monitoring || [],
          discharge: discharge || undefined,
        }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // ==========================================
    // 5. API: PATIENTS LIST (GET /api/patients)
    // ==========================================
    if (url.pathname === '/api/patients' && request.method === 'GET') {
      try {
        const zone = url.searchParams.get('zone');
        let query = `
          SELECT p.*, a.id as admission_id, a.admission_number, a.admission_date, a.admission_time, 
                 a.lifecycle_status, a.kanban_stage,
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
    // 6. API: CREATE MONITORING (POST /api/monitoring)
    // ==========================================
    if (url.pathname === '/api/monitoring' && request.method === 'POST') {
      try {
        const body = await request.json();
        const id = 'mon_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        const timestamp = body.timestamp || new Date().toISOString();

        await env.DB.prepare(`
          INSERT INTO monitoring_records (
            id, admission_id, patient_id, staff_user_id, staff_name, timestamp, shift,
            clinical_status, blood_pressure, pulse_rate, temperature, spo2, blood_sugar,
            pain_level, general_condition, consciousness, mobility_status, appetite,
            urine_output, bowel_movement, medication_intake, hygiene_care, feeding_care,
            wound_dressing, repositioning, mobilisation, nursing_report, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).bind(
          id, body.admission_id, body.patient_id, body.staff_user_id || 'system', body.staff_name || 'Jururawat',
          timestamp, body.shift || 'AM (7:00-5:00)', body.clinical_status || 'Stable',
          body.blood_pressure || null, body.pulse_rate || null, body.temperature || null,
          body.spo2 || null, body.blood_sugar || null, body.pain_level || 0,
          body.general_condition || '', body.consciousness || '', body.mobility_status || '',
          body.appetite || 'FAIR', body.urine_output || '', body.bowel_movement || 0,
          body.medication_intake || 'SERVED', body.hygiene_care || '', body.feeding_care || '',
          body.wound_dressing || '', body.repositioning || '', body.mobilisation || '',
          body.nursing_report || ''
        ).run();

        return new Response(JSON.stringify({ success: true, monitoringId: id, clinicalStatus: body.clinical_status || 'Stable' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // ==========================================
    // 7. API: UPDATE KANBAN STAGE
    // ==========================================
    if (url.pathname.startsWith('/api/admissions/') && url.pathname.endsWith('/stage') && request.method === 'PATCH') {
      try {
        const admissionId = url.pathname.split('/')[3];
        const body: any = await request.json();
        const stage = body.kanban_stage || body.stage;
        await env.DB.prepare('UPDATE admissions SET kanban_stage = ? WHERE id = ?').bind(stage, admissionId).run();
        return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // ==========================================
    // 8. API: AUDIT LOGS & STAFF
    // ==========================================
    if (url.pathname === '/api/audit-logs' && request.method === 'GET') {
      try {
        const { results: logs } = await env.DB.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 50').all();
        return new Response(JSON.stringify({ logs: logs || [] }), { headers: { 'Content-Type': 'application/json' } });
      } catch (err: any) {
        return new Response(JSON.stringify({ logs: [] }), { headers: { 'Content-Type': 'application/json' } });
      }
    }

    if (url.pathname === '/api/staff' && request.method === 'GET') {
      try {
        const { results: staff } = await env.DB.prepare('SELECT id, username, full_name, role, status, created_at, last_login_at FROM users').all();
        return new Response(JSON.stringify({ staff: staff || [] }), { headers: { 'Content-Type': 'application/json' } });
      } catch (err: any) {
        return new Response(JSON.stringify({ staff: [] }), { headers: { 'Content-Type': 'application/json' } });
      }
    }

    // Static Assets fallback (Frontend UI)
    return env.ASSETS.fetch(request);
  },
};
