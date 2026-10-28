import { Router, Request, Response } from 'express';
import { all, first, run } from './db.js';
import {
  hashPasscode,
  generateSalt,
  generateSessionToken,
  checkRateLimit,
  recordFailedLogin,
  clearFailedLogin,
  requireAuth,
  requireAdmin,
  logAudit,
} from './auth.js';
import {
  getR2Config,
  saveR2Config,
  isR2Configured,
  testR2Connection,
  uploadBase64Image,
} from './storage.js';

export const apiRouter = Router();

// ==========================================
// 1. AUTHENTICATION ENDPOINTS
// ==========================================

apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  const { username, passcode } = req.body || {};
  const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';

  if (!username || !passcode) {
    return res.status(400).json({ error: 'Sila masukkan nama pengguna dan kata laluan.' });
  }

  const rateCheck = checkRateLimit(username.toLowerCase());
  if (!rateCheck.allowed) {
    return res.status(429).json({
      error: `Akaun disekat sementara kerana terlalu banyak percubaan gagal. Sila cuba lagi dalam ${rateCheck.remainingSec} saat.`,
    });
  }

  try {
    const user = await first<{
      id: string;
      username: string;
      full_name: string;
      role: 'admin' | 'staff_nurse' | 'caregiver';
      passcode_hash: string;
      passcode_salt: string;
      status: string;
      must_change_passcode: number;
    }>('SELECT * FROM users WHERE LOWER(username) = LOWER(?)', [username.trim()]);

    if (!user) {
      recordFailedLogin(username.toLowerCase());
      return res.status(401).json({ error: 'Nama pengguna atau kata laluan tidak sah.' });
    }

    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Akaun ini telah dinonaktifkan oleh Pentadbir.' });
    }

    const calculatedHash = hashPasscode(passcode, user.passcode_salt);
    if (calculatedHash !== user.passcode_hash) {
      recordFailedLogin(username.toLowerCase());
      return res.status(401).json({ error: 'Nama pengguna atau kata laluan tidak sah.' });
    }

    clearFailedLogin(username.toLowerCase());

    // Generate Session Token
    const token = generateSessionToken();
    const sessionId = 'ses_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    // Expires in 7 days
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await run('INSERT INTO sessions (id, user_id, token, expires_at) VALUES (?, ?, ?, ?)', [
      sessionId,
      user.id,
      token,
      expiresAt,
    ]);

    await run("UPDATE users SET last_login_at = datetime('now') WHERE id = ?", [user.id]);

    await logAudit(
      { id: user.id, full_name: user.full_name, role: user.role },
      'LOGIN',
      'users',
      user.id,
      `Pengguna ${user.username} (${user.role}) berjaya log masuk.`,
      clientIp
    );

    // Set HTTP-Only Cookie
    res.cookie('convee_session', token, {
      httpOnly: true,
      secure: false, // AI studio dev environment
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        role: user.role,
        must_change_passcode: user.must_change_passcode,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Ralat pelayan semasa log masuk.' });
  }
});

apiRouter.post('/auth/logout', requireAuth, async (req: Request, res: Response) => {
  if (req.sessionToken) {
    await run('DELETE FROM sessions WHERE token = ?', [req.sessionToken]);
  }
  res.clearCookie('convee_session', { path: '/' });
  if (req.user) {
    await logAudit(req.user, 'LOGOUT', 'users', req.user.id, `Pengguna ${req.user.username} log keluar.`);
  }
  return res.json({ success: true, message: 'Berjaya log keluar.' });
});

apiRouter.get('/auth/me', requireAuth, (req: Request, res: Response) => {
  return res.json({ user: req.user });
});

apiRouter.post('/auth/change-passcode', requireAuth, async (req: Request, res: Response) => {
  const { currentPasscode, newPasscode } = req.body || {};
  if (!newPasscode || newPasscode.length < 6) {
    return res.status(400).json({ error: 'Kata laluan baru mestilah sekurang-kurangnya 6 aksara.' });
  }

  const user = await first<{ passcode_hash: string; passcode_salt: string }>(
    'SELECT passcode_hash, passcode_salt FROM users WHERE id = ?',
    [req.user!.id]
  );

  if (!user) {
    return res.status(404).json({ error: 'Pengguna tidak dijumpai.' });
  }

  const currentHash = hashPasscode(currentPasscode, user.passcode_salt);
  if (currentHash !== user.passcode_hash) {
    return res.status(400).json({ error: 'Kata laluan semasa tidak tepat.' });
  }

  const newSalt = generateSalt();
  const newHash = hashPasscode(newPasscode, newSalt);

  await run(
    "UPDATE users SET passcode_hash = ?, passcode_salt = ?, must_change_passcode = 0, updated_at = datetime('now') WHERE id = ?",
    [newHash, newSalt, req.user!.id]
  );

  await logAudit(req.user!, 'CHANGE_PASSCODE', 'users', req.user!.id, 'Menukar kata laluan persendirian.');

  return res.json({ success: true, message: 'Kata laluan berjaya dikemas kini.' });
});

// ==========================================
// 2. DASHBOARD SUMMARY
// ==========================================

apiRouter.get('/dashboard/summary', requireAuth, async (req: Request, res: Response) => {
  try {
    // 1. Total Active Patients
    const activePatientsCount = await first<{ count: number }>(
      "SELECT COUNT(*) as count FROM patients WHERE status = 'Active'"
    );

    // 2. Zone Breakdown
    const maleZoneCount = await first<{ count: number }>(
      "SELECT COUNT(*) as count FROM patients WHERE status = 'Active' AND zone = 'Zon Lelaki'"
    );
    const femaleZoneCount = await first<{ count: number }>(
      "SELECT COUNT(*) as count FROM patients WHERE status = 'Active' AND zone = 'Zon Perempuan'"
    );

    // 3. New Admissions in last 7 days
    const newAdmissionsCount = await first<{ count: number }>(
      "SELECT COUNT(*) as count FROM admissions WHERE date(admission_date) >= date('now', '-7 days')"
    );

    // 4. Discharges count
    const dischargesCount = await first<{ count: number }>(
      "SELECT COUNT(*) as count FROM discharge_records"
    );

    // 5. Active Clinical Alerts (Red Alert, Poor Appetite, Refuse Meds)
    const redAlertCount = await first<{ count: number }>(
      "SELECT COUNT(DISTINCT patient_id) as count FROM monitoring_records WHERE clinical_status = 'Red Alert' AND date(timestamp) = date('now')"
    );

    const refuseMedsCount = await first<{ count: number }>(
      "SELECT COUNT(DISTINCT patient_id) as count FROM monitoring_records WHERE medication_intake = 'REFUSE' AND date(timestamp) = date('now')"
    );

    const poorAppetiteCount = await first<{ count: number }>(
      "SELECT COUNT(DISTINCT patient_id) as count FROM monitoring_records WHERE appetite = 'POOR' AND date(timestamp) = date('now')"
    );

    // 6. Shift Updates Today
    const amUpdatesToday = await first<{ count: number }>(
      "SELECT COUNT(*) as count FROM monitoring_records WHERE (shift LIKE 'Morning%' OR shift LIKE 'AM%') AND date(timestamp) = date('now')"
    );

    const pmUpdatesToday = await first<{ count: number }>(
      "SELECT COUNT(*) as count FROM monitoring_records WHERE (shift LIKE 'Petang%' OR shift LIKE 'PM%') AND date(timestamp) = date('now')"
    );

    const nightUpdatesToday = await first<{ count: number }>(
      "SELECT COUNT(*) as count FROM monitoring_records WHERE shift LIKE 'Night%' AND date(timestamp) = date('now')"
    );

    // 7. Average Length of Stay for Active Admissions (Days)
    const avgStay = await first<{ avg_days: number }>(
      "SELECT AVG(julianday('now') - julianday(admission_date)) as avg_days FROM admissions WHERE lifecycle_status = 'Active'"
    );

    // 8. Recent 5 Monitoring Activities
    const recentActivities = await all(
      `SELECT m.*, p.full_name as patient_name, p.mrn, p.zone, p.room_bed
       FROM monitoring_records m
       JOIN patients p ON m.patient_id = p.id
       ORDER BY m.timestamp DESC LIMIT 5`
    );

    return res.json({
      total_active_patients: activePatientsCount?.count || 0,
      male_zone_count: maleZoneCount?.count || 0,
      female_zone_count: femaleZoneCount?.count || 0,
      new_admissions_7d: newAdmissionsCount?.count || 0,
      discharges_total: dischargesCount?.count || 0,
      alerts: {
        red_alert_today: redAlertCount?.count || 0,
        refuse_meds_today: refuseMedsCount?.count || 0,
        poor_appetite_today: poorAppetiteCount?.count || 0,
      },
      updates_today: {
        am_shift: amUpdatesToday?.count || 0,
        pm_shift: pmUpdatesToday?.count || 0,
        night_shift: nightUpdatesToday?.count || 0,
        total: (amUpdatesToday?.count || 0) + (pmUpdatesToday?.count || 0) + (nightUpdatesToday?.count || 0),
      },
      avg_length_of_stay: Math.round(avgStay?.avg_days || 0),
      recent_activities: recentActivities,
    });
  } catch (err: any) {
    console.error('Error fetching dashboard summary:', err);
    return res.status(500).json({ error: 'Gagal mendapatkan ringkasan papan pemuka.' });
  }
});

// ==========================================
// 3. PATIENTS & ADMISSIONS
// ==========================================

apiRouter.get('/patients', requireAuth, async (req: Request, res: Response) => {
  const { search, zone, status, kanban_stage } = req.query;

  try {
    let query = `
      SELECT p.*,
             a.id as admission_id,
             a.admission_number,
             a.admission_date,
             a.admission_time,
             a.lifecycle_status,
             a.kanban_stage,
             a.tca_date,
             a.tca_location,
             a.tca_remarks,
             CAST(julianday(COALESCE(d.discharge_date, 'now')) - julianday(a.admission_date) AS INTEGER) as length_of_stay,
             (SELECT clinical_status FROM monitoring_records WHERE patient_id = p.id ORDER BY timestamp DESC LIMIT 1) as latest_clinical_status,
             (SELECT blood_pressure FROM monitoring_records WHERE patient_id = p.id ORDER BY timestamp DESC LIMIT 1) as latest_bp,
             (SELECT pulse_rate FROM monitoring_records WHERE patient_id = p.id ORDER BY timestamp DESC LIMIT 1) as latest_pulse,
             (SELECT temperature FROM monitoring_records WHERE patient_id = p.id ORDER BY timestamp DESC LIMIT 1) as latest_temp,
             (SELECT spo2 FROM monitoring_records WHERE patient_id = p.id ORDER BY timestamp DESC LIMIT 1) as latest_spo2,
             (SELECT appetite FROM monitoring_records WHERE patient_id = p.id ORDER BY timestamp DESC LIMIT 1) as latest_appetite,
             (SELECT medication_intake FROM monitoring_records WHERE patient_id = p.id ORDER BY timestamp DESC LIMIT 1) as latest_med_status,
             (SELECT timestamp FROM monitoring_records WHERE patient_id = p.id ORDER BY timestamp DESC LIMIT 1) as latest_monitoring_time,
             (SELECT nurse_advice FROM monitoring_records WHERE patient_id = p.id ORDER BY timestamp DESC LIMIT 1) as latest_nurse_advice,
             (SELECT diet_plan FROM monitoring_records WHERE patient_id = p.id ORDER BY timestamp DESC LIMIT 1) as latest_diet_plan
      FROM patients p
      LEFT JOIN admissions a ON a.patient_id = p.id AND a.lifecycle_status = 'Active'
      LEFT JOIN discharge_records d ON d.admission_id = a.id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (zone) {
      query += ` AND p.zone = ?`;
      params.push(zone);
    }

    if (status) {
      query += ` AND p.status = ?`;
      params.push(status);
    } else {
      // By default show active unless specifically requested
      query += ` AND p.status = 'Active'`;
    }

    if (kanban_stage) {
      query += ` AND a.kanban_stage = ?`;
      params.push(kanban_stage);
    }

    if (search) {
      query += ` AND (p.full_name LIKE ? OR p.mrn LIKE ? OR p.room_bed LIKE ? OR p.primary_diagnosis LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ` ORDER BY p.room_bed ASC, p.created_at DESC`;

    const patients = await all(query, params);
    return res.json({ patients });
  } catch (err: any) {
    console.error('Error listing patients:', err);
    return res.status(500).json({ error: 'Gagal memuat senarai pesakit.' });
  }
});

apiRouter.get('/patients/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const patient = await first('SELECT * FROM patients WHERE id = ?', [id]);
    if (!patient) {
      return res.status(404).json({ error: 'Rekod pesakit tidak dijumpai.' });
    }

    const admissions = await all(
      `SELECT a.*, u.full_name as admitted_by_name
       FROM admissions a
       LEFT JOIN users u ON a.admitted_by = u.id
       WHERE a.patient_id = ?
       ORDER BY a.admission_date DESC`,
      [id]
    );

    const monitoring = await all(
      `SELECT * FROM monitoring_records WHERE patient_id = ? ORDER BY timestamp DESC`,
      [id]
    );

    const discharge = await first(
      `SELECT d.*, u.full_name as discharged_by_name
       FROM discharge_records d
       LEFT JOIN users u ON d.discharged_by = u.id
       WHERE d.patient_id = ?
       ORDER BY d.discharge_date DESC LIMIT 1`,
      [id]
    );

    return res.json({
      patient,
      admissions,
      monitoring,
      discharge,
    });
  } catch (err: any) {
    console.error('Error fetching patient details:', err);
    return res.status(500).json({ error: 'Gagal memuatkan butiran pesakit.' });
  }
});

apiRouter.post('/patients', requireAuth, async (req: Request, res: Response) => {
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
  } = req.body || {};

  if (!full_name || !gender || !zone || !primary_diagnosis) {
    return res.status(400).json({ error: 'Sila lengkapkan nama pesakit, jantina, zon (lelaki/perempuan) dan diagnosis utama.' });
  }

  try {
    // 1. Auto generate Patient MRN: PT-001, PT-002...
    const countRecord = await first<{ count: number }>('SELECT COUNT(*) as count FROM patients');
    const nextSeq = (countRecord?.count || 0) + 1;
    const mrn = `PT-${String(nextSeq).padStart(3, '0')}`;

    const patientId = 'pt_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const admissionId = 'adm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const admNumber = `ADM-${new Date().getFullYear()}-${String(nextSeq).padStart(3, '0')}`;

    const admDate = admission_date || new Date().toISOString().split('T')[0];
    const admTime = admission_time || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    // Insert Patient
    await run(
      `INSERT INTO patients (
        id, mrn, full_name, gender, age, date_of_birth, zone, room_bed,
        primary_diagnosis, prescribed_medications, follow_up_facility,
        emergency_contact_name, emergency_contact_phone, care_level,
        baseline_mobility, feeding_method, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', datetime('now'), datetime('now'))`,
      [
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
        feeding_method || 'Oral',
      ]
    );

    // Insert Initial Admission
    await run(
      `INSERT INTO admissions (
        id, patient_id, admission_number, admission_date, admission_time, zone, room_bed,
        admitted_by, lifecycle_status, kanban_stage, admission_remarks, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active', 'New Admission', ?, datetime('now'), datetime('now'))`,
      [
        admissionId,
        patientId,
        admNumber,
        admDate,
        admTime,
        zone,
        room_bed || null,
        req.user!.id,
        admission_remarks || 'Pendaftaran kemasukan pesakit baru.',
      ]
    );

    await logAudit(
      req.user!,
      'CREATE_PATIENT',
      'patients',
      patientId,
      `Mendaftarkan pesakit ${full_name} (${mrn}) di ${zone} - ${room_bed || 'Tanpa Katil'}.`
    );

    return res.status(201).json({
      success: true,
      message: 'Pesakit berjaya didaftarkan.',
      patientId,
      mrn,
    });
  } catch (err: any) {
    console.error('Error creating patient:', err);
    return res.status(500).json({ error: 'Gagal mendaftarkan pesakit baru.' });
  }
});

apiRouter.patch('/patients/:id', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body || {};

  try {
    const existing = await first('SELECT * FROM patients WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Pesakit tidak dijumpai.' });
    }

    const fields: string[] = [];
    const values: any[] = [];

    const allowed = [
      'full_name',
      'gender',
      'age',
      'date_of_birth',
      'zone',
      'room_bed',
      'primary_diagnosis',
      'prescribed_medications',
      'follow_up_facility',
      'emergency_contact_name',
      'emergency_contact_phone',
      'care_level',
      'baseline_mobility',
      'feeding_method',
    ];

    for (const key of allowed) {
      if (updates[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Tiada medan untuk dikemas kini.' });
    }

    fields.push("updated_at = datetime('now')");
    values.push(id);

    await run(`UPDATE patients SET ${fields.join(', ')} WHERE id = ?`, values);

    // Also update room_bed/zone in active admission if changed
    if (updates.zone || updates.room_bed) {
      await run(
        `UPDATE admissions SET zone = COALESCE(?, zone), room_bed = COALESCE(?, room_bed), updated_at = datetime('now')
         WHERE patient_id = ? AND lifecycle_status = 'Active'`,
        [updates.zone || null, updates.room_bed || null, id]
      );
    }

    await logAudit(
      req.user!,
      'UPDATE_PATIENT',
      'patients',
      id,
      `Mengemas kini profil pesakit ${existing.full_name} (${existing.mrn}).`
    );

    return res.json({ success: true, message: 'Maklumat pesakit berjaya dikemaskini.' });
  } catch (err: any) {
    console.error('Error updating patient:', err);
    return res.status(500).json({ error: 'Gagal mengemaskini maklumat pesakit.' });
  }
});

apiRouter.patch('/admissions/:id/stage', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { kanban_stage } = req.body || {};

  const allowedStages = [
    'New Admission',
    'Hospitalisation',
    'Red Alert',
    'TCA',
    'Home Leave',
    'Refuse Medication',
    'Discharged',
  ];

  if (!allowedStages.includes(kanban_stage)) {
    return res.status(400).json({ error: 'Peringkat Kanban tidak sah.' });
  }

  try {
    const admission = await first<{ patient_id: string; kanban_stage: string }>(
      'SELECT patient_id, kanban_stage FROM admissions WHERE id = ?',
      [id]
    );

    if (!admission) {
      return res.status(404).json({ error: 'Rekod kemasukan tidak dijumpai.' });
    }

    await run("UPDATE admissions SET kanban_stage = ?, updated_at = datetime('now') WHERE id = ?", [
      kanban_stage,
      id,
    ]);

    await logAudit(
      req.user!,
      'UPDATE_KANBAN_STAGE',
      'admissions',
      id,
      `Menukar fasa Kanban daripada ${admission.kanban_stage} kepada ${kanban_stage}.`
    );

    return res.json({ success: true, message: `Fasa dikemaskini kepada ${kanban_stage}.` });
  } catch (err: any) {
    console.error('Error updating kanban stage:', err);
    return res.status(500).json({ error: 'Gagal mengemas kini peringkat Kanban.' });
  }
});

// Update TCA (To Come Again / Temujanji Hospital) details
apiRouter.patch('/admissions/:id/tca', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { tca_date, tca_location, tca_remarks, set_stage_tca } = req.body || {};

  try {
    const admission = await first<{ patient_id: string; kanban_stage: string }>(
      'SELECT patient_id, kanban_stage FROM admissions WHERE id = ?',
      [id]
    );

    if (!admission) {
      return res.status(404).json({ error: 'Rekod kemasukan tidak dijumpai.' });
    }

    const updates: string[] = ['tca_date = ?', 'tca_location = ?', 'tca_remarks = ?'];
    const params: any[] = [tca_date || null, tca_location || null, tca_remarks || null];

    if (set_stage_tca) {
      updates.push("kanban_stage = 'TCA'");
    }
    updates.push("updated_at = datetime('now')");
    params.push(id);

    await run(`UPDATE admissions SET ${updates.join(', ')} WHERE id = ?`, params);

    await logAudit(
      req.user!,
      'UPDATE_TCA_SCHEDULE',
      'admissions',
      id,
      `Mengemaskini jadual TCA: ${tca_date || 'Tiada tarikh'} di ${tca_location || 'Hospital'}.`
    );

    return res.json({ success: true, message: 'Maklumat temujanji TCA berjaya dikemaskini.' });
  } catch (err: any) {
    console.error('Error updating TCA details:', err);
    return res.status(500).json({ error: 'Gagal mengemaskini maklumat temujanji TCA.' });
  }
});

// ==========================================
// 4. MONITORING RECORDS (DAPUD)
// ==========================================

apiRouter.post('/monitoring', requireAuth, async (req: Request, res: Response) => {
  const {
    admission_id,
    patient_id,
    shift,
    clinical_status,
    blood_pressure,
    pulse_rate,
    temperature,
    spo2,
    blood_sugar,
    pain_level,
    general_condition,
    consciousness,
    mobility_status,
    appetite,
    urine_output,
    urine_other,
    bowel_movement,
    medication_intake,
    hygiene_care,
    feeding_care,
    wound_dressing,
    repositioning,
    mobilisation,
    nursing_report,
    rehab_assessment,
    visitor_log,
    // PDF Additions
    diet_plan,
    tube_has_ngt,
    tube_has_cbd,
    tube_type,
    tube_material,
    tube_replacement_date,
    tube_size,
    patient_behavior,
    attachment_image,
    nurse_advice,
  } = req.body || {};

  if (!patient_id || !shift) {
    return res.status(400).json({ error: 'Sila pilih pesakit dan syif pemantauan.' });
  }

  // Validate shift selection (3 shifts)
  const validShifts = [
    'Morning (7:00am-5:00pm)',
    'Petang (2:00pm-12:00am)',
    'Night (9:00pm-7:00am)',
    'AM (7:00-5:00)',
    'PM (5:00-9:00)',
  ];
  if (!validShifts.includes(shift)) {
    return res.status(400).json({
      error: 'Syif tidak sah. Pilihan: Morning (7:00am-5:00pm), Petang (2:00pm-12:00am), Night (9:00pm-7:00am).',
    });
  }

  // Mandatory Vitals on Morning/AM and Night shifts
  const isVitalShift = shift.startsWith('AM') || shift.startsWith('Morning') || shift.startsWith('Night');
  if (isVitalShift && (!blood_pressure || !pulse_rate || !temperature || !spo2)) {
    return res.status(400).json({
      error: 'Bagi syif Morning dan Night, pemeriksaan tanda vital (BP, Nadi, Suhu, SpO2) adalah wajib.',
    });
  }

  try {
    // Resolve admission_id if not explicitly provided
    let activeAdmissionId = admission_id;
    if (!activeAdmissionId) {
      const activeAdm = await first<{ id: string }>(
        "SELECT id FROM admissions WHERE patient_id = ? AND lifecycle_status = 'Active' ORDER BY admission_date DESC LIMIT 1",
        [patient_id]
      );
      if (!activeAdm) {
        return res.status(400).json({ error: 'Pesakit tiada rekod kemasukan aktif.' });
      }
      activeAdmissionId = activeAdm.id;
    }

    const monitoringId = 'mon_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    // Auto-detect Red Alert based on vital thresholds or explicit selection
    let evaluatedClinicalStatus = clinical_status || 'Stable';
    if (temperature && Number(temperature) >= 38.0) evaluatedClinicalStatus = 'Red Alert';
    if (spo2 && Number(spo2) < 92) evaluatedClinicalStatus = 'Red Alert';
    if (pulse_rate && (Number(pulse_rate) > 120 || Number(pulse_rate) < 50)) evaluatedClinicalStatus = 'Red Alert';

    const normalizedAppetite = appetite ? String(appetite).toUpperCase() : 'GOOD';
    const validAppetite = ['GOOD', 'FAIR', 'POOR'].includes(normalizedAppetite) ? normalizedAppetite : 'GOOD';

    await run(
      `INSERT INTO monitoring_records (
        id, admission_id, patient_id, staff_user_id, staff_name, timestamp, shift,
        clinical_status, blood_pressure, pulse_rate, temperature, spo2, blood_sugar, pain_level,
        general_condition, consciousness, mobility_status, appetite, urine_output, urine_other, bowel_movement,
        medication_intake, hygiene_care, feeding_care, wound_dressing, repositioning, mobilisation,
        nursing_report, rehab_assessment, visitor_log,
        diet_plan, tube_has_ngt, tube_has_cbd, tube_type, tube_material, tube_replacement_date, tube_size,
        patient_behavior, attachment_image, nurse_advice, created_at
      ) VALUES (
        ?, ?, ?, ?, ?, datetime('now'), ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, datetime('now')
      )`,
      [
        monitoringId,
        activeAdmissionId,
        patient_id,
        req.user!.id,
        req.user!.full_name,
        shift,
        evaluatedClinicalStatus,
        blood_pressure || null,
        pulse_rate ? Number(pulse_rate) : null,
        temperature ? Number(temperature) : null,
        spo2 ? Number(spo2) : null,
        blood_sugar || '-',
        pain_level !== undefined ? Number(pain_level) : 0,
        general_condition || 'Stable',
        consciousness || 'Alert',
        mobility_status || 'Independent',
        validAppetite,
        urine_output || 'Normal',
        urine_other || null,
        bowel_movement !== undefined ? Number(bowel_movement) : 0,
        medication_intake || 'SERVED',
        hygiene_care || 'Normal shower',
        feeding_care || 'DONE',
        wound_dressing || 'N/A',
        repositioning || 'N/A',
        mobilisation || '1',
        nursing_report || null,
        rehab_assessment || null,
        visitor_log || null,
        // PDF Additions
        diet_plan || null,
        tube_has_ngt ? 1 : 0,
        tube_has_cbd ? 1 : 0,
        tube_type || null,
        tube_material || null,
        tube_replacement_date || null,
        tube_size || null,
        patient_behavior || null,
        attachment_image || null,
        nurse_advice || null,
      ]
    );

    // If Red Alert or Refuse Meds, update Kanban Stage accordingly
    if (evaluatedClinicalStatus === 'Red Alert') {
      await run("UPDATE admissions SET kanban_stage = 'Red Alert', updated_at = datetime('now') WHERE id = ?", [
        activeAdmissionId,
      ]);
    } else if (medication_intake === 'REFUSE') {
      await run("UPDATE admissions SET kanban_stage = 'Refuse Medication', updated_at = datetime('now') WHERE id = ?", [
        activeAdmissionId,
      ]);
    }

    const patient = await first<{ full_name: string; mrn: string }>('SELECT full_name, mrn FROM patients WHERE id = ?', [
      patient_id,
    ]);

    await logAudit(
      req.user!,
      'ADD_MONITORING',
      'monitoring_records',
      monitoringId,
      `Merekod pemerhatian ${shift} untuk ${patient?.full_name} (${patient?.mrn}). Status: ${evaluatedClinicalStatus}.`
    );

    return res.status(201).json({
      success: true,
      message: 'Rekod pemerhatian berjaya disimpan.',
      monitoringId,
      clinicalStatus: evaluatedClinicalStatus,
    });
  } catch (err: any) {
    console.error('Error saving monitoring record:', err);
    return res.status(500).json({ error: 'Gagal menyimpan rekod pemantauan.' });
  }
});

// ==========================================
// 5. DISCHARGE WORKFLOW (Direct Processing)
// ==========================================

apiRouter.post('/admissions/:id/discharge', requireAuth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { discharge_destination, discharge_summary, emergency_contact_notified, medications_given } = req.body || {};

  try {
    const admission = await first<{ patient_id: string; lifecycle_status: string }>(
      'SELECT patient_id, lifecycle_status FROM admissions WHERE id = ?',
      [id]
    );

    if (!admission) {
      return res.status(404).json({ error: 'Rekod kemasukan tidak dijumpai.' });
    }

    if (admission.lifecycle_status === 'Discharged') {
      return res.status(400).json({ error: 'Pesakit ini telah pun didiscaj sebelum ini.' });
    }

    const dischargeId = 'dis_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const now = new Date();
    const dischargeDate = now.toISOString().split('T')[0];
    const dischargeTime = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    // 1. Create Discharge Record
    await run(
      `INSERT INTO discharge_records (
        id, admission_id, patient_id, discharge_date, discharge_time, discharged_by,
        discharge_destination, discharge_summary, emergency_contact_notified, medications_given, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        dischargeId,
        id,
        admission.patient_id,
        dischargeDate,
        dischargeTime,
        req.user!.id,
        discharge_destination || 'Home',
        discharge_summary || 'Pesakit discaj dalam keadaan stabil mengikut prosedur.',
        emergency_contact_notified ? 1 : 0,
        medications_given || null,
      ]
    );

    // 2. Update Admission Lifecycle & Kanban Stage
    await run(
      "UPDATE admissions SET lifecycle_status = 'Discharged', kanban_stage = 'Discharged', updated_at = datetime('now') WHERE id = ?",
      [id]
    );

    // 3. Update Patient Status
    await run("UPDATE patients SET status = 'Discharged', updated_at = datetime('now') WHERE id = ?", [
      admission.patient_id,
    ]);

    const patient = await first<{ full_name: string; mrn: string }>('SELECT full_name, mrn FROM patients WHERE id = ?', [
      admission.patient_id,
    ]);

    await logAudit(
      req.user!,
      'DISCHARGE_PATIENT',
      'discharge_records',
      dischargeId,
      `Memproses discaj bagi pesakit ${patient?.full_name} (${patient?.mrn}) ke ${discharge_destination || 'Rumah'}.`
    );

    return res.json({
      success: true,
      message: `Pesakit ${patient?.full_name} berjaya didiscaj.`,
      dischargeId,
    });
  } catch (err: any) {
    console.error('Error discharging patient:', err);
    return res.status(500).json({ error: 'Gagal memproses pelepasan pesakit.' });
  }
});

// ==========================================
// 6. STAFF MANAGEMENT (Admin Only)
// ==========================================

apiRouter.get('/staff', requireAdmin, async (req: Request, res: Response) => {
  try {
    const staff = await all(
      'SELECT id, username, full_name, role, status, must_change_passcode, created_at, last_login_at FROM users ORDER BY created_at DESC'
    );
    return res.json({ staff });
  } catch (err: any) {
    console.error('Error listing staff:', err);
    return res.status(500).json({ error: 'Gagal memuat senarai staf.' });
  }
});

apiRouter.post('/staff', requireAdmin, async (req: Request, res: Response) => {
  const { username, full_name, role, temporary_passcode } = req.body || {};

  if (!username || !full_name || !role || !temporary_passcode) {
    return res.status(400).json({ error: 'Sila lengkapkan nama pengguna, nama penuh, peranan dan kata laluan sementara.' });
  }

  if (temporary_passcode.length < 6) {
    return res.status(400).json({ error: 'Kata laluan sementara mestilah sekurang-kurangnya 6 aksara.' });
  }

  try {
    const existing = await first('SELECT id FROM users WHERE LOWER(username) = LOWER(?)', [username.trim()]);
    if (existing) {
      return res.status(400).json({ error: 'Nama pengguna ini telah digunakan.' });
    }

    const salt = generateSalt();
    const hash = hashPasscode(temporary_passcode, salt);
    const id = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    await run(
      `INSERT INTO users (id, username, full_name, role, passcode_hash, passcode_salt, status, must_change_passcode, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', 1, datetime('now'), datetime('now'))`,
      [id, username.trim().toLowerCase(), full_name.trim(), role, hash, salt]
    );

    await logAudit(
      req.user!,
      'CREATE_STAFF',
      'users',
      id,
      `Mencipta akaun staf ${username} (${role} - ${full_name}).`
    );

    return res.status(201).json({ success: true, message: 'Akaun staf berjaya dicipta.' });
  } catch (err: any) {
    console.error('Error creating staff account:', err);
    return res.status(500).json({ error: 'Gagal mencipta akaun staf.' });
  }
});

apiRouter.post('/staff/:id/reset-passcode', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { temporary_passcode } = req.body || {};

  if (!temporary_passcode || temporary_passcode.length < 6) {
    return res.status(400).json({ error: 'Kata laluan sementara baharu mestilah sekurang-kurangnya 6 aksara.' });
  }

  try {
    const user = await first<{ username: string; full_name: string }>('SELECT username, full_name FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({ error: 'Akaun staf tidak dijumpai.' });
    }

    const salt = generateSalt();
    const hash = hashPasscode(temporary_passcode, salt);

    await run(
      "UPDATE users SET passcode_hash = ?, passcode_salt = ?, must_change_passcode = 1, updated_at = datetime('now') WHERE id = ?",
      [hash, salt, id]
    );

    // Invalidate existing sessions
    await run('DELETE FROM sessions WHERE user_id = ?', [id]);

    await logAudit(
      req.user!,
      'RESET_STAFF_PASSCODE',
      'users',
      id,
      `Mereset kata laluan untuk ${user.username} dan membatalkan semua sesi aktif.`
    );

    return res.json({ success: true, message: `Kata laluan bagi ${user.username} berjaya direset.` });
  } catch (err: any) {
    console.error('Error resetting passcode:', err);
    return res.status(500).json({ error: 'Gagal menetapkan semula kata laluan.' });
  }
});

apiRouter.post('/staff/:id/toggle-status', requireAdmin, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const user = await first<{ id: string; username: string; role: string; status: string }>(
      'SELECT id, username, role, status FROM users WHERE id = ?',
      [id]
    );

    if (!user) {
      return res.status(404).json({ error: 'Staf tidak dijumpai.' });
    }

    // Protect against deactivating the last active admin
    if (user.role === 'admin' && user.status === 'active') {
      const activeAdmins = await first<{ count: number }>(
        "SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND status = 'active'"
      );
      if ((activeAdmins?.count || 0) <= 1) {
        return res.status(400).json({ error: 'Sistem mesti mempunyai sekurang-kurangnya satu Pentadbir aktif.' });
      }
    }

    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    await run("UPDATE users SET status = ?, updated_at = datetime('now') WHERE id = ?", [newStatus, id]);

    if (newStatus === 'inactive') {
      await run('DELETE FROM sessions WHERE user_id = ?', [id]);
    }

    await logAudit(
      req.user!,
      'TOGGLE_STAFF_STATUS',
      'users',
      id,
      `Menukar status staf ${user.username} kepada ${newStatus}.`
    );

    return res.json({ success: true, message: `Status staf ditukar kepada ${newStatus}.`, newStatus });
  } catch (err: any) {
    console.error('Error toggling staff status:', err);
    return res.status(500).json({ error: 'Gagal menukar status akaun staf.' });
  }
});

// ==========================================
// 7. AUDIT LOGS (Admin Only)
// ==========================================

apiRouter.get('/audit-logs', requireAdmin, async (req: Request, res: Response) => {
  try {
    const logs = await all('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 150');
    return res.json({ logs });
  } catch (err: any) {
    console.error('Error fetching audit logs:', err);
    return res.status(500).json({ error: 'Gagal memuat log audit.' });
  }
});

// ==========================================
// 8. REPORTS & CSV EXPORT
// ==========================================

apiRouter.get('/reports/export-csv', requireAuth, async (req: Request, res: Response) => {
  const { type } = req.query; // 'admissions', 'monitoring', 'discharges'

  try {
    let filename = `convee_report_${Date.now()}.csv`;
    let csvContent = '';

    if (type === 'monitoring') {
      filename = `convee_dapud_monitoring_${Date.now()}.csv`;
      const rows = await all(`
        SELECT m.timestamp, m.shift, m.staff_name, p.full_name as patient_name, p.age,
               p.primary_diagnosis, a.admission_date,
               CAST(julianday('now') - julianday(a.admission_date) AS INTEGER) as length_of_stay,
               m.clinical_status, m.blood_pressure, m.pulse_rate, m.temperature, m.spo2,
               m.blood_sugar, m.pain_level, m.general_condition, m.consciousness, m.mobility_status,
               m.appetite, m.urine_output, m.bowel_movement, m.medication_intake, m.hygiene_care,
               m.feeding_care, m.wound_dressing, m.repositioning, m.mobilisation, m.nursing_report
        FROM monitoring_records m
        JOIN patients p ON m.patient_id = p.id
        JOIN admissions a ON m.admission_id = a.id
        ORDER BY m.timestamp DESC
      `);

      const headers = [
        'Timestamp',
        'Shift',
        'Staff Name',
        'Patient Name',
        'Age',
        'Illness/Diagnosis',
        'DOA',
        'Length of Stay (Days)',
        'Patient Status',
        'Blood Pressure',
        'Pulse',
        'Temperature',
        'SPO2',
        'Blood Sugar',
        'Pain Level',
        'General Condition',
        'Consciousness',
        'Mobility',
        'Appetite',
        'Urine',
        'Bowel',
        'Medication Intake',
        'Hygiene Care',
        'Feeding Care',
        'Wound Dressing',
        'Repositioning',
        'Mobilisation',
        'Nursing Report',
      ];

      csvContent = headers.join(',') + '\n';
      for (const r of rows) {
        const rowVals = [
          `"${r.timestamp || ''}"`,
          `"${r.shift || ''}"`,
          `"${r.staff_name || ''}"`,
          `"${r.patient_name || ''}"`,
          r.age || '',
          `"${(r.primary_diagnosis || '').replace(/"/g, '""')}"`,
          `"${r.admission_date || ''}"`,
          r.length_of_stay || '',
          `"${r.clinical_status || ''}"`,
          `"${r.blood_pressure || ''}"`,
          r.pulse_rate || '',
          r.temperature || '',
          r.spo2 || '',
          `"${r.blood_sugar || ''}"`,
          r.pain_level || 0,
          `"${r.general_condition || ''}"`,
          `"${r.consciousness || ''}"`,
          `"${r.mobility_status || ''}"`,
          `"${r.appetite || ''}"`,
          `"${r.urine_output || ''}"`,
          r.bowel_movement || 0,
          `"${r.medication_intake || ''}"`,
          `"${r.hygiene_care || ''}"`,
          `"${r.feeding_care || ''}"`,
          `"${r.wound_dressing || ''}"`,
          `"${r.repositioning || ''}"`,
          `"${r.mobilisation || ''}"`,
          `"${(r.nursing_report || '').replace(/"/g, '""')}"`,
        ];
        csvContent += rowVals.join(',') + '\n';
      }
    } else {
      // Patients / Admissions Report
      filename = `convee_patients_admissions_${Date.now()}.csv`;
      const rows = await all(`
        SELECT p.mrn, p.full_name, p.gender, p.age, p.zone, p.room_bed, p.primary_diagnosis,
               p.prescribed_medications, p.follow_up_facility, p.emergency_contact_name,
               p.emergency_contact_phone, a.admission_date, a.lifecycle_status, a.kanban_stage,
               CAST(julianday(COALESCE(d.discharge_date, 'now')) - julianday(a.admission_date) AS INTEGER) as length_of_stay,
               d.discharge_date, d.discharge_destination
        FROM patients p
        LEFT JOIN admissions a ON a.patient_id = p.id
        LEFT JOIN discharge_records d ON d.admission_id = a.id
        ORDER BY p.mrn ASC
      `);

      const headers = [
        'Patient ID (MRN)',
        'Patient Name',
        'Gender',
        'Age',
        'Zone',
        'Room/Bed',
        'Main Diagnosis',
        'Medications',
        'Follow Up Facility',
        'Emergency Contact',
        'Phone',
        'Admission Date',
        'Status',
        'Kanban Stage',
        'Length of Stay',
        'Discharge Date',
        'Discharge Destination',
      ];

      csvContent = headers.join(',') + '\n';
      for (const r of rows) {
        const rowVals = [
          `"${r.mrn || ''}"`,
          `"${r.full_name || ''}"`,
          `"${r.gender || ''}"`,
          r.age || '',
          `"${r.zone || ''}"`,
          `"${r.room_bed || ''}"`,
          `"${(r.primary_diagnosis || '').replace(/"/g, '""')}"`,
          `"${(r.prescribed_medications || '').replace(/"/g, '""')}"`,
          `"${(r.follow_up_facility || '').replace(/"/g, '""')}"`,
          `"${(r.emergency_contact_name || '').replace(/"/g, '""')}"`,
          `"${r.emergency_contact_phone || ''}"`,
          `"${r.admission_date || ''}"`,
          `"${r.lifecycle_status || ''}"`,
          `"${r.kanban_stage || ''}"`,
          r.length_of_stay || '',
          `"${r.discharge_date || ''}"`,
          `"${r.discharge_destination || ''}"`,
        ];
        csvContent += rowVals.join(',') + '\n';
      }
    }

    await logAudit(req.user!, 'EXPORT_REPORT', 'reports', null, `Mengeksport laporan CSV jenis ${type || 'patients'}.`);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csvContent);
  } catch (err: any) {
    console.error('Error generating report CSV:', err);
    return res.status(500).json({ error: 'Gagal menjana laporan CSV.' });
  }
});

// ==========================================
// 8. PATIENT INVENTORY & WEEKLY STOCK CHECK
// ==========================================

const STANDARD_PERSONAL_ITEMS = [
  'Diaper',
  'Wet Tissue',
  'Tissue',
  'Underpad',
  'Adult Wipes',
  'Gloves',
  'Lotion / Cream',
  'Milk',
  'Dressing item',
  'Toiletries',
  'Shaver',
  'Tooth Brush',
  'Tube',
  'Snacking Food',
];

// 8.1 Summary KPI & Urgent Restock Alerts
apiRouter.get('/inventory/summary', requireAuth, async (_req: Request, res: Response) => {
  try {
    const totalPatientsRow = await first<{ cnt: number }>('SELECT COUNT(DISTINCT patient_id) as cnt FROM patient_inventory_items');
    const totalItemsRow = await first<{ cnt: number }>('SELECT COUNT(*) as cnt FROM patient_inventory_items');
    const totalRestockRow = await first<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM patient_inventory_items WHERE stock_necessity = 'YES'"
    );
    const personalRestockRow = await first<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM patient_inventory_items WHERE stock_necessity = 'YES' AND category = 'personal'"
    );
    const medsRestockRow = await first<{ cnt: number }>(
      "SELECT COUNT(*) as cnt FROM patient_inventory_items WHERE stock_necessity = 'YES' AND category = 'medication'"
    );

    const urgentAlerts = await all<{
      patient_id: string;
      patient_name: string;
      room_bed: string;
      item_name: string;
      category: 'personal' | 'medication';
      stock_balance: string;
      remark: string;
    }>(
      `SELECT i.patient_id, p.full_name as patient_name, p.room_bed, i.item_name, i.category, i.stock_balance, i.remark
       FROM patient_inventory_items i
       JOIN patients p ON p.id = i.patient_id
       WHERE i.stock_necessity = 'YES'
       ORDER BY i.category DESC, p.full_name ASC`
    );

    return res.json({
      total_patients: totalPatientsRow?.cnt || 0,
      total_items_tracked: totalItemsRow?.cnt || 0,
      total_restock_needed: totalRestockRow?.cnt || 0,
      personal_restock_needed: personalRestockRow?.cnt || 0,
      meds_restock_needed: medsRestockRow?.cnt || 0,
      urgent_alerts: urgentAlerts,
    });
  } catch (err: any) {
    console.error('Error fetching inventory summary:', err);
    return res.status(500).json({ error: 'Gagal mendapatkan ringkasan inventori.' });
  }
});

// 8.2 Get or Auto-Initialize Patient Inventory Sheet
apiRouter.get('/inventory/patient/:patientId', requireAuth, async (req: Request, res: Response) => {
  const { patientId } = req.params;

  try {
    const patient = await first<any>('SELECT * FROM patients WHERE id = ?', [patientId]);
    if (!patient) {
      return res.status(404).json({ error: 'Pesakit tidak dijumpai.' });
    }

    let items = await all<any>(
      'SELECT * FROM patient_inventory_items WHERE patient_id = ? ORDER BY category ASC, item_order ASC, item_name ASC',
      [patientId]
    );

    // Auto-seed standard personal items if patient has none yet
    const hasPersonal = items.some((i) => i.category === 'personal');
    if (!hasPersonal) {
      for (let idx = 0; idx < STANDARD_PERSONAL_ITEMS.length; idx++) {
        const itemName = STANDARD_PERSONAL_ITEMS[idx];
        const itemId = 'inv_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
        await run(
          `INSERT INTO patient_inventory_items (id, patient_id, category, item_order, item_name, stock_balance, stock_necessity, restock_date, restock_qty, remark)
           VALUES (?, ?, 'personal', ?, ?, 'Cukup', 'NO', '', '', '')`,
          [itemId, patientId, idx + 1, itemName]
        );
      }
    }

    // Auto-seed prescribed medications if patient has prescribed_medications and no medication items yet
    const hasMeds = items.some((i) => i.category === 'medication');
    if (!hasMeds && patient.prescribed_medications) {
      const medList = patient.prescribed_medications
        .split(/[,;\n]+/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);

      for (let idx = 0; idx < medList.length; idx++) {
        const medName = medList[idx];
        const itemId = 'inv_m_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
        await run(
          `INSERT INTO patient_inventory_items (id, patient_id, category, item_order, item_name, stock_balance, stock_necessity, restock_date, restock_qty, remark)
           VALUES (?, ?, 'medication', ?, ?, '14 tab', 'NO', '', '', 'Mencukupi')`,
          [itemId, patientId, idx + 1, medName]
        );
      }
    }

    // Re-fetch all items after auto-seed
    items = await all<any>(
      'SELECT * FROM patient_inventory_items WHERE patient_id = ? ORDER BY category ASC, item_order ASC, item_name ASC',
      [patientId]
    );

    const personalItems = items.filter((i) => i.category === 'personal');
    const medicationItems = items.filter((i) => i.category === 'medication');

    // Get latest weekly check
    const latestCheck = await first<any>(
      'SELECT * FROM patient_inventory_checks WHERE patient_id = ? ORDER BY check_date DESC, created_at DESC LIMIT 1',
      [patientId]
    );

    // Get recent check history
    const checkHistory = await all<any>(
      'SELECT * FROM patient_inventory_checks WHERE patient_id = ? ORDER BY check_date DESC LIMIT 10',
      [patientId]
    );

    return res.json({
      patient,
      personal_items: personalItems,
      medication_items: medicationItems,
      latest_check: latestCheck,
      check_history: checkHistory,
    });
  } catch (err: any) {
    console.error('Error fetching patient inventory:', err);
    return res.status(500).json({ error: 'Gagal memuatkan data inventori pesakit.' });
  }
});

// 8.3 Update an inventory item
apiRouter.put('/inventory/items/:itemId', requireAuth, async (req: Request, res: Response) => {
  const { itemId } = req.params;
  const { stock_balance, stock_necessity, restock_date, restock_qty, remark, item_name, image_url } = req.body || {};

  try {
    const existing = await first<any>('SELECT * FROM patient_inventory_items WHERE id = ?', [itemId]);
    if (!existing) {
      return res.status(404).json({ error: 'Item inventori tidak dijumpai.' });
    }

    await run(
      `UPDATE patient_inventory_items
       SET stock_balance = COALESCE(?, stock_balance),
           stock_necessity = COALESCE(?, stock_necessity),
           restock_date = COALESCE(?, restock_date),
           restock_qty = COALESCE(?, restock_qty),
           remark = COALESCE(?, remark),
           item_name = COALESCE(?, item_name),
           image_url = COALESCE(?, image_url),
           updated_at = datetime('now')
       WHERE id = ?`,
      [
        stock_balance !== undefined ? String(stock_balance) : null,
        stock_necessity || null,
        restock_date !== undefined ? String(restock_date) : null,
        restock_qty !== undefined ? String(restock_qty) : null,
        remark !== undefined ? String(remark) : null,
        item_name || null,
        image_url !== undefined ? image_url : null,
        itemId,
      ]
    );

    await logAudit(
      req.user!,
      'UPDATE_INVENTORY_ITEM',
      'patient_inventory_items',
      itemId,
      `Mengemas kini stok ${existing.item_name}: Baki="${stock_balance}", Perlu="${stock_necessity}".`
    );

    const updated = await first<any>('SELECT * FROM patient_inventory_items WHERE id = ?', [itemId]);
    return res.json({ success: true, item: updated });
  } catch (err: any) {
    console.error('Error updating inventory item:', err);
    return res.status(500).json({ error: 'Gagal mengemas kini item inventori.' });
  }
});

// 8.4 Add new item or medication for a patient
apiRouter.post('/inventory/items', requireAuth, async (req: Request, res: Response) => {
  const {
    patient_id,
    category,
    item_name,
    stock_balance = '0',
    stock_necessity = 'NO',
    restock_date = '',
    restock_qty = '',
    remark = '',
    image_url = null,
  } = req.body || {};

  if (!patient_id || !item_name || !category) {
    return res.status(400).json({ error: 'Sila lengkapkan ID pesakit, nama item dan kategori.' });
  }

  try {
    const itemId = 'inv_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    const maxOrderRow = await first<{ max_order: number }>(
      'SELECT MAX(item_order) as max_order FROM patient_inventory_items WHERE patient_id = ? AND category = ?',
      [patient_id, category]
    );
    const itemOrder = (maxOrderRow?.max_order || 0) + 1;

    await run(
      `INSERT INTO patient_inventory_items (id, patient_id, category, item_order, item_name, stock_balance, stock_necessity, restock_date, restock_qty, remark, image_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        itemId,
        patient_id,
        category,
        itemOrder,
        item_name.trim(),
        String(stock_balance),
        stock_necessity,
        String(restock_date || ''),
        String(restock_qty || ''),
        String(remark || ''),
        image_url || null,
      ]
    );

    await logAudit(
      req.user!,
      'ADD_INVENTORY_ITEM',
      'patient_inventory_items',
      itemId,
      `Menambah item inventori ${item_name} (${category}) untuk pesakit ID ${patient_id}.`
    );

    const newItem = await first<any>('SELECT * FROM patient_inventory_items WHERE id = ?', [itemId]);
    return res.status(201).json({ success: true, item: newItem });
  } catch (err: any) {
    console.error('Error adding inventory item:', err);
    return res.status(500).json({ error: 'Gagal menambah item inventori.' });
  }
});

// 8.5 Delete inventory item
apiRouter.delete('/inventory/items/:itemId', requireAuth, async (req: Request, res: Response) => {
  const { itemId } = req.params;
  try {
    const item = await first<any>('SELECT * FROM patient_inventory_items WHERE id = ?', [itemId]);
    if (!item) {
      return res.status(404).json({ error: 'Item tidak dijumpai.' });
    }

    await run('DELETE FROM patient_inventory_items WHERE id = ?', [itemId]);
    await logAudit(
      req.user!,
      'DELETE_INVENTORY_ITEM',
      'patient_inventory_items',
      itemId,
      `Memadam item inventori ${item.item_name} (${item.category}) bagi pesakit ${item.patient_id}.`
    );

    return res.json({ success: true, message: 'Item berjaya dipadam.' });
  } catch (err: any) {
    console.error('Error deleting inventory item:', err);
    return res.status(500).json({ error: 'Gagal memadam item inventori.' });
  }
});

// 8.6 Record Fast Restock / Topup
apiRouter.post('/inventory/restock', requireAuth, async (req: Request, res: Response) => {
  const { itemId, restockQty, restockDate, newStockBalance, stockNecessity = 'NO', remark } = req.body || {};

  if (!itemId) {
    return res.status(400).json({ error: 'Item ID diperlukan untuk restock.' });
  }

  try {
    const item = await first<any>('SELECT * FROM patient_inventory_items WHERE id = ?', [itemId]);
    if (!item) {
      return res.status(404).json({ error: 'Item tidak dijumpai.' });
    }

    const todayDate = restockDate || new Date().toISOString().split('T')[0];

    await run(
      `UPDATE patient_inventory_items
       SET stock_balance = COALESCE(?, stock_balance),
           stock_necessity = ?,
           restock_date = ?,
           restock_qty = COALESCE(?, restock_qty),
           remark = COALESCE(?, remark),
           updated_at = datetime('now')
       WHERE id = ?`,
      [
        newStockBalance !== undefined ? String(newStockBalance) : null,
        stockNecessity,
        todayDate,
        restockQty !== undefined ? String(restockQty) : null,
        remark !== undefined ? String(remark) : null,
        itemId,
      ]
    );

    await logAudit(
      req.user!,
      'RESTOCK_INVENTORY_ITEM',
      'patient_inventory_items',
      itemId,
      `Restock item ${item.item_name}: Kuantiti ditambah ${restockQty || '-'}, baki baharu ${newStockBalance || item.stock_balance}.`
    );

    const updated = await first<any>('SELECT * FROM patient_inventory_items WHERE id = ?', [itemId]);
    return res.json({ success: true, item: updated });
  } catch (err: any) {
    console.error('Error restocking inventory item:', err);
    return res.status(500).json({ error: 'Gagal merekod penambahan stok.' });
  }
});

// 8.7 Record Complete Weekly Stock Check Session
apiRouter.post('/inventory/checks', requireAuth, async (req: Request, res: Response) => {
  const {
    patient_id,
    check_date,
    personal_staff_name,
    med_staff_name,
    general_remarks,
    items = [],
  } = req.body || {};

  if (!patient_id || !check_date || !personal_staff_name) {
    return res.status(400).json({ error: 'Sila lengkapkan maklumat semakan mingguan (Pesakit, Tarikh, Nama Staf).' });
  }

  try {
    const checkId = 'chk_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
    let totalItems = items.length;
    let totalRestockNeeded = 0;

    for (const it of items) {
      if (it.stock_necessity === 'YES') {
        totalRestockNeeded++;
      }
    }

    await run(
      `INSERT INTO patient_inventory_checks (id, patient_id, check_date, personal_staff_name, med_staff_name, status, total_items, total_restock_needed, general_remarks)
       VALUES (?, ?, ?, ?, ?, 'Completed', ?, ?, ?)`,
      [
        checkId,
        patient_id,
        check_date,
        personal_staff_name.trim(),
        med_staff_name?.trim() || null,
        totalItems,
        totalRestockNeeded,
        general_remarks || null,
      ]
    );

    // Save snapshot of each checked item and update the master item table
    for (const it of items) {
      const detailId = 'det_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
      await run(
        `INSERT INTO patient_inventory_check_details (id, check_id, patient_id, category, item_name, stock_balance, stock_necessity, restock_date, restock_qty, remark)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          detailId,
          checkId,
          patient_id,
          it.category || 'personal',
          it.item_name,
          String(it.stock_balance || '0'),
          it.stock_necessity || 'NO',
          String(it.restock_date || ''),
          String(it.restock_qty || ''),
          String(it.remark || ''),
        ]
      );

      if (it.id) {
        await run(
          `UPDATE patient_inventory_items
           SET stock_balance = ?,
               stock_necessity = ?,
               restock_date = ?,
               restock_qty = ?,
               remark = ?,
               updated_at = datetime('now')
           WHERE id = ?`,
          [
            String(it.stock_balance || '0'),
            it.stock_necessity || 'NO',
            String(it.restock_date || ''),
            String(it.restock_qty || ''),
            String(it.remark || ''),
            it.id,
          ]
        );
      }
    }

    await logAudit(
      req.user!,
      'RECORD_WEEKLY_CHECK',
      'patient_inventory_checks',
      checkId,
      `Menyimpan semakan mingguan inventori pesakit ID ${patient_id} (${totalRestockNeeded} item perlu topup).`
    );

    return res.status(201).json({
      success: true,
      check_id: checkId,
      total_items: totalItems,
      total_restock_needed: totalRestockNeeded,
    });
  } catch (err: any) {
    console.error('Error saving weekly check:', err);
    return res.status(500).json({ error: 'Gagal merekod semakan mingguan.' });
  }
});

// 8.8 Export Inventory CSV for spreadsheet reporting
apiRouter.get('/inventory/export-csv/:patientId', requireAuth, async (req: Request, res: Response) => {
  const { patientId } = req.params;

  try {
    const patient = await first<any>('SELECT * FROM patients WHERE id = ?', [patientId]);
    if (!patient) return res.status(404).json({ error: 'Pesakit tidak dijumpai.' });

    const items = await all<any>(
      'SELECT * FROM patient_inventory_items WHERE patient_id = ? ORDER BY category ASC, item_order ASC',
      [patientId]
    );

    const headers = ['Kategori', 'No', 'Item / Nama Ubat', 'Stock Balance', 'Stock Necessity', 'Restock Date', 'Qty', 'Remark'];
    let csv = `CECC - PATIENT PERSONAL ITEM - WEEKLY STOCK UPDATE\n`;
    csv += `Pesakit: "${patient.full_name}", MRN: "${patient.mrn}", Katil: "${patient.room_bed || '-'}"\n\n`;
    csv += headers.join(',') + '\n';

    let personalIdx = 1;
    let medIdx = 1;

    for (const it of items) {
      const isPersonal = it.category === 'personal';
      const num = isPersonal ? personalIdx++ : medIdx++;
      const row = [
        `"${isPersonal ? 'Barangan Peribadi' : '15. Ubatan Pesakit'}"`,
        num,
        `"${(it.item_name || '').replace(/"/g, '""')}"`,
        `"${(it.stock_balance || '').replace(/"/g, '""')}"`,
        `"${it.stock_necessity || 'NO'}"`,
        `"${it.restock_date || ''}"`,
        `"${it.restock_qty || ''}"`,
        `"${(it.remark || '').replace(/"/g, '""')}"`,
      ];
      csv += row.join(',') + '\n';
    }

    const filename = `Inventori_${patient.full_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  } catch (err: any) {
    console.error('Error exporting inventory CSV:', err);
    return res.status(500).json({ error: 'Gagal mengeksport CSV inventori.' });
  }
});

// ==========================================
// 9. CLOUDFLARE R2 STORAGE & FILE UPLOAD
// ==========================================

// 9.1 Upload Image (Base64 -> Cloudflare R2 / Local Fallback)
apiRouter.post('/storage/upload', requireAuth, async (req: Request, res: Response) => {
  const { imageBase64, prefix = 'convee' } = req.body || {};

  if (!imageBase64) {
    return res.status(400).json({ error: 'Sila sertakan data imej Base64.' });
  }

  try {
    const uploadRes = await uploadBase64Image(imageBase64, prefix);
    return res.json({
      success: true,
      url: uploadRes.url,
      storageType: uploadRes.storageType,
      key: uploadRes.key,
      sizeBytes: uploadRes.sizeBytes,
    });
  } catch (err: any) {
    console.error('Error uploading image to storage:', err);
    return res.status(500).json({ error: `Gagal memuat naik gambar: ${err.message || 'Ralat storan'}` });
  }
});

// 9.2 Get Cloudflare R2 Configuration Status
apiRouter.get('/storage/r2/status', requireAuth, async (_req: Request, res: Response) => {
  const cfg = getR2Config();
  const configured = isR2Configured(cfg);

  return res.json({
    configured,
    bucketName: cfg.bucketName || 'convee-carepulse-assets',
    publicDomain: cfg.publicDomain || 'Standard R2 Public Subdomain',
    hasAccountId: Boolean(cfg.accountId),
    hasAccessKey: Boolean(cfg.accessKeyId),
    hasSecretKey: Boolean(cfg.secretAccessKey),
    provider: configured ? 'Cloudflare R2 Object Storage' : 'Local Fallback Storage (/uploads)',
  });
});

// 9.3 Test Cloudflare R2 Connection
apiRouter.post('/storage/r2/test', requireAdmin, async (req: Request, res: Response) => {
  const customConfig = req.body || {};
  const testRes = await testR2Connection(customConfig.accountId ? customConfig : undefined);
  return res.json(testRes);
});

// 9.4 Save Cloudflare R2 Credentials
apiRouter.post('/storage/r2/save', requireAdmin, async (req: Request, res: Response) => {
  const { accountId, accessKeyId, secretAccessKey, bucketName, publicDomain } = req.body || {};

  try {
    const updated = saveR2Config({
      accountId,
      accessKeyId,
      secretAccessKey,
      bucketName,
      publicDomain,
    });

    const testRes = await testR2Connection(updated);

    await logAudit(
      req.user!,
      'CONFIGURE_R2_STORAGE',
      'settings',
      null,
      `Mengemas kini tetapan Cloudflare R2 storage: Bucket "${updated.bucketName}".`
    );

    return res.json({
      success: true,
      message: 'Tetapan Cloudflare R2 berjaya disimpan.',
      testResult: testRes,
      config: {
        accountId: updated.accountId,
        accessKeyId: updated.accessKeyId,
        bucketName: updated.bucketName,
        publicDomain: updated.publicDomain,
        isConfigured: isR2Configured(updated),
      },
    });
  } catch (err: any) {
    console.error('Failed saving R2 config:', err);
    return res.status(500).json({ error: 'Gagal menyimpan tetapan Cloudflare R2.' });
  }
});

// ==========================================
// 8. APPOINTMENTS & VISITORS ENDPOINTS
// ==========================================

apiRouter.get('/appointments', requireAuth, async (req: Request, res: Response) => {
  try {
    const { date, status, search, patient_id } = req.query;

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
    const params: any[] = [];

    if (patient_id) {
      query += ' AND a.patient_id = ?';
      params.push(patient_id);
    }

    if (status && status !== 'all') {
      query += ' AND a.status = ?';
      params.push(status);
    }

    if (date === 'today') {
      query += " AND date(a.scheduled_date) = date('now')";
    } else if (date === 'upcoming') {
      query += " AND (date(a.scheduled_date) >= date('now') OR a.status = 'Checked-In')";
    } else if (date && date !== 'all') {
      query += ' AND date(a.scheduled_date) = date(?)';
      params.push(date);
    }

    if (search) {
      const term = `%${String(search).trim()}%`;
      query += ' AND (a.visitor_name LIKE ? OR a.visitor_phone LIKE ? OR a.visitor_ic_passport LIKE ? OR p.full_name LIKE ? OR p.mrn LIKE ?)';
      params.push(term, term, term, term, term);
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

    const appointments = await all(query, params);

    // Compute Appointment Stats
    const todayStats = await first<{ today_total: number; currently_checked_in: number; upcoming_scheduled: number; completed_today: number }>(`
      SELECT
        SUM(CASE WHEN date(scheduled_date) = date('now') THEN 1 ELSE 0 END) as today_total,
        SUM(CASE WHEN status = 'Checked-In' THEN 1 ELSE 0 END) as currently_checked_in,
        SUM(CASE WHEN status = 'Scheduled' AND date(scheduled_date) >= date('now') THEN 1 ELSE 0 END) as upcoming_scheduled,
        SUM(CASE WHEN status = 'Completed' AND date(scheduled_date) = date('now') THEN 1 ELSE 0 END) as completed_today
      FROM appointments
    `);

    return res.json({
      appointments: appointments || [],
      stats: {
        today_total: Number(todayStats?.today_total || 0),
        currently_checked_in: Number(todayStats?.currently_checked_in || 0),
        upcoming_scheduled: Number(todayStats?.upcoming_scheduled || 0),
        completed_today: Number(todayStats?.completed_today || 0),
      },
    });
  } catch (err: any) {
    console.error('Failed to get appointments:', err);
    return res.status(500).json({ error: 'Gagal memuat senarai temujanji dan pelawat.' });
  }
});

apiRouter.post('/appointments', requireAuth, async (req: Request, res: Response) => {
  try {
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
    } = req.body || {};

    if (!visitor_name || !visitor_phone || !relationship || !purpose) {
      return res.status(400).json({ error: 'Sila lengkapkan maklumat wajib pelawat (Nama, No Telefon, Hubungan, dan Tujuan Lawatan).' });
    }

    const todayDate = new Date().toISOString().split('T')[0];
    const finalDate = scheduled_date || todayDate;
    const finalTime = scheduled_time || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const id = `apt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const status = is_walk_in ? 'Checked-In' : 'Scheduled';
    const checkInTime = is_walk_in ? new Date().toISOString() : null;

    await run(`
      INSERT INTO appointments (
        id, patient_id, visitor_name, visitor_ic_passport, visitor_phone,
        relationship, purpose, scheduled_date, scheduled_time, duration_minutes,
        pax_count, status, check_in_time, check_out_time, health_declaration,
        temperature, notes, staff_user_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?)
    `, [
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
      req.user?.id || null,
    ]);

    await logAudit(
      req.user!,
      is_walk_in ? 'WALKIN_VISITOR_CHECK_IN' : 'CREATE_APPOINTMENT',
      'appointments',
      id,
      `${is_walk_in ? 'Daftar masuk walk-in pelawat' : 'Mendaftar temujanji pelawat'}: "${visitor_name.trim()}" (${relationship.trim()}) untuk tujuan "${purpose.trim()}".`
    );

    const created = await first(`
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
    `, [id]);

    return res.status(201).json({
      success: true,
      message: is_walk_in ? 'Pelawat berjaya didaftarkan masuk terus (Walk-in).' : 'Temujanji berjaya dijadualkan.',
      appointment: created,
    });
  } catch (err: any) {
    console.error('Failed to create appointment:', err);
    return res.status(500).json({ error: 'Gagal merekodkan temujanji / pelawat: ' + err.message });
  }
});

apiRouter.patch('/appointments/:id/check-in', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { temperature, health_declaration = 1 } = req.body || {};

    const appointment = await first<any>('SELECT * FROM appointments WHERE id = ?', [id]);
    if (!appointment) {
      return res.status(404).json({ error: 'Rekod temujanji tidak ditemui.' });
    }

    const checkInTime = new Date().toISOString();
    await run(`
      UPDATE appointments
      SET status = 'Checked-In',
          check_in_time = ?,
          temperature = COALESCE(?, temperature),
          health_declaration = ?,
          staff_user_id = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `, [
      checkInTime,
      temperature ? Number(temperature) : null,
      Number(health_declaration) ? 1 : 0,
      req.user?.id || null,
      id,
    ]);

    await logAudit(
      req.user!,
      'VISITOR_CHECK_IN',
      'appointments',
      id,
      `Daftar masuk pelawat "${appointment.visitor_name}" pada ${checkInTime}.`
    );

    return res.json({
      success: true,
      message: `Pelawat "${appointment.visitor_name}" berjaya didaftarkan masuk.`,
    });
  } catch (err: any) {
    console.error('Failed to check-in appointment:', err);
    return res.status(500).json({ error: 'Gagal mendaftar masuk pelawat: ' + err.message });
  }
});

apiRouter.patch('/appointments/:id/check-out', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const appointment = await first<any>('SELECT * FROM appointments WHERE id = ?', [id]);
    if (!appointment) {
      return res.status(404).json({ error: 'Rekod temujanji tidak ditemui.' });
    }

    const checkOutTime = new Date().toISOString();
    await run(`
      UPDATE appointments
      SET status = 'Completed',
          check_out_time = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `, [checkOutTime, id]);

    await logAudit(
      req.user!,
      'VISITOR_CHECK_OUT',
      'appointments',
      id,
      `Daftar keluar pelawat "${appointment.visitor_name}" pada ${checkOutTime}. Lawatan selesai.`
    );

    return res.json({
      success: true,
      message: `Pelawat "${appointment.visitor_name}" berjaya didaftarkan keluar.`,
    });
  } catch (err: any) {
    console.error('Failed to check-out appointment:', err);
    return res.status(500).json({ error: 'Gagal mendaftar keluar pelawat: ' + err.message });
  }
});

apiRouter.patch('/appointments/:id/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    const validStatuses = ['Scheduled', 'Checked-In', 'Completed', 'Cancelled', 'No-Show'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status temujanji tidak sah.' });
    }

    await run(`
      UPDATE appointments
      SET status = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `, [status, id]);

    await logAudit(
      req.user!,
      'UPDATE_APPOINTMENT_STATUS',
      'appointments',
      id,
      `Mengemas kini status temujanji kepada "${status}".`
    );

    return res.json({ success: true, message: `Status berjaya dikemaskini kepada "${status}".` });
  } catch (err: any) {
    console.error('Failed to update appointment status:', err);
    return res.status(500).json({ error: 'Gagal mengemas kini status temujanji.' });
  }
});

apiRouter.delete('/appointments/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const appointment = await first<any>('SELECT * FROM appointments WHERE id = ?', [id]);
    if (!appointment) {
      return res.status(404).json({ error: 'Rekod temujanji tidak ditemui.' });
    }

    await run('DELETE FROM appointments WHERE id = ?', [id]);

    await logAudit(
      req.user!,
      'DELETE_APPOINTMENT',
      'appointments',
      id,
      `Memadam rekod temujanji pelawat "${appointment.visitor_name}".`
    );

    return res.json({ success: true, message: 'Rekod temujanji berjaya dipadam.' });
  } catch (err: any) {
    console.error('Failed to delete appointment:', err);
    return res.status(500).json({ error: 'Gagal memadam rekod temujanji.' });
  }
});


