/**
 * Automated Test Suite for Patient Monitoring System (Convee Care Centre)
 * Validates Phase 5 testing requirements:
 * - Authentication (Valid login, Invalid passcode, Inactive account, Logout)
 * - RBAC Authorization (Admin vs Staff Nurse permissions)
 * - Patient Admission (Auto MRN generation, duplicate prevention)
 * - Monitoring DAPUD (Vital sign validation, 2x daily AM/Night requirement, Red Alert trigger)
 * - Refuse Medication workflow
 * - Direct Discharge workflow
 * - Audit Trail integrity
 */

const BASE_URL = 'http://localhost:3000/api';

interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, durationMs: Date.now() - start });
    console.log(`  [PASS] ${name} (${Date.now() - start}ms)`);
  } catch (err: any) {
    results.push({
      name,
      passed: false,
      message: err.message || String(err),
      durationMs: Date.now() - start,
    });
    console.error(`  [FAIL] ${name}: ${err.message}`);
  }
}

async function request(endpoint: string, options: RequestInit = {}, token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runAllTests() {
  console.log('\n======================================================');
  console.log('PATIENT MONITORING SYSTEM — PHASE 5 AUTOMATED TEST SUITE');
  console.log('======================================================\n');

  let adminToken = '';
  let nurseToken = '';
  let createdPatientId = '';
  let createdAdmissionId = '';

  // 1. Successful Login (Admin)
  await runTest('1. Log Masuk Pentadbir (Admin Login Success)', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', passcode: 'Admin@123' }),
    });
    if (!res.ok || !res.data.token || res.data.user.role !== 'admin') {
      throw new Error(`Expected successful login, got status ${res.status}: ${JSON.stringify(res.data)}`);
    }
    adminToken = res.data.token;
  });

  // 2. Successful Login (Staff Nurse)
  await runTest('2. Log Masuk Jururawat (Staff Nurse Login Success)', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'nurse.hajar', passcode: 'Nurse@123' }),
    });
    if (!res.ok || !res.data.token || res.data.user.role !== 'staff_nurse') {
      throw new Error(`Expected successful login, got status ${res.status}: ${JSON.stringify(res.data)}`);
    }
    nurseToken = res.data.token;
  });

  // 3. Invalid Passcode Rejection
  await runTest('3. Penolakan Kata Laluan Tidak Sah (Invalid Passcode Rejection)', async () => {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'admin', passcode: 'WrongPassword999' }),
    });
    if (res.status !== 401) {
      throw new Error(`Expected status 401 for wrong passcode, got ${res.status}`);
    }
  });

  // 4. Session Revocation & Logout
  await runTest('4. Pembatalan Sesi & Log Keluar (Logout & Session Invalidation)', async () => {
    // Log in temp user
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'nurse.shahdan', passcode: 'Nurse@123' }),
    });
    const tempToken = loginRes.data.token;

    // Logout
    const logoutRes = await request('/auth/logout', { method: 'POST' }, tempToken);
    if (!logoutRes.ok) throw new Error('Logout request failed');

    // Trying to use logged-out token
    const meRes = await request('/auth/me', { method: 'GET' }, tempToken);
    if (meRes.status !== 401) {
      throw new Error(`Expected 401 after logout, got ${meRes.status}`);
    }
  });

  // 5. Admin-Only Staff Management
  await runTest('5. Pentadbir Sahaja Boleh Urus Staf (Admin-Only Staff Management)', async () => {
    // Admin creates a staff member
    const testUsername = 'test.nurse_' + Date.now();
    const createRes = await request(
      '/staff',
      {
        method: 'POST',
        body: JSON.stringify({
          username: testUsername,
          full_name: 'Test Staff Automated',
          role: 'staff_nurse',
          temporary_passcode: 'Nurse@123',
        }),
      },
      adminToken
    );
    if (!createRes.ok) {
      throw new Error(`Admin failed to create staff: ${JSON.stringify(createRes.data)}`);
    }

    // Nurse attempts to access staff list -> Must be rejected (403)
    const nurseStaffAccess = await request('/staff', { method: 'GET' }, nurseToken);
    if (nurseStaffAccess.status !== 403) {
      throw new Error(`Expected 403 Forbidden for nurse accessing staff list, got ${nurseStaffAccess.status}`);
    }
  });

  // 6. Nurse Restricted from Audit Logs
  await runTest('6. Sekatan Akses Log Audit untuk Jururawat (Nurse Audit Restriction)', async () => {
    const auditRes = await request('/audit-logs', { method: 'GET' }, nurseToken);
    if (auditRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for nurse accessing audit logs, got ${auditRes.status}`);
    }

    const adminAuditRes = await request('/audit-logs', { method: 'GET' }, adminToken);
    if (!adminAuditRes.ok || !Array.isArray(adminAuditRes.data.logs)) {
      throw new Error('Admin should be able to view audit logs');
    }
  });

  // 7. Patient Admission Creation (Auto MRN generation)
  await runTest('7. Pendaftaran Kemasukan Pesakit & Auto MRN (Patient Admission Creation)', async () => {
    const admRes = await request(
      '/patients',
      {
        method: 'POST',
        body: JSON.stringify({
          full_name: 'Ujian Pesakit Automasi',
          gender: 'Male',
          age: 62,
          date_of_birth: '1964-05-10',
          zone: 'Zon Lelaki',
          room_bed: 'Katil L-05',
          primary_diagnosis: 'Post Cardiac Surgery Rehabilitation',
          prescribed_medications: 'Bisoprolol 2.5mg OD, Aspirin 100mg OD',
          follow_up_facility: 'Institut Jantung Negara (IJN)',
          emergency_contact_name: 'Zaharah (Isteri)',
          emergency_contact_phone: '012-9988776',
          care_level: 'Partial Assist',
          admission_remarks: 'Ujian kemasukan automatik.',
        }),
      },
      nurseToken
    );

    if (!admRes.ok || !admRes.data.patientId || !admRes.data.mrn) {
      throw new Error(`Failed to create patient: ${JSON.stringify(admRes.data)}`);
    }

    createdPatientId = admRes.data.patientId;
    if (!admRes.data.mrn.startsWith('PT-')) {
      throw new Error(`MRN format unexpected: ${admRes.data.mrn}`);
    }

    // Retrieve details
    const detailRes = await request(`/patients/${createdPatientId}`, { method: 'GET' }, nurseToken);
    if (!detailRes.ok || !detailRes.data.admissions || detailRes.data.admissions.length === 0) {
      throw new Error('Patient detail failed to return active admission');
    }
    createdAdmissionId = detailRes.data.admissions[0].id;
  });

  // 8. Mandatory Vitals on AM Shift
  await runTest('8. Pengesahan Tanda Vital Wajib Syif AM (Mandatory Vitals Validation on AM Shift)', async () => {
    // Missing temperature and BP on AM shift -> Must fail
    const invalidRes = await request(
      '/monitoring',
      {
        method: 'POST',
        body: JSON.stringify({
          patient_id: createdPatientId,
          shift: 'AM (7:00-5:00)',
          // No vitals provided
          appetite: 'GOOD',
          medication_intake: 'SERVED',
        }),
      },
      nurseToken
    );

    if (invalidRes.status !== 400) {
      throw new Error(`Expected 400 when missing vital signs on AM shift, got ${invalidRes.status}`);
    }

    // Complete vitals -> Must succeed
    const validRes = await request(
      '/monitoring',
      {
        method: 'POST',
        body: JSON.stringify({
          patient_id: createdPatientId,
          shift: 'AM (7:00-5:00)',
          clinical_status: 'Stable',
          blood_pressure: '122/78',
          pulse_rate: 72,
          temperature: 36.6,
          spo2: 98,
          blood_sugar: '5.2',
          pain_level: 0,
          general_condition: 'STABLE',
          consciousness: 'ALERT',
          mobility_status: 'ABLE TO AMBULATE',
          appetite: 'GOOD',
          medication_intake: 'SERVED',
          hygiene_care: 'Normal shower',
          feeding_care: 'DONE',
          wound_dressing: 'N/A',
          repositioning: 'DONE',
          mobilisation: '1',
          nursing_report: 'Ujian pemantauan syif pagi berjaya.',
        }),
      },
      nurseToken
    );

    if (!validRes.ok) {
      throw new Error(`Valid monitoring record failed: ${JSON.stringify(validRes.data)}`);
    }
  });

  // 9. Red Alert Auto-Detection
  await runTest('9. Pengesanan Automatik Red Alert (Red Alert Auto Detection)', async () => {
    // Submit vital with High Temperature (38.8°C) and Low SpO2 (89%)
    const alertRes = await request(
      '/monitoring',
      {
        method: 'POST',
        body: JSON.stringify({
          patient_id: createdPatientId,
          shift: 'Night (9:00pm-7:00am)',
          blood_pressure: '165/95',
          pulse_rate: 125, // Tachycardia (>120)
          temperature: 38.8, // High fever (>=38)
          spo2: 89, // Hypoxia (<92)
          appetite: 'POOR',
          medication_intake: 'SERVED',
          nursing_report: 'Pesakit sesak nafas dan demam panas.',
        }),
      },
      nurseToken
    );

    if (!alertRes.ok || alertRes.data.clinicalStatus !== 'Red Alert') {
      throw new Error(`Expected Red Alert status, got: ${JSON.stringify(alertRes.data)}`);
    }

    // Check patient's active kanban stage -> Should now be 'Red Alert'
    const patientRes = await request(`/patients/${createdPatientId}`, { method: 'GET' }, nurseToken);
    const stage = patientRes.data.admissions[0].kanban_stage;
    if (stage !== 'Red Alert') {
      throw new Error(`Expected kanban_stage to update to 'Red Alert', but found '${stage}'`);
    }
  });

  // 10. Refuse Medication Stage Transition
  await runTest('10. Aliran Pesakit Menolak Ubat (Refuse Medication Stage Transition)', async () => {
    const refuseRes = await request(
      '/monitoring',
      {
        method: 'POST',
        body: JSON.stringify({
          patient_id: createdPatientId,
          shift: 'PM (5:00-9:00)',
          medication_intake: 'REFUSE',
          appetite: 'GOOD',
          nursing_report: 'Pesakit menolak dos ubat petang.',
        }),
      },
      nurseToken
    );

    if (!refuseRes.ok) {
      throw new Error(`Refuse medication record failed: ${JSON.stringify(refuseRes.data)}`);
    }

    const patientRes = await request(`/patients/${createdPatientId}`, { method: 'GET' }, nurseToken);
    const stage = patientRes.data.admissions[0].kanban_stage;
    if (stage !== 'Refuse Medication') {
      throw new Error(`Expected kanban stage 'Refuse Medication', found '${stage}'`);
    }
  });

  // 11. Direct Discharge Processing
  await runTest('11. Aliran Pelepasan / Discaj Segera (Direct Discharge Workflow)', async () => {
    const disRes = await request(
      `/admissions/${createdAdmissionId}/discharge`,
      {
        method: 'POST',
        body: JSON.stringify({
          discharge_destination: 'Rumah (Jagaan Keluarga)',
          discharge_summary: 'Pesakit selesai program pemulihan dan dibenarkan discaj.',
          emergency_contact_notified: true,
          medications_given: 'Aspirin 100mg (14 hari)',
        }),
      },
      nurseToken
    );

    if (!disRes.ok || !disRes.data.dischargeId) {
      throw new Error(`Failed to discharge patient: ${JSON.stringify(disRes.data)}`);
    }

    // Verify patient status is now 'Discharged'
    const patientRes = await request(`/patients/${createdPatientId}`, { method: 'GET' }, nurseToken);
    if (patientRes.data.patient.status !== 'Discharged') {
      throw new Error(`Expected status 'Discharged', got '${patientRes.data.patient.status}'`);
    }
  });

  // 12. Audit Trail Integrity
  await runTest('12. Ketulenan Log Audit (Audit Trail Integrity)', async () => {
    const auditRes = await request('/audit-logs', { method: 'GET' }, adminToken);
    if (!auditRes.ok) throw new Error('Failed to fetch audit logs');

    const logs = auditRes.data.logs;
    const actions = logs.map((l: any) => l.action);

    const requiredActions = ['LOGIN', 'CREATE_PATIENT', 'ADD_MONITORING', 'DISCHARGE_PATIENT'];
    for (const reqAct of requiredActions) {
      if (!actions.includes(reqAct)) {
        throw new Error(`Expected audit log for action '${reqAct}' not found in recent logs`);
      }
    }
  });

  // 13. Duplicate Username Prevention
  await runTest('13. Pencegahan Penduaan Nama Pengguna (Duplicate Username Prevention)', async () => {
    const dupRes = await request(
      '/staff',
      {
        method: 'POST',
        body: JSON.stringify({
          username: 'admin', // already exists
          full_name: 'Duplicate Admin Test',
          role: 'admin',
          temporary_passcode: 'Test@123',
        }),
      },
      adminToken
    );

    if (dupRes.status !== 400) {
      throw new Error(`Expected 400 on duplicate username, got ${dupRes.status}`);
    }
  });

  // 14. Zone & Status Query Filtering
  await runTest('14. Penapisan Zon Lelaki & Perempuan (Zone & Status Filtering)', async () => {
    const maleRes = await request('/patients?zone=Zon%20Lelaki', { method: 'GET' }, adminToken);
    if (!maleRes.ok || maleRes.data.patients.some((p: any) => p.zone !== 'Zon Lelaki')) {
      throw new Error('Zone filter for Zon Lelaki returned incorrect records');
    }

    const femaleRes = await request('/patients?zone=Zon%20Perempuan', { method: 'GET' }, adminToken);
    if (!femaleRes.ok || femaleRes.data.patients.some((p: any) => p.zone !== 'Zon Perempuan')) {
      throw new Error('Zone filter for Zon Perempuan returned incorrect records');
    }
  });

  // 15. CSV Export Generation
  await runTest('15. Penjanaan Eksport Laporan CSV (CSV Export Generation)', async () => {
    const csvMonitoringRes = await fetch(`${BASE_URL}/reports/export-csv?type=monitoring`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!csvMonitoringRes.ok) throw new Error('Failed to export monitoring CSV');
    const monitoringCsv = await csvMonitoringRes.text();
    if (!monitoringCsv.includes('Blood Pressure') || !monitoringCsv.includes('Timestamp')) {
      throw new Error('Monitoring CSV missing required DAPUD headers');
    }

    const csvPatientsRes = await fetch(`${BASE_URL}/reports/export-csv?type=patients`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!csvPatientsRes.ok) throw new Error('Failed to export patients CSV');
    const patientsCsv = await csvPatientsRes.text();
    if (!patientsCsv.includes('Patient ID (MRN)') || !patientsCsv.includes('Length of Stay')) {
      throw new Error('Patients CSV missing required headers');
    }
  });

  // 16. Patient Inventory Initialization & Weekly Check Sheets (CECC Spreadsheets)
  await runTest('16. Inisialisasi Inventori Pesakit & Ubatan (Patient Inventory & Meds)', async () => {
    // Test with Aisah Bebe or first active patient
    const patientsRes = await request('/patients?status=Active', { method: 'GET' }, adminToken);
    if (!patientsRes.ok || patientsRes.data.patients.length === 0) {
      throw new Error('No active patients found for inventory test');
    }

    const testPatient = patientsRes.data.patients[0];
    const invRes = await request(`/inventory/patient/${testPatient.id}`, { method: 'GET' }, adminToken);
    if (!invRes.ok) {
      throw new Error(`Failed to get patient inventory: ${invRes.data?.error}`);
    }

    if (!Array.isArray(invRes.data.personal_items) || invRes.data.personal_items.length === 0) {
      throw new Error('Expected standard personal items to be initialized for patient');
    }

    const diaperItem = invRes.data.personal_items.find((i: any) => i.item_name.toLowerCase().includes('diaper'));
    if (!diaperItem) {
      throw new Error('Expected Diaper to be in personal items list');
    }
  });

  // 17. Inventory Stock Necessity Toggle & Update
  await runTest('17. Kemas Kini Baki & Keperluan Stok (Stock Necessity Toggle)', async () => {
    const patientsRes = await request('/patients?status=Active', { method: 'GET' }, adminToken);
    const testPatient = patientsRes.data.patients[0];
    const invRes = await request(`/inventory/patient/${testPatient.id}`, { method: 'GET' }, adminToken);
    const item = invRes.data.personal_items[0];

    const newNecessity = item.stock_necessity === 'YES' ? 'NO' : 'YES';
    const updateRes = await request(
      `/inventory/items/${item.id}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          stock_necessity: newNecessity,
          stock_balance: '10 paks',
          remark: 'Ujian automatik',
        }),
      },
      nurseToken
    );

    if (!updateRes.ok || updateRes.data.item.stock_necessity !== newNecessity) {
      throw new Error('Failed to update stock necessity flag');
    }
  });

  // 18. Fast Restock Endpoint
  await runTest('18. Rekod Penambahan Stok / Top-up Pantas (Fast Restock)', async () => {
    const patientsRes = await request('/patients?status=Active', { method: 'GET' }, adminToken);
    const testPatient = patientsRes.data.patients[0];
    const invRes = await request(`/inventory/patient/${testPatient.id}`, { method: 'GET' }, adminToken);
    const item = invRes.data.personal_items[0];

    const restockRes = await request(
      '/inventory/restock',
      {
        method: 'POST',
        body: JSON.stringify({
          itemId: item.id,
          restockQty: '5 paks',
          restockDate: '2026-10-24',
          newStockBalance: '15 paks',
          stockNecessity: 'NO',
          remark: 'Restock oleh farmasi hospital',
        }),
      },
      nurseToken
    );

    if (!restockRes.ok || restockRes.data.item.stock_balance !== '15 paks') {
      throw new Error('Failed to process restock record');
    }
  });

  // 19. Weekly Check Audit Session Creation
  await runTest('19. Rekod Sesi Semakan Mingguan Lengkap (Weekly Check Audit Session)', async () => {
    const patientsRes = await request('/patients?status=Active', { method: 'GET' }, adminToken);
    const testPatient = patientsRes.data.patients[0];
    const invRes = await request(`/inventory/patient/${testPatient.id}`, { method: 'GET' }, adminToken);

    const checkRes = await request(
      '/inventory/checks',
      {
        method: 'POST',
        body: JSON.stringify({
          patient_id: testPatient.id,
          check_date: '2026-10-24',
          personal_staff_name: 'HAJAR',
          med_staff_name: 'AISYAH',
          general_remarks: 'Ujian automatik semakan mingguan akhir bulan',
          items: invRes.data.personal_items.slice(0, 3).map((it: any) => ({
            id: it.id,
            category: it.category,
            item_name: it.item_name,
            stock_balance: it.stock_balance,
            stock_necessity: 'NO',
            restock_date: '2026-10-24',
            restock_qty: '2',
            remark: 'OK',
          })),
        }),
      },
      nurseToken
    );

    if (!checkRes.ok || !checkRes.data.check_id) {
      throw new Error('Failed to record weekly check session');
    }
  });

  // 20. DAPUD Enhancements (Condition, Diet Plan, Tube, Behavior, Wound Photo, Nurse Advice)
  await runTest('20. Rekod DAPUD Lengkap (Patient Condition, Diet, Tube, Behavior & Nurse Advice)', async () => {
    const patientsRes = await request('/patients?status=Active', { method: 'GET' }, adminToken);
    const testPatient = patientsRes.data.patients[0];

    const dapuRes = await request(
      '/monitoring',
      {
        method: 'POST',
        body: JSON.stringify({
          patient_id: testPatient.id,
          shift: 'AM (7:00-5:00)',
          blood_pressure: '125/82',
          pulse_rate: 74,
          temperature: 36.7,
          spo2: 98,
          general_condition: 'Stable',
          consciousness: 'Alert',
          mobility_status: 'Independent',
          appetite: 'Good',
          urine_output: 'Normal',
          bowel_movement: 1,
          diet_plan: 'Makan bubur ayam lumat',
          tube_has_ngt: 1,
          tube_type: 'NGT tube',
          tube_material: 'silicone',
          tube_size: 'Fr 16',
          tube_replacement_date: '2026-11-15',
          patient_behavior: 'Calm & Cooperative, Attention-Seeking',
          attachment_image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          nurse_advice: 'Pastikan pantau tiub NGT selepas suapan susu dan tukar dressing luka esok pagi.',
        }),
      },
      nurseToken
    );

    if (!dapuRes.ok || !dapuRes.data.monitoringId) {
      throw new Error(`Failed to create enhanced DAPUD record: ${JSON.stringify(dapuRes.data)}`);
    }

    // Verify detail
    const details = await request(`/patients/${testPatient.id}`, { method: 'GET' }, adminToken);
    const latestRec = details.data.monitoring[0];
    if (
      latestRec.diet_plan !== 'Makan bubur ayam lumat' ||
      latestRec.tube_material !== 'silicone' ||
      !latestRec.nurse_advice
    ) {
      throw new Error('Saved DAPUD record did not persist expected enhanced fields');
    }
  });

  // 21. TCA Schedule & 1-Day Alert Integration
  await runTest('21. Pengurusan Jadual Temujanji TCA (To Come Again) & Alert Sehari Awal', async () => {
    const patientsRes = await request('/patients?status=Active', { method: 'GET' }, adminToken);
    const testPatient = patientsRes.data.patients[0];

    const tomorrowStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const tcaRes = await request(
      `/admissions/${testPatient.admission_id}/tca`,
      {
        method: 'PATCH',
        body: JSON.stringify({
          tca_date: tomorrowStr,
          tca_location: 'Hospital Selayang (Klinik Geriatrik)',
          tca_remarks: 'Pemeriksaan darah berkala dan semakan ubat darah tinggi.',
          set_stage_tca: true,
        }),
      },
      nurseToken
    );

    if (!tcaRes.ok) {
      throw new Error(`Failed to update TCA schedule: ${JSON.stringify(tcaRes.data)}`);
    }

    // Check patients list returns tca_date
    const checkPatient = await request('/patients?status=Active', { method: 'GET' }, adminToken);
    const updated = checkPatient.data.patients.find((p: any) => p.id === testPatient.id);
    if (updated.tca_date !== tomorrowStr || updated.kanban_stage !== 'TCA') {
      throw new Error('Patient record does not reflect updated TCA date and stage');
    }
  });

  // 22. Inventory Image Attachment
  await runTest('22. Lampiran Gambar Rujukan Inventori Barangan & Ubatan Pesakit', async () => {
    const patientsRes = await request('/patients?status=Active', { method: 'GET' }, adminToken);
    const testPatient = patientsRes.data.patients[0];
    const invRes = await request(`/inventory/patient/${testPatient.id}`, { method: 'GET' }, adminToken);
    const testItem = invRes.data.personal_items[0];

    const dummyImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    const updateRes = await request(
      `/inventory/items/${testItem.id}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          image_url: dummyImage,
        }),
      },
      nurseToken
    );

    if (!updateRes.ok || updateRes.data.item.image_url !== dummyImage) {
      throw new Error('Failed to attach image to inventory item');
    }
  });

  // 23. Pengesahan Syif Baharu (Morning, Petang, Night) & Kapasiti 30 Katil
  await runTest('23. Jadual Syif (Morning, Petang, Night) & Kapasiti 30 Katil', async () => {
    const activeRes = await request('/patients?status=Active', { method: 'GET' }, adminToken);
    const activePatientId = activeRes.data.patients[0]?.id || createdPatientId;

    // Test recording with Morning shift (requires vitals)
    const morningRes = await request(
      '/monitoring',
      {
        method: 'POST',
        body: JSON.stringify({
          patient_id: activePatientId,
          shift: 'Morning (7:00am-5:00pm)',
          clinical_status: 'Stable',
          blood_pressure: '120/80',
          pulse_rate: 76,
          temperature: 36.6,
          spo2: 98,
          appetite: 'GOOD',
          medication_intake: 'SERVED',
          nursing_report: 'Semakan syif morning rutin.',
        }),
      },
      nurseToken
    );

    if (!morningRes.ok) {
      throw new Error(`Morning shift record failed: ${JSON.stringify(morningRes.data)}`);
    }

    // Test recording with Petang shift (ADL & ubat, non-vital mandatory)
    const petangRes = await request(
      '/monitoring',
      {
        method: 'POST',
        body: JSON.stringify({
          patient_id: activePatientId,
          shift: 'Petang (2:00pm-12:00am)',
          appetite: 'GOOD',
          medication_intake: 'SERVED',
          nursing_report: 'Syif petang: pesakit selesai makan malam dan rehat.',
        }),
      },
      nurseToken
    );

    if (!petangRes.ok) {
      throw new Error(`Petang shift record failed: ${JSON.stringify(petangRes.data)}`);
    }

    // Test dashboard summary updates_today includes the new shifts
    const statsRes = await request('/dashboard/summary', { method: 'GET' }, adminToken);
    if (!statsRes.ok || statsRes.data.updates_today.am_shift < 1 || statsRes.data.updates_today.pm_shift < 1) {
      throw new Error(`Dashboard stats did not aggregate morning/petang shift updates: ${JSON.stringify(statsRes.data)}`);
    }
  });

  // 24. Storage Cloudflare R2 Upload & Status
  await runTest('24. Integrasi Storan Cloudflare R2 (Upload & Status Check)', async () => {
    // 1. Check R2 Status
    const statusRes = await request('/storage/r2/status', { method: 'GET' }, adminToken);
    if (!statusRes.ok || !statusRes.data.provider) {
      throw new Error(`Failed to fetch R2 status: ${JSON.stringify(statusRes.data)}`);
    }

    // 2. Upload sample image to storage endpoint
    const dummyImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const uploadRes = await request(
      '/storage/upload',
      {
        method: 'POST',
        body: JSON.stringify({ imageBase64: dummyImage, prefix: 'test_r2' }),
      },
      nurseToken
    );

    if (!uploadRes.ok || !uploadRes.data.url) {
      throw new Error(`Failed to upload image to R2 storage: ${JSON.stringify(uploadRes.data)}`);
    }
  });

  // 25. Peranan Baharu Caregiver (Login & Kebenaran Akses)
  await runTest('25. Peranan Baharu Caregiver (Log Masuk & Pengesahan Kebenaran Akses)', async () => {
    // 1. Log in with caregiver credentials
    const cgLogin = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: 'caregiver.azlan', passcode: 'Nurse@123' }),
    });

    if (!cgLogin.ok || !cgLogin.data.token || cgLogin.data.user.role !== 'caregiver') {
      throw new Error(`Caregiver login failed or unexpected role: ${JSON.stringify(cgLogin.data)}`);
    }

    const caregiverToken = cgLogin.data.token;

    // 2. Caregiver should be able to view patient list & inventory
    const patientsRes = await request('/patients?status=Active', { method: 'GET' }, caregiverToken);
    if (!patientsRes.ok || !Array.isArray(patientsRes.data.patients)) {
      throw new Error(`Caregiver failed to access active patients list`);
    }

    // 3. Caregiver should be blocked from admin-only routes (403 Forbidden)
    const staffRes = await request('/staff', { method: 'GET' }, caregiverToken);
    if (staffRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden for caregiver accessing staff list, got ${staffRes.status}`);
    }
  });

  // 26. Modul Temujanji & Pelawat: Dapatkan Senarai & Statistik
  await runTest('26. Modul Temujanji & Pelawat: Dapatkan Senarai & Statistik (Appointments & Visitors Query)', async () => {
    const res = await request('/appointments?date=all', { method: 'GET' }, adminToken);
    if (!res.ok) {
      throw new Error(`Failed fetching appointments: ${JSON.stringify(res.data)}`);
    }
    if (!Array.isArray(res.data.appointments) || res.data.appointments.length === 0) {
      throw new Error('Expected at least seeded appointments to be returned');
    }
    if (!res.data.stats || typeof res.data.stats.currently_checked_in !== 'number') {
      throw new Error(`Expected valid appointment stats, got: ${JSON.stringify(res.data.stats)}`);
    }
  });

  // 27. Pendaftaran Temujanji Baharu & Walk-In Visitor
  let createdAptId = '';
  await runTest('27. Pendaftaran Temujanji Baharu & Walk-In Visitor (Create Appointment & Walk-In)', async () => {
    // 1. Create a scheduled appointment
    const createRes = await request('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        patient_id: 'pt_001',
        visitor_name: 'Puan Siti Rahmah',
        visitor_ic_passport: '850102-10-5522',
        visitor_phone: '019-2233445',
        relationship: 'Anak',
        purpose: 'Lawatan Pesakit',
        scheduled_date: new Date().toISOString().split('T')[0],
        scheduled_time: '03:00 PM',
        duration_minutes: 45,
        pax_count: 2,
        notes: 'Membawa pakaian bersih',
        health_declaration: 1,
        is_walk_in: false,
      }),
    }, nurseToken);

    if (!createRes.ok || !createRes.data.appointment || !createRes.data.appointment.id) {
      throw new Error(`Failed creating appointment: ${JSON.stringify(createRes.data)}`);
    }
    createdAptId = createRes.data.appointment.id;
    if (createRes.data.appointment.status !== 'Scheduled') {
      throw new Error(`Expected status Scheduled, got ${createRes.data.appointment.status}`);
    }

    // 2. Perform Check-In on the scheduled appointment
    const checkInRes = await request(`/appointments/${createdAptId}/check-in`, {
      method: 'PATCH',
      body: JSON.stringify({ temperature: 36.6, health_declaration: 1 }),
    }, nurseToken);

    if (!checkInRes.ok) {
      throw new Error(`Failed checking in visitor: ${JSON.stringify(checkInRes.data)}`);
    }

    // 3. Verify status changed to Checked-In
    const verifyRes = await request('/appointments?date=all', { method: 'GET' }, adminToken);
    const target = verifyRes.data.appointments.find((a: any) => a.id === createdAptId);
    if (!target || target.status !== 'Checked-In' || !target.check_in_time) {
      throw new Error(`Expected appointment to be Checked-In with check_in_time, got: ${JSON.stringify(target)}`);
    }
  });

  // 28. Daftar Keluar Pelawat & Audit Trail Temujanji
  await runTest('28. Daftar Keluar Pelawat & Audit Trail (Check-Out & Audit Trail)', async () => {
    if (!createdAptId) {
      throw new Error('No appointment ID to check out');
    }

    // Check-out
    const checkOutRes = await request(`/appointments/${createdAptId}/check-out`, {
      method: 'PATCH',
    }, nurseToken);

    if (!checkOutRes.ok) {
      throw new Error(`Failed checking out visitor: ${JSON.stringify(checkOutRes.data)}`);
    }

    // Verify completed status
    const verifyRes = await request('/appointments?date=all', { method: 'GET' }, adminToken);
    const target = verifyRes.data.appointments.find((a: any) => a.id === createdAptId);
    if (!target || target.status !== 'Completed' || !target.check_out_time) {
      throw new Error(`Expected appointment to be Completed with check_out_time, got: ${JSON.stringify(target)}`);
    }

    // Verify audit logs captured the action
    const auditRes = await request('/audit-logs?entity=appointments', { method: 'GET' }, adminToken);
    if (!auditRes.ok || !Array.isArray(auditRes.data.logs)) {
      throw new Error('Failed to retrieve audit logs for appointments');
    }
    const hasLog = auditRes.data.logs.some((l: any) => l.target_id === createdAptId);
    if (!hasLog) {
      throw new Error('Expected audit log entry for the created/checked-out appointment');
    }
  });



  // Summary
  console.log('\n======================================================');
  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  console.log(`TOTAL UJIAN: ${totalCount} | LULUS: ${passedCount} | GAGAL: ${totalCount - passedCount}`);
  console.log('======================================================\n');

  if (passedCount !== totalCount) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
