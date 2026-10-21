-- Migration: 0002_seed.sql
-- Seed default accounts and privacy-compliant initial records

-- 1. Default Admin Account (Username: admin | Passcode: Admin@123)
INSERT OR IGNORE INTO users (id, username, full_name, role, passcode_hash, passcode_salt, status, must_change_passcode, created_at)
VALUES (
    'usr_admin_01',
    'admin',
    'Ketua Pentadbir Klinikal',
    'admin',
    'b0db1aa0bae81a84b3b8eacab245a2e84133b015dfef89a8e4003adbc8f44211',
    'cf869aece98f114c3dd445c9fb56b26a',
    'active',
    0,
    datetime('now')
);

-- 2. Staff Nurses (Username: nurse.hajar / nurse.shahdan | Passcode: Nurse@123)
INSERT OR IGNORE INTO users (id, username, full_name, role, passcode_hash, passcode_salt, status, must_change_passcode, created_at)
VALUES (
    'usr_nurse_01',
    'nurse.hajar',
    'Jururawat Hajar binti Osman',
    'staff_nurse',
    '8525d17cc8036a1d4e05f022988faebf445232db1f142990728ee89645aebd42',
    'f4967282e1badf6a17f2d35a20c32ed1',
    'active',
    0,
    datetime('now')
),
(
    'usr_nurse_02',
    'nurse.shahdan',
    'Jururawat Shahdan Budiman',
    'staff_nurse',
    '8525d17cc8036a1d4e05f022988faebf445232db1f142990728ee89645aebd42',
    'f4967282e1badf6a17f2d35a20c32ed1',
    'active',
    0,
    datetime('now')
);

-- 3. Realistic Demo Patients (Strictly Non-Identifiable synthetic records)
-- Zon Lelaki: Katil L-01, Katil L-02, Katil L-03
-- Zon Perempuan: Katil P-01, Katil P-02, Katil P-03

INSERT OR IGNORE INTO patients (id, mrn, full_name, gender, age, date_of_birth, zone, room_bed, primary_diagnosis, prescribed_medications, follow_up_facility, emergency_contact_name, emergency_contact_phone, care_level, baseline_mobility, feeding_method, status)
VALUES
(
    'pt_001',
    'PT-001',
    'Ahmad Taufik bin Ramli',
    'Male',
    64,
    '1962-04-12',
    'Zon Lelaki',
    'Katil L-01',
    'Ischemic Stroke with Left Hemiparesis, Hypertension',
    'Amlodipine 10mg OD, Aspirin 100mg OD, Simvastatin 20mg ON',
    'Hospital Canselor Tuanku Muhriz (HUKM)',
    'Kamal bin Ahmad (Anak)',
    '012-3456789',
    'Partial Assist',
    'Wheelchair bound, minimal weight bearing',
    'Oral soft diet',
    'Active'
),
(
    'pt_002',
    'PT-002',
    'Subramaniam a/l Murugesan',
    'Male',
    72,
    '1954-08-19',
    'Zon Lelaki',
    'Katil L-02',
    'Parkinson Disease Stage 4, Type 2 Diabetes Mellitus',
    'Levodopa/Carbidopa 100/25mg TDS, Metformin 500mg BD',
    'Hospital Kuala Lumpur (HKL)',
    'Kavitha d/o Subramaniam (Anak)',
    '017-8899221',
    'Total Assist',
    'Bedbound, requires assistance',
    'Oral pureed',
    'Active'
),
(
    'pt_003',
    'PT-003',
    'Zulkifli bin Yahya',
    'Male',
    58,
    '1968-11-03',
    'Zon Lelaki',
    'Katil L-03',
    'Chronic Kidney Disease Stage 3, Hypertension',
    'Perindopril 4mg OD, Calcium Carbonate 500mg TDS',
    'Klinik Kesihatan Cheras',
    'Siti Aminah (Isteri)',
    '019-9988112',
    'Independent',
    'Able to ambulate',
    'Oral low salt diet',
    'Active'
),
(
    'pt_004',
    'PT-004',
    'Fatimah binti Daud',
    'Female',
    78,
    '1948-02-14',
    'Zon Perempuan',
    'Katil P-01',
    'Vascular Dementia, Dyslipidemia, History of Fall',
    'Donepezil 5mg ON, Atorvastatin 20mg ON',
    'Hospital Serdang',
    'Noraini binti Daud (Adik)',
    '013-4455667',
    'Partial Assist',
    'Ambulate with walking frame',
    'Oral normal diet',
    'Active'
),
(
    'pt_005',
    'PT-005',
    'Tan Ah Moy',
    'Female',
    81,
    '1945-06-30',
    'Zon Perempuan',
    'Katil P-02',
    'Severe Osteoarthritis, Hypertension, Recurrent UTI',
    'Paracetamol 1g PRN, Losartan 50mg OD',
    'Hospital Ampang',
    'David Tan (Anak)',
    '016-2233445',
    'Total Assist',
    'Wheelchair bound',
    'Oral normal diet',
    'Active'
),
(
    'pt_006',
    'PT-006',
    'Maimunah binti Kassim',
    'Female',
    69,
    '1957-09-25',
    'Zon Perempuan',
    'Katil P-03',
    'Post Left Femur Fracture ORIF, Diabetes Mellitus',
    'Subcutaneous Insulin glargine 14U ON, Gabapentin 300mg ON',
    'Hospital Canselor Tuanku Muhriz (HUKM)',
    'Faridah (Anak)',
    '011-8877665',
    'Partial Assist',
    'Physiotherapy rehabilitation in progress',
    'Oral diabetic diet',
    'Active'
);

-- 4. Admissions Table
INSERT OR IGNORE INTO admissions (id, patient_id, admission_number, admission_date, admission_time, zone, room_bed, admitted_by, lifecycle_status, kanban_stage, admission_remarks)
VALUES
(
    'adm_001',
    'pt_001',
    'ADM-2026-001',
    date('now', '-45 days'),
    '10:30',
    'Zon Lelaki',
    'Katil L-01',
    'usr_admin_01',
    'Active',
    'Hospitalisation',
    'Kemasukan rujukan jagaan strok jangka sederhana.'
),
(
    'adm_002',
    'pt_002',
    'ADM-2026-002',
    date('now', '-90 days'),
    '14:15',
    'Zon Lelaki',
    'Katil L-02',
    'usr_admin_01',
    'Active',
    'Red Alert',
    'Pemantauan rapi diperlukan untuk pencegahan aspirasi dan kekejangan otot.'
),
(
    'adm_003',
    'pt_003',
    'ADM-2026-003',
    date('now', '-12 days'),
    '09:00',
    'Zon Lelaki',
    'Katil L-03',
    'usr_admin_01',
    'Active',
    'Refuse Medication',
    'Pesakit kadangkala menolak ubat petang. Pemantauan tekanan darah ketat.'
),
(
    'adm_004',
    'pt_004',
    'ADM-2026-004',
    date('now', '-20 days'),
    '11:45',
    'Zon Perempuan',
    'Katil P-01',
    'usr_admin_01',
    'Active',
    'Hospitalisation',
    'Program sokongan memori dan latihan kognitif harian.'
),
(
    'adm_005',
    'pt_005',
    'ADM-2026-005',
    date('now', '-5 days'),
    '16:00',
    'Zon Perempuan',
    'Katil P-02',
    'usr_admin_01',
    'Active',
    'TCA',
    'Jadual temujanji susulan di Hospital Ampang pada minggu hadapan.'
),
(
    'adm_006',
    'pt_006',
    'ADM-2026-006',
    date('now', '-1 days'),
    '11:00',
    'Zon Perempuan',
    'Katil P-03',
    'usr_admin_01',
    'Active',
    'New Admission',
    'Pesakit baru daftar untuk pemulihan fisio pasca patah tulang paha.'
);

-- 5. Sample Monitoring Records (AM & Night Vitals, ADL Care)
INSERT OR IGNORE INTO monitoring_records (
    id, admission_id, patient_id, staff_user_id, staff_name, timestamp, shift,
    clinical_status, blood_pressure, pulse_rate, temperature, spo2, blood_sugar, pain_level,
    general_condition, consciousness, mobility_status, appetite, urine_output, bowel_movement,
    medication_intake, hygiene_care, feeding_care, wound_dressing, repositioning, mobilisation,
    nursing_report
)
VALUES
(
    'mon_001',
    'adm_001',
    'pt_001',
    'usr_nurse_01',
    'Jururawat Hajar binti Osman',
    datetime('now', '-2 hours'),
    'AM (7:00-5:00)',
    'Stable',
    '125/82',
    76,
    36.6,
    98,
    '5.4',
    1,
    'STABLE',
    'ALERT',
    'ABLE TO AMBULATE',
    'GOOD',
    'NORMAL',
    1,
    'SERVED',
    'Normal shower',
    'DONE',
    'N/A',
    'DONE',
    '1',
    'Pesakit ceria dan makan sarapan dengan selera yang baik. Fisio pergerakan tangan kiri dijalankan.'
),
(
    'mon_002',
    'adm_002',
    'pt_002',
    'usr_nurse_02',
    'Jururawat Shahdan Budiman',
    datetime('now', '-3 hours'),
    'AM (7:00-5:00)',
    'Red Alert',
    '178/96',
    98,
    38.4,
    91,
    '8.9',
    3,
    'FEBRILE',
    'DROWSY',
    'BEDBOUND',
    'POOR',
    'CONCENTRATED',
    0,
    'SERVED',
    'Sponging and bed bath',
    'DONE',
    'DONE',
    'DONE',
    '0',
    'Pesakit demam dan agak mengantuk. Sponging diberikan, doktor diberitahu untuk pantauan antibiotik.'
),
(
    'mon_003',
    'adm_003',
    'pt_003',
    'usr_nurse_01',
    'Jururawat Hajar binti Osman',
    datetime('now', '-4 hours'),
    'AM (7:00-5:00)',
    'Stable',
    '135/88',
    74,
    36.8,
    97,
    '6.1',
    0,
    'STABLE',
    'ALERT',
    'ABLE TO AMBULATE',
    'GOOD',
    'NORMAL',
    1,
    'REFUSE',
    'Normal shower',
    'DONE',
    'N/A',
    'N/A',
    '1',
    'Pesakit menolak ubat darah tinggi pagi ini menyatakan pening. Tekanan darah dipantau setiap 2 jam.'
);

-- 6. Initial Audit Log
INSERT OR IGNORE INTO audit_logs (id, actor_id, actor_name, actor_role, action, target_entity, target_id, details)
VALUES (
    'aud_001',
    'usr_admin_01',
    'Ketua Pentadbir Klinikal',
    'admin',
    'SYSTEM_BOOTSTRAP',
    'system',
    'system',
    'Pangkalan data awal dan skema D1 dimulakan dengan selamat.'
);
