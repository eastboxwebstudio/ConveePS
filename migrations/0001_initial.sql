-- Migration: 0001_initial.sql
-- Database: Cloudflare D1 (SQLite compatible)
-- System: Patient Monitoring System (Convee Care Centre)

PRAGMA foreign_keys = ON;

-- 1. Users Table (Admin and Staff Nurse)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'staff_nurse')),
    passcode_hash TEXT NOT NULL,
    passcode_salt TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
    must_change_passcode INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_login_at TEXT
);

-- 2. Sessions Table (Server-side Session Storage)
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Patients Table (Master Patient Index)
CREATE TABLE IF NOT EXISTS patients (
    id TEXT PRIMARY KEY,
    mrn TEXT UNIQUE NOT NULL, -- e.g. PT-001, PT-002
    full_name TEXT NOT NULL,
    gender TEXT NOT NULL CHECK(gender IN ('Male', 'Female')),
    age INTEGER NOT NULL,
    date_of_birth TEXT,
    zone TEXT NOT NULL CHECK(zone IN ('Zon Lelaki', 'Zon Perempuan')),
    room_bed TEXT, -- e.g. Katil L-01, Katil P-02
    primary_diagnosis TEXT NOT NULL,
    prescribed_medications TEXT,
    follow_up_facility TEXT, -- e.g. HUKM, Hospital Kuala Lumpur
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    care_level TEXT DEFAULT 'Partial Assist' CHECK(care_level IN ('Independent', 'Partial Assist', 'Total Assist')),
    baseline_mobility TEXT DEFAULT 'Able to ambulate',
    feeding_method TEXT DEFAULT 'Oral',
    status TEXT NOT NULL DEFAULT 'Active' CHECK(status IN ('Active', 'Discharged', 'Hospitalised', 'Home Leave')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. Admissions Table (Admission Journey)
CREATE TABLE IF NOT EXISTS admissions (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    admission_number TEXT UNIQUE NOT NULL,
    admission_date TEXT NOT NULL, -- YYYY-MM-DD
    admission_time TEXT NOT NULL, -- HH:MM
    zone TEXT NOT NULL,
    room_bed TEXT,
    admitted_by TEXT NOT NULL,
    lifecycle_status TEXT NOT NULL DEFAULT 'Active' CHECK(lifecycle_status IN ('Active', 'Hospitalised', 'Home Leave', 'Discharged', 'Cancelled')),
    kanban_stage TEXT NOT NULL DEFAULT 'New Admission' CHECK(kanban_stage IN ('New Admission', 'Hospitalisation', 'Red Alert', 'TCA', 'Home Leave', 'Refuse Medication', 'Discharged')),
    contract_end_date TEXT,
    admission_remarks TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (admitted_by) REFERENCES users(id)
);

-- 5. Monitoring Records (DAPUD - Daily Patient Updates)
CREATE TABLE IF NOT EXISTS monitoring_records (
    id TEXT PRIMARY KEY,
    admission_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    staff_user_id TEXT NOT NULL,
    staff_name TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT (datetime('now')),
    shift TEXT NOT NULL CHECK(shift IN ('AM (7:00-5:00)', 'PM (5:00-9:00)', 'Night (9:00pm-7:00am)')),
    
    -- Clinical Acuity
    clinical_status TEXT NOT NULL DEFAULT 'Stable' CHECK(clinical_status IN ('Stable', 'Red Alert')),
    
    -- Vital Signs (Mandatory on AM and Night shifts)
    blood_pressure TEXT, -- e.g. 120/80
    pulse_rate INTEGER,   -- bpm
    temperature REAL,     -- Celsius e.g. 36.8
    spo2 INTEGER,         -- % e.g. 98
    blood_sugar TEXT,     -- mmol/L e.g. 5.6 or '-'
    pain_level INTEGER DEFAULT 0, -- 0-10
    
    -- Physical & Neurological Status
    general_condition TEXT DEFAULT 'STABLE',
    consciousness TEXT DEFAULT 'ALERT',
    mobility_status TEXT DEFAULT 'ABLE TO AMBULATE',
    appetite TEXT DEFAULT 'GOOD' CHECK(appetite IN ('GOOD', 'FAIR', 'POOR')),
    urine_output TEXT DEFAULT 'NORMAL',
    bowel_movement INTEGER DEFAULT 0,
    
    -- Nursing Care & ADL Tasks
    medication_intake TEXT DEFAULT 'SERVED' CHECK(medication_intake IN ('SERVED', 'REFUSE', 'WITHHELD')),
    hygiene_care TEXT DEFAULT 'Normal shower', -- Normal shower, Sponging and bed bath
    feeding_care TEXT DEFAULT 'DONE',          -- DONE, 0, N/A
    wound_dressing TEXT DEFAULT 'N/A',        -- DONE, 0, N/a, 1
    repositioning TEXT DEFAULT 'N/A',         -- DONE, 0, N/A
    mobilisation TEXT DEFAULT '1',            -- DONE, 0, 1
    
    -- Reports and Logs
    nursing_report TEXT,
    rehab_assessment TEXT,
    visitor_log TEXT,
    home_leave TEXT DEFAULT '0',
    new_admission_flag INTEGER DEFAULT 0,
    discharge_flag INTEGER DEFAULT 0,
    
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (admission_id) REFERENCES admissions(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (staff_user_id) REFERENCES users(id)
);

-- 6. Discharges Table
CREATE TABLE IF NOT EXISTS discharge_records (
    id TEXT PRIMARY KEY,
    admission_id TEXT UNIQUE NOT NULL,
    patient_id TEXT NOT NULL,
    discharge_date TEXT NOT NULL,
    discharge_time TEXT NOT NULL,
    discharged_by TEXT NOT NULL,
    discharge_destination TEXT DEFAULT 'Home', -- Home, Hospital, Nursing Home, Deceased
    discharge_summary TEXT,
    emergency_contact_notified INTEGER DEFAULT 1,
    medications_given TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (admission_id) REFERENCES admissions(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
    FOREIGN KEY (discharged_by) REFERENCES users(id)
);

-- 7. Audit Logs Table (Immutable Audit Trail)
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_id TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL, -- e.g. 'LOGIN', 'CREATE_PATIENT', 'ADD_MONITORING', 'DISCHARGE_PATIENT'
    target_entity TEXT NOT NULL, -- e.g. 'patient', 'monitoring', 'user', 'admission'
    target_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for high performance querying
CREATE INDEX IF NOT EXISTS idx_patients_mrn ON patients(mrn);
CREATE INDEX IF NOT EXISTS idx_patients_zone ON patients(zone);
CREATE INDEX IF NOT EXISTS idx_patients_status ON patients(status);
CREATE INDEX IF NOT EXISTS idx_admissions_patient ON admissions(patient_id);
CREATE INDEX IF NOT EXISTS idx_admissions_status ON admissions(lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_admissions_stage ON admissions(kanban_stage);
CREATE INDEX IF NOT EXISTS idx_monitoring_admission ON monitoring_records(admission_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_timestamp ON monitoring_records(timestamp);
CREATE INDEX IF NOT EXISTS idx_monitoring_shift ON monitoring_records(shift);
CREATE INDEX IF NOT EXISTS idx_monitoring_clinical_status ON monitoring_records(clinical_status);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
