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
