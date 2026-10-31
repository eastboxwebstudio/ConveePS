import crypto from 'node:crypto';

export interface Env {
  DB: any;
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  R2_BUCKET?: any;
  'convee-carepulse-assets'?: any;
  ENVIRONMENT: string;
  FACILITY_NAME: string;
  TIMEZONE: string;
}

function hashPasscode(passcode: string, salt: string): string {
  return crypto.pbkdf2Sync(passcode, salt, 10000, 32, 'sha256').toString('hex');
}

async function getAuthUser(request: Request, env: Env): Promise<any> {
  try {
    const cookie = request.headers.get('cookie') || '';
    const token = (cookie.match(/convee_session=([^;]+)/) || [])[1] || request.headers.get('authorization')?.replace(/^Bearer\s+/, '');
    if (!token) return null;
    const session: any = await env.DB.prepare(
      "SELECT user_id FROM sessions WHERE token = ? AND datetime(expires_at) > datetime('now')"
    ).bind(token).first();
    if (!session) return null;
    return await env.DB.prepare(
      'SELECT id, username, full_name, role, status FROM users WHERE id = ?'
    ).bind(session.user_id).first();
  } catch {
    return null;
  }
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
    // 1.1 AUTH: LOGOUT
    // ==========================================
    if (url.pathname === '/api/auth/logout' && request.method === 'POST') {
      try {
        const cookie = request.headers.get('cookie') || '';
        const token = (cookie.match(/convee_session=([^;]+)/) || [])[1] || request.headers.get('authorization')?.replace(/^Bearer\s+/, '');
        if (token) {
          await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run().catch(() => {});
        }
      } catch {}

      const headers = new Headers({
        'Content-Type': 'application/json',
        'Set-Cookie': 'convee_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT',
      });

      return new Response(JSON.stringify({ success: true, message: 'Logged out successfully.' }), {
        status: 200,
        headers,
      });
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
    // 5.1 API: CREATE PATIENT & ADMISSION (POST /api/patients)
    // ==========================================
    if (url.pathname === '/api/patients' && request.method === 'POST') {
      try {
        const body: any = await request.json().catch(() => ({}));
        const {
          full_name,
          gender,
          age,
          date_of_birth,
          zone,
          room_bed,
          primary_diagnosis,
          prescribed_medications,
          follow_up_facility,
          emergency_contact_name,
          emergency_contact_phone,
          care_level,
          baseline_mobility,
          feeding_method,
          admission_date,
          admission_time,
          admission_remarks,
        } = body;

        if (!full_name || !gender || !zone || !primary_diagnosis) {
          return new Response(JSON.stringify({ error: 'Sila lengkapkan nama pesakit, jantina, zon (lelaki/perempuan) dan diagnosis utama.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Generate auto MRN
        let nextSeq = 1;
        try {
          const countRecord = await env.DB.prepare('SELECT COUNT(*) as count FROM patients').first();
          nextSeq = ((countRecord?.count as number) || 0) + 1;
        } catch {}

        const mrn = `PT-${String(nextSeq).padStart(3, '0')}`;
        const patientId = 'pt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        const admissionId = 'adm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        const admNumber = `ADM-${new Date().getFullYear()}-${String(nextSeq).padStart(3, '0')}`;

        const admDate = admission_date || new Date().toISOString().split('T')[0];
        const admTime = admission_time || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

        const user = await getAuthUser(request, env);
        const staffId = user?.id || 'system';

        // 1. Insert patient record
        await env.DB.prepare(`
          INSERT INTO patients (
            id, mrn, full_name, gender, age, date_of_birth, zone, room_bed,
            primary_diagnosis, prescribed_medications, follow_up_facility,
            emergency_contact_name, emergency_contact_phone, care_level,
            baseline_mobility, feeding_method, status, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', datetime('now'), datetime('now'))
        `).bind(
          patientId,
          mrn,
          full_name.trim(),
          gender,
          Number(age) || 0,
          date_of_birth || null,
          zone,
          room_bed || null,
          primary_diagnosis.trim(),
          prescribed_medications || null,
          follow_up_facility || null,
          emergency_contact_name || null,
          emergency_contact_phone || null,
          care_level || 'Partial Assist',
          baseline_mobility || 'Able to ambulate',
          feeding_method || 'Oral normal diet',
        ).run();

        // 2. Insert admission record
        try {
          await env.DB.prepare(`
            INSERT INTO admissions (
              id, patient_id, admission_number, admission_date, admission_time, zone, room_bed,
              admitted_by, lifecycle_status, kanban_stage, admission_remarks, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active', 'New Admission', ?, datetime('now'), datetime('now'))
          `).bind(
            admissionId,
            patientId,
            admNumber,
            admDate,
            admTime,
            zone,
            room_bed || null,
            staffId,
            admission_remarks || 'Pendaftaran kemasukan pesakit baru.'
          ).run();
        } catch (admErr: any) {
          console.warn('Fallback admission insert:', admErr);
          await env.DB.prepare(`
            INSERT INTO admissions (
              id, patient_id, admission_number, admission_date, admission_time, zone, room_bed,
              lifecycle_status, kanban_stage, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Active', 'New Admission', datetime('now'), datetime('now'))
          `).bind(
            admissionId,
            patientId,
            admNumber,
            admDate,
            admTime,
            zone,
            room_bed || null
          ).run();
        }

        // 3. Auto-seed standard personal items
        const standardItems = [
          'Ubat Gigi & Berus Gigi',
          'Sabun Mandi / Shower Gel',
          'Tuala Mandi',
          'Pakaian / Kain Pelekat / Batik',
          'Lampin Pakai Buang (Diapers / Pants)',
          'Tisu Basah (Wet Wipes)',
          'Minyak Urut / Losyen Pelembap',
          'Sikat & Pengetip Kuku',
          'Selipar Getah Anti-Licin',
        ];

        for (let i = 0; i < standardItems.length; i++) {
          try {
            const itemId = 'inv_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
            await env.DB.prepare(`
              INSERT INTO patient_inventory_items (
                id, patient_id, category, item_order, item_name, stock_balance, stock_necessity,
                restock_date, restock_qty, remark, created_at, updated_at
              ) VALUES (?, ?, 'personal', ?, ?, 'Cukup', 'NO', '', '', '', datetime('now'), datetime('now'))
            `).bind(itemId, patientId, i + 1, standardItems[i]).run();
          } catch {}
        }

        // 4. Auto-seed prescribed medications if provided
        if (prescribed_medications) {
          const medList = String(prescribed_medications)
            .split(/[,;\n]+/)
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

          for (let i = 0; i < medList.length; i++) {
            try {
              const medId = 'inv_m_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
              await env.DB.prepare(`
                INSERT INTO patient_inventory_items (
                  id, patient_id, category, item_order, item_name, stock_balance, stock_necessity,
                  restock_date, restock_qty, remark, created_at, updated_at
                ) VALUES (?, ?, 'medication', ?, ?, '14 tab', 'NO', '', '', 'Mencukupi', datetime('now'), datetime('now'))
              `).bind(medId, patientId, i + 1, medList[i]).run();
            } catch {}
          }
        }

        // Audit log
        try {
          const logId = 'log_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
          await env.DB.prepare(`
            INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, details, created_at)
            VALUES (?, ?, 'CREATE_PATIENT', 'patients', ?, ?, datetime('now'))
          `).bind(logId, staffId, patientId, `Mendaftarkan pesakit ${full_name} (${mrn}) di ${zone} - ${room_bed || 'Tanpa Katil'}.`).run();
        } catch {}

        return new Response(JSON.stringify({
          success: true,
          message: 'Pesakit berjaya didaftarkan.',
          patientId,
          mrn,
        }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message || 'Gagal mendaftarkan pesakit baru.' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // ==========================================
    // 5.2 API: UPDATE PATIENT (PATCH /api/patients/:id)
    // ==========================================
    if (url.pathname.startsWith('/api/patients/') && request.method === 'PATCH') {
      try {
        const id = url.pathname.split('/')[3];
        const body: any = await request.json().catch(() => ({}));
        const allowed = [
          'full_name', 'gender', 'age', 'date_of_birth', 'zone', 'room_bed',
          'primary_diagnosis', 'prescribed_medications', 'follow_up_facility',
          'emergency_contact_name', 'emergency_contact_phone', 'care_level',
          'baseline_mobility', 'feeding_method'
        ];
        const sets: string[] = [];
        const vals: any[] = [];
        for (const k of allowed) {
          if (body[k] !== undefined) {
            sets.push(`${k} = ?`);
            vals.push(k === 'age' ? Number(body[k]) : body[k]);
          }
        }
        if (sets.length > 0) {
          sets.push("updated_at = datetime('now')");
          vals.push(id);
          await env.DB.prepare(`UPDATE patients SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
        }
        return new Response(JSON.stringify({ success: true, message: 'Maklumat pesakit berjaya dikemaskini.' }), {
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

        // Resolve active admission_id for patient_id if not provided
        let activeAdmissionId = body.admission_id;
        if (!activeAdmissionId && body.patient_id) {
          const activeAdm = await env.DB.prepare(
            "SELECT id FROM admissions WHERE patient_id = ? AND lifecycle_status = 'Active' ORDER BY created_at DESC LIMIT 1"
          ).bind(body.patient_id).first();
          if (activeAdm && activeAdm.id) {
            activeAdmissionId = activeAdm.id;
          } else {
            const anyAdm = await env.DB.prepare(
              "SELECT id FROM admissions WHERE patient_id = ? ORDER BY created_at DESC LIMIT 1"
            ).bind(body.patient_id).first();
            if (anyAdm && anyAdm.id) {
              activeAdmissionId = anyAdm.id;
            } else {
              // Auto-create admission for this patient if none exists in D1
              activeAdmissionId = 'adm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
              const admNum = `ADM-${new Date().getFullYear()}-001`;
              const pt = await env.DB.prepare("SELECT zone, room_bed FROM patients WHERE id = ?").bind(body.patient_id).first();
              await env.DB.prepare(`
                INSERT INTO admissions (id, patient_id, admission_number, admission_date, admission_time, zone, room_bed, lifecycle_status, kanban_stage, created_at, updated_at)
                VALUES (?, ?, ?, date('now'), time('now'), ?, ?, 'Active', 'New Admission', datetime('now'), datetime('now'))
              `).bind(activeAdmissionId, body.patient_id, admNum, pt?.zone || 'Zon Lelaki', pt?.room_bed || 'Katil L-01').run();
            }
          }
        }

        const user = await getAuthUser(request, env);
        const staffUserId = user?.id || body.staff_user_id || 'system';
        const staffName = user?.full_name || body.staff_name || 'Jururawat';

        // Try inserting with enhanced DAPUD columns first
        try {
          await env.DB.prepare(`
            INSERT INTO monitoring_records (
              id, admission_id, patient_id, staff_user_id, staff_name, timestamp, shift,
              clinical_status, blood_pressure, pulse_rate, temperature, spo2, blood_sugar,
              pain_level, general_condition, consciousness, mobility_status, appetite,
              urine_output, urine_other, bowel_movement, medication_intake, hygiene_care, feeding_care,
              wound_dressing, repositioning, mobilisation, nursing_report,
              diet_plan, tube_has_ngt, tube_has_cbd, tube_type, tube_material, tube_replacement_date, tube_size,
              patient_behavior, attachment_image, nurse_advice, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `).bind(
            id, activeAdmissionId, body.patient_id, staffUserId, staffName,
            timestamp, body.shift || 'Morning (7:00am-5:00pm)', body.clinical_status || 'Stable',
            body.blood_pressure || null, body.pulse_rate || null, body.temperature || null,
            body.spo2 || null, body.blood_sugar || '-', body.pain_level || 0,
            body.general_condition || 'Stable', body.consciousness || 'Alert', body.mobility_status || 'Independent',
            (body.appetite || 'Good').toUpperCase(), body.urine_output || 'Normal', body.urine_other || null, body.bowel_movement || 0,
            body.medication_intake || 'SERVED', body.hygiene_care || 'Normal shower', body.feeding_care || 'DONE',
            body.wound_dressing || 'N/A', body.repositioning || 'N/A', body.mobilisation || '1',
            body.nursing_report || null,
            body.diet_plan || null, body.tube_has_ngt ? 1 : 0, body.tube_has_cbd ? 1 : 0,
            body.tube_type || null, body.tube_material || null, body.tube_replacement_date || null, body.tube_size || null,
            body.patient_behavior || null, body.attachment_image || null, body.nurse_advice || null
          ).run();
        } catch (insertErr) {
          // Fallback to legacy columns if migration 0004 not yet fully applied in D1
          await env.DB.prepare(`
            INSERT INTO monitoring_records (
              id, admission_id, patient_id, staff_user_id, staff_name, timestamp, shift,
              clinical_status, blood_pressure, pulse_rate, temperature, spo2, blood_sugar,
              pain_level, general_condition, consciousness, mobility_status, appetite,
              urine_output, bowel_movement, medication_intake, hygiene_care, feeding_care,
              wound_dressing, repositioning, mobilisation, nursing_report, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
          `).bind(
            id, activeAdmissionId, body.patient_id, staffUserId, staffName,
            timestamp, body.shift || 'Morning (7:00am-5:00pm)', body.clinical_status || 'Stable',
            body.blood_pressure || null, body.pulse_rate || null, body.temperature || null,
            body.spo2 || null, body.blood_sugar || '-', body.pain_level || 0,
            body.general_condition || 'Stable', body.consciousness || 'Alert', body.mobility_status || 'Independent',
            (body.appetite || 'Good').toUpperCase(), body.urine_output || 'Normal', body.bowel_movement || 0,
            body.medication_intake || 'SERVED', body.hygiene_care || 'Normal shower', body.feeding_care || 'DONE',
            body.wound_dressing || 'N/A', body.repositioning || 'N/A', body.mobilisation || '1',
            body.nursing_report || null
          ).run();
        }

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

    // ==========================================
    // 9. API: INVENTORY & WEEKLY STOCK CHECK
    // ==========================================
    if (url.pathname === '/api/inventory/summary' && request.method === 'GET') {
      try {
        const totalPatients = await env.DB.prepare('SELECT COUNT(DISTINCT patient_id) as cnt FROM patient_inventory_items').first();
        const totalItems = await env.DB.prepare('SELECT COUNT(*) as cnt FROM patient_inventory_items').first();
        const totalRestock = await env.DB.prepare("SELECT COUNT(*) as cnt FROM patient_inventory_items WHERE stock_necessity = 'YES'").first();
        const personalRestock = await env.DB.prepare("SELECT COUNT(*) as cnt FROM patient_inventory_items WHERE stock_necessity = 'YES' AND category = 'personal'").first();
        const medsRestock = await env.DB.prepare("SELECT COUNT(*) as cnt FROM patient_inventory_items WHERE stock_necessity = 'YES' AND category = 'medication'").first();

        const { results: urgentAlerts } = await env.DB.prepare(
          `SELECT i.patient_id, p.full_name as patient_name, p.room_bed, i.item_name, i.category, i.stock_balance, i.remark
           FROM patient_inventory_items i
           JOIN patients p ON p.id = i.patient_id
           WHERE i.stock_necessity = 'YES'
           ORDER BY i.category DESC, p.full_name ASC`
        ).all();

        return new Response(JSON.stringify({
          total_patients: totalPatients?.cnt || 0,
          total_items_tracked: totalItems?.cnt || 0,
          total_restock_needed: totalRestock?.cnt || 0,
          personal_restock_needed: personalRestock?.cnt || 0,
          meds_restock_needed: medsRestock?.cnt || 0,
          urgent_alerts: urgentAlerts || [],
        }), { headers: { 'Content-Type': 'application/json' } });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    if (url.pathname.startsWith('/api/inventory/patient/') && request.method === 'GET') {
      try {
        const patientId = url.pathname.split('/')[4];
        const patient = await env.DB.prepare('SELECT * FROM patients WHERE id = ?').bind(patientId).first();
        if (!patient) {
          return new Response(JSON.stringify({ error: 'Pesakit tidak dijumpai.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }

        const { results: items } = await env.DB.prepare(
          'SELECT * FROM patient_inventory_items WHERE patient_id = ? ORDER BY category ASC, item_order ASC, item_name ASC'
        ).bind(patientId).all();

        const personalItems = (items || []).filter((i: any) => i.category === 'personal');
        const medicationItems = (items || []).filter((i: any) => i.category === 'medication');

        const latestCheck = await env.DB.prepare(
          'SELECT * FROM patient_inventory_checks WHERE patient_id = ? ORDER BY check_date DESC, created_at DESC LIMIT 1'
        ).bind(patientId).first();

        const { results: checkHistory } = await env.DB.prepare(
          'SELECT * FROM patient_inventory_checks WHERE patient_id = ? ORDER BY check_date DESC LIMIT 10'
        ).bind(patientId).all();

        return new Response(JSON.stringify({
          patient,
          personal_items: personalItems,
          medication_items: medicationItems,
          latest_check: latestCheck,
          check_history: checkHistory || [],
        }), { headers: { 'Content-Type': 'application/json' } });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    if (url.pathname.startsWith('/api/inventory/items/') && request.method === 'PUT') {
      try {
        const itemId = url.pathname.split('/')[4];
        const body: any = await request.json();
        const { stock_balance, stock_necessity, restock_date, restock_qty, remark, item_name } = body;

        await env.DB.prepare(
          `UPDATE patient_inventory_items
           SET stock_balance = COALESCE(?, stock_balance),
               stock_necessity = COALESCE(?, stock_necessity),
               restock_date = COALESCE(?, restock_date),
               restock_qty = COALESCE(?, restock_qty),
               remark = COALESCE(?, remark),
               item_name = COALESCE(?, item_name),
               updated_at = datetime('now')
           WHERE id = ?`
        ).bind(
          stock_balance !== undefined ? String(stock_balance) : null,
          stock_necessity || null,
          restock_date !== undefined ? String(restock_date) : null,
          restock_qty !== undefined ? String(restock_qty) : null,
          remark !== undefined ? String(remark) : null,
          item_name || null,
          itemId
        ).run();

        const updated = await env.DB.prepare('SELECT * FROM patient_inventory_items WHERE id = ?').bind(itemId).first();
        return new Response(JSON.stringify({ success: true, item: updated }), { headers: { 'Content-Type': 'application/json' } });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    if (url.pathname === '/api/inventory/restock' && request.method === 'POST') {
      try {
        const body: any = await request.json();
        const { itemId, restockQty, restockDate, newStockBalance, stockNecessity = 'NO', remark } = body;
        const todayDate = restockDate || new Date().toISOString().split('T')[0];

        await env.DB.prepare(
          `UPDATE patient_inventory_items
           SET stock_balance = COALESCE(?, stock_balance),
               stock_necessity = ?,
               restock_date = ?,
               restock_qty = COALESCE(?, restock_qty),
               remark = COALESCE(?, remark),
               updated_at = datetime('now')
           WHERE id = ?`
        ).bind(
          newStockBalance !== undefined ? String(newStockBalance) : null,
          stockNecessity,
          todayDate,
          restockQty !== undefined ? String(restockQty) : null,
          remark !== undefined ? String(remark) : null,
          itemId
        ).run();

        const updated = await env.DB.prepare('SELECT * FROM patient_inventory_items WHERE id = ?').bind(itemId).first();
        return new Response(JSON.stringify({ success: true, item: updated }), { headers: { 'Content-Type': 'application/json' } });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    if (url.pathname === '/api/inventory/checks' && request.method === 'POST') {
      try {
        const body: any = await request.json();
        const { patient_id, check_date, personal_staff_name, med_staff_name, general_remarks, items = [] } = body;
        const checkId = 'chk_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
        let totalItems = items.length;
        let totalRestockNeeded = 0;

        for (const it of items) {
          if (it.stock_necessity === 'YES') totalRestockNeeded++;
        }

        await env.DB.prepare(
          `INSERT INTO patient_inventory_checks (id, patient_id, check_date, personal_staff_name, med_staff_name, status, total_items, total_restock_needed, general_remarks)
           VALUES (?, ?, ?, ?, ?, 'Completed', ?, ?, ?)`
        ).bind(checkId, patient_id, check_date, personal_staff_name, med_staff_name || null, totalItems, totalRestockNeeded, general_remarks || null).run();

        for (const it of items) {
          const detailId = 'det_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
          await env.DB.prepare(
            `INSERT INTO patient_inventory_check_details (id, check_id, patient_id, category, item_name, stock_balance, stock_necessity, restock_date, restock_qty, remark)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            detailId, checkId, patient_id, it.category || 'personal', it.item_name,
            String(it.stock_balance || '0'), it.stock_necessity || 'NO',
            String(it.restock_date || ''), String(it.restock_qty || ''), String(it.remark || '')
          ).run();

          if (it.id) {
            await env.DB.prepare(
              `UPDATE patient_inventory_items
               SET stock_balance = ?, stock_necessity = ?, restock_date = ?, restock_qty = ?, remark = ?, updated_at = datetime('now')
               WHERE id = ?`
            ).bind(
              String(it.stock_balance || '0'), it.stock_necessity || 'NO',
              String(it.restock_date || ''), String(it.restock_qty || ''), String(it.remark || ''),
              it.id
            ).run();
          }
        }

        return new Response(JSON.stringify({ success: true, check_id: checkId, total_items: totalItems, total_restock_needed: totalRestockNeeded }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // ==========================================
    // 9.4 API: ADD INVENTORY ITEM (POST /api/inventory/items)
    // ==========================================
    if (url.pathname === '/api/inventory/items' && request.method === 'POST') {
      try {
        const body: any = await request.json();
        const { patient_id, category = 'personal', item_name, stock_balance = '0', stock_necessity = 'NO', restock_date = '', restock_qty = '', remark = '', image_url = null } = body;
        if (!patient_id || !item_name) {
          return new Response(JSON.stringify({ error: 'Sila lengkapkan nama item dan pesakit.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        const itemId = 'inv_' + (category === 'medication' ? 'm_' : '') + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
        const count = await env.DB.prepare('SELECT COUNT(*) as cnt FROM patient_inventory_items WHERE patient_id = ? AND category = ?').bind(patient_id, category).first();
        const order = ((count?.cnt as number) || 0) + 1;

        try {
          await env.DB.prepare(`
            INSERT INTO patient_inventory_items (
              id, patient_id, category, item_order, item_name, stock_balance, stock_necessity,
              restock_date, restock_qty, remark, image_url, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `).bind(itemId, patient_id, category, order, item_name.trim(), String(stock_balance), stock_necessity, String(restock_date), String(restock_qty), String(remark), image_url).run();
        } catch {
          await env.DB.prepare(`
            INSERT INTO patient_inventory_items (
              id, patient_id, category, item_order, item_name, stock_balance, stock_necessity,
              restock_date, restock_qty, remark, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `).bind(itemId, patient_id, category, order, item_name.trim(), String(stock_balance), stock_necessity, String(restock_date), String(restock_qty), String(remark)).run();
        }

        const created = await env.DB.prepare('SELECT * FROM patient_inventory_items WHERE id = ?').bind(itemId).first();
        return new Response(JSON.stringify({ success: true, item: created }), { status: 201, headers: { 'Content-Type': 'application/json' } });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // ==========================================
    // 9.5 API: DELETE INVENTORY ITEM (DELETE /api/inventory/items/:id)
    // ==========================================
    if (url.pathname.startsWith('/api/inventory/items/') && request.method === 'DELETE') {
      try {
        const itemId = url.pathname.split('/')[4];
        await env.DB.prepare('DELETE FROM patient_inventory_items WHERE id = ?').bind(itemId).run();
        return new Response(JSON.stringify({ success: true, message: 'Item berjaya dipadam.' }), { headers: { 'Content-Type': 'application/json' } });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // ==========================================
    // 10. API: DISCHARGE PATIENT (POST /api/admissions/:id/discharge)
    // ==========================================
    if (url.pathname.startsWith('/api/admissions/') && url.pathname.endsWith('/discharge') && request.method === 'POST') {
      try {
        const admissionId = url.pathname.split('/')[3];
        const body: any = await request.json().catch(() => ({}));
        const admission = await env.DB.prepare('SELECT * FROM admissions WHERE id = ?').bind(admissionId).first();
        if (!admission) {
          return new Response(JSON.stringify({ error: 'Rekod kemasukan tidak dijumpai.' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }

        const todayDate = new Date().toISOString().split('T')[0];
        const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        const user = await getAuthUser(request, env);
        const staffId = user?.id || 'system';

        await env.DB.prepare(`
          UPDATE admissions
          SET lifecycle_status = 'Discharged',
              kanban_stage = 'Discharged',
              discharge_date = ?,
              discharge_destination = ?,
              discharge_summary = ?,
              updated_at = datetime('now')
          WHERE id = ?
        `).bind(todayDate, body.discharge_destination || 'Rumah', body.discharge_summary || '', admissionId).run();

        await env.DB.prepare("UPDATE patients SET status = 'Discharged', updated_at = datetime('now') WHERE id = ?").bind(admission.patient_id).run();

        const dischargeId = 'dis_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
        await env.DB.prepare(`
          INSERT INTO discharges (
            id, admission_id, patient_id, discharge_date, discharge_time,
            discharge_destination, discharge_summary, emergency_contact_notified,
            discharged_by_staff_id, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).bind(
          dischargeId, admissionId, admission.patient_id, todayDate, nowTime,
          body.discharge_destination || 'Rumah', body.discharge_summary || '',
          body.emergency_contact_notified ? 1 : 0, staffId
        ).run();

        return new Response(JSON.stringify({ success: true, message: 'Pesakit berjaya didiscaj.' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // ==========================================
    // 11. API: UPDATE TCA (PATCH /api/admissions/:id/tca)
    // ==========================================
    if (url.pathname.startsWith('/api/admissions/') && url.pathname.endsWith('/tca') && request.method === 'PATCH') {
      try {
        const admissionId = url.pathname.split('/')[3];
        const body: any = await request.json();
        const { tca_date, tca_location, tca_remarks } = body;
        await env.DB.prepare(`
          UPDATE admissions
          SET tca_date = ?, tca_location = ?, tca_remarks = ?, updated_at = datetime('now')
          WHERE id = ?
        `).bind(tca_date || null, tca_location || null, tca_remarks || null, admissionId).run();
        return new Response(JSON.stringify({ success: true, message: 'Temujanji TCA berjaya dikemaskini.' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // ==========================================
    // 12. API: CLOUDFLARE R2 STORAGE
    // ==========================================
    if (url.pathname === '/api/storage/upload' && request.method === 'POST') {
      try {
        const body: any = await request.json().catch(() => ({}));
        const { imageBase64, prefix = 'convee' } = body;
        if (!imageBase64) {
          return new Response(JSON.stringify({ error: 'Sila sertakan data imej Base64.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const matches = imageBase64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        const mimeType = matches ? matches[1] : 'image/jpeg';
        const base64Data = matches ? matches[2] : imageBase64;
        const ext = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
        const key = `${prefix}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

        const r2 = env.R2_BUCKET || env['convee-carepulse-assets'] || (env as any).BUCKET;
        if (r2 && typeof r2.put === 'function') {
          const binary = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
          await r2.put(key, binary, { httpMetadata: { contentType: mimeType } });
          return new Response(JSON.stringify({
            success: true,
            url: `/api/storage/file/${key}`,
            key,
            storageType: 'cloudflare_r2',
            sizeBytes: binary.length,
          }), { headers: { 'Content-Type': 'application/json' } });
        }

        // Safe fallback
        return new Response(JSON.stringify({
          success: true,
          url: imageBase64,
          key,
          storageType: 'base64_fallback',
          sizeBytes: imageBase64.length,
        }), { headers: { 'Content-Type': 'application/json' } });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    if (url.pathname.startsWith('/api/storage/file/') && request.method === 'GET') {
      try {
        const key = url.pathname.replace('/api/storage/file/', '');
        const r2 = env.R2_BUCKET || env['convee-carepulse-assets'] || (env as any).BUCKET;
        if (r2 && typeof r2.get === 'function') {
          const object = await r2.get(key);
          if (!object) return new Response('File not found', { status: 404 });
          const headers = new Headers();
          object.writeHttpMetadata(headers);
          headers.set('etag', object.httpEtag);
          return new Response(object.body, { headers });
        }
        return new Response('R2 not available', { status: 404 });
      } catch (err: any) {
        return new Response(err.message, { status: 500 });
      }
    }

    if (url.pathname === '/api/storage/r2/status' && request.method === 'GET') {
      const r2 = env.R2_BUCKET || env['convee-carepulse-assets'] || (env as any).BUCKET;
      return new Response(JSON.stringify({
        configured: Boolean(r2),
        bucketName: 'convee-carepulse-assets',
        storageType: r2 ? 'cloudflare_r2' : 'base64_fallback',
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // ==========================================
    // 13. API: APPOINTMENTS & VISITORS
    // ==========================================
    if (url.pathname === '/api/appointments' && request.method === 'GET') {
      try {
        const user = await getAuthUser(request, env);
        if (!user) return new Response(JSON.stringify({ error: 'Tidak dibenarkan.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

        const date = url.searchParams.get('date');
        const status = url.searchParams.get('status');
        const search = url.searchParams.get('search');
        const patient_id = url.searchParams.get('patient_id');

        let query = `
          SELECT a.*,
                 p.full_name as patient_name,
                 p.mrn as patient_mrn,
                 p.zone as patient_zone,
                 p.room_bed,
                 u.full_name as staff_name
          FROM appointments a
          LEFT JOIN patients p ON a.patient_id = p.id
          LEFT JOIN users u ON a.staff_user_id = u.id
          WHERE 1=1
        `;
        const binds: any[] = [];

        if (patient_id) {
          query += ' AND a.patient_id = ?';
          binds.push(patient_id);
        }

        if (status && status !== 'all') {
          query += ' AND a.status = ?';
          binds.push(status);
        }

        if (date === 'today') {
          query += " AND date(a.scheduled_date) = date('now')";
        } else if (date === 'upcoming') {
          query += " AND (date(a.scheduled_date) >= date('now') OR a.status = 'Checked-In')";
        } else if (date && date !== 'all') {
          query += ' AND date(a.scheduled_date) = date(?)';
          binds.push(date);
        }

        if (search) {
          const term = `%${search.trim()}%`;
          query += ' AND (a.visitor_name LIKE ? OR a.visitor_phone LIKE ? OR a.visitor_ic_passport LIKE ? OR p.full_name LIKE ? OR p.mrn LIKE ?)';
          binds.push(term, term, term, term, term);
        }

        query += `
          ORDER BY
            CASE
              WHEN a.status = 'Checked-In' THEN 1
              WHEN a.status = 'Scheduled' THEN 2
              WHEN a.status = 'Completed' THEN 3
              ELSE 4
            END,
            a.scheduled_date ASC,
            a.scheduled_time ASC
        `;

        let stmt = env.DB.prepare(query);
        if (binds.length > 0) stmt = stmt.bind(...binds);
        const appointments = (await stmt.all())?.results || [];

        const statsQuery = `
          SELECT
            SUM(CASE WHEN date(scheduled_date) = date('now') THEN 1 ELSE 0 END) as today_total,
            SUM(CASE WHEN status = 'Checked-In' THEN 1 ELSE 0 END) as currently_checked_in,
            SUM(CASE WHEN status = 'Scheduled' AND date(scheduled_date) >= date('now') THEN 1 ELSE 0 END) as upcoming_scheduled,
            SUM(CASE WHEN status = 'Completed' AND date(scheduled_date) = date('now') THEN 1 ELSE 0 END) as completed_today
          FROM appointments
        `;
        const stats: any = (await env.DB.prepare(statsQuery).first()) || {};

        return new Response(JSON.stringify({
          appointments,
          stats: {
            today_total: Number(stats.today_total || 0),
            currently_checked_in: Number(stats.currently_checked_in || 0),
            upcoming_scheduled: Number(stats.upcoming_scheduled || 0),
            completed_today: Number(stats.completed_today || 0),
          },
        }), { headers: { 'Content-Type': 'application/json' } });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    if (url.pathname === '/api/appointments' && request.method === 'POST') {
      try {
        const user = await getAuthUser(request, env);
        if (!user) return new Response(JSON.stringify({ error: 'Tidak dibenarkan.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

        const body: any = await request.json().catch(() => ({}));
        const {
          patient_id,
          visitor_name,
          visitor_ic_passport,
          visitor_phone,
          relationship,
          purpose,
          scheduled_date,
          scheduled_time,
          duration_minutes = 45,
          pax_count = 1,
          notes,
          health_declaration = 1,
          temperature,
          is_walk_in = false,
        } = body;

        if (!visitor_name || !visitor_phone || !relationship || !purpose) {
          return new Response(JSON.stringify({ error: 'Sila lengkapkan maklumat wajib pelawat.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const todayDate = new Date().toISOString().split('T')[0];
        const finalDate = scheduled_date || todayDate;
        const finalTime = scheduled_time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const id = `apt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const status = is_walk_in ? 'Checked-In' : 'Scheduled';
        const checkInTime = is_walk_in ? new Date().toISOString() : null;

        await env.DB.prepare(`
          INSERT INTO appointments (
            id, patient_id, visitor_name, visitor_ic_passport, visitor_phone,
            relationship, purpose, scheduled_date, scheduled_time, duration_minutes,
            pax_count, status, check_in_time, check_out_time, health_declaration,
            temperature, notes, staff_user_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)
        `).bind(
          id,
          patient_id || null,
          visitor_name.trim(),
          visitor_ic_passport ? visitor_ic_passport.trim() : null,
          visitor_phone.trim(),
          relationship.trim(),
          purpose.trim(),
          finalDate,
          finalTime,
          Number(duration_minutes) || 45,
          Number(pax_count) || 1,
          status,
          checkInTime,
          Number(health_declaration) ? 1 : 0,
          temperature ? Number(temperature) : null,
          notes ? notes.trim() : null,
          user.id,
        ).run();

        const created = await env.DB.prepare(`
          SELECT a.*,
                 p.full_name as patient_name,
                 p.mrn as patient_mrn,
                 p.zone as patient_zone,
                 p.room_bed,
                 u.full_name as staff_name
          FROM appointments a
          LEFT JOIN patients p ON a.patient_id = p.id
          LEFT JOIN users u ON a.staff_user_id = u.id
          WHERE a.id = ?
        `).bind(id).first();

        return new Response(JSON.stringify({
          success: true,
          message: is_walk_in ? 'Pelawat berjaya didaftarkan masuk terus (Walk-in).' : 'Temujanji berjaya dijadualkan.',
          appointment: created,
        }), { status: 201, headers: { 'Content-Type': 'application/json' } });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    if (url.pathname.match(/^\/api\/appointments\/[^/]+\/check-in$/) && request.method === 'PATCH') {
      try {
        const user = await getAuthUser(request, env);
        if (!user) return new Response(JSON.stringify({ error: 'Tidak dibenarkan.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

        const id = url.pathname.split('/')[3];
        const body: any = await request.json().catch(() => ({}));
        const { temperature, health_declaration = 1 } = body;

        const checkInTime = new Date().toISOString();
        await env.DB.prepare(`
          UPDATE appointments
          SET status = 'Checked-In',
              check_in_time = ?,
              temperature = COALESCE(?, temperature),
              health_declaration = ?,
              staff_user_id = ?,
              updated_at = datetime('now')
          WHERE id = ?
        `).bind(
          checkInTime,
          temperature ? Number(temperature) : null,
          Number(health_declaration) ? 1 : 0,
          user.id,
          id,
        ).run();

        return new Response(JSON.stringify({ success: true, message: 'Pelawat berjaya didaftarkan masuk.' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    if (url.pathname.match(/^\/api\/appointments\/[^/]+\/check-out$/) && request.method === 'PATCH') {
      try {
        const user = await getAuthUser(request, env);
        if (!user) return new Response(JSON.stringify({ error: 'Tidak dibenarkan.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

        const id = url.pathname.split('/')[3];
        const checkOutTime = new Date().toISOString();

        await env.DB.prepare(`
          UPDATE appointments
          SET status = 'Completed',
              check_out_time = ?,
              updated_at = datetime('now')
          WHERE id = ?
        `).bind(checkOutTime, id).run();

        return new Response(JSON.stringify({ success: true, message: 'Pelawat berjaya didaftarkan keluar.' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    if (url.pathname.match(/^\/api\/appointments\/[^/]+\/status$/) && request.method === 'PATCH') {
      try {
        const user = await getAuthUser(request, env);
        if (!user) return new Response(JSON.stringify({ error: 'Tidak dibenarkan.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

        const id = url.pathname.split('/')[3];
        const body: any = await request.json().catch(() => ({}));
        const { status } = body;

        await env.DB.prepare(`
          UPDATE appointments
          SET status = ?,
              updated_at = datetime('now')
          WHERE id = ?
        `).bind(status, id).run();

        return new Response(JSON.stringify({ success: true, message: 'Status temujanji berjaya dikemaskini.' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    if (url.pathname.match(/^\/api\/appointments\/[^/]+$/) && request.method === 'DELETE') {
      try {
        const user = await getAuthUser(request, env);
        if (!user) return new Response(JSON.stringify({ error: 'Tidak dibenarkan.' }), { status: 401, headers: { 'Content-Type': 'application/json' } });

        const id = url.pathname.split('/')[3];
        await env.DB.prepare('DELETE FROM appointments WHERE id = ?').bind(id).run();

        return new Response(JSON.stringify({ success: true, message: 'Temujanji berjaya dipadam.' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // Static Assets fallback (Frontend UI)
    return env.ASSETS.fetch(request);
  },
};
