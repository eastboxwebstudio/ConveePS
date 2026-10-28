-- ========================================================
-- Migration 0005: Appointments & Visitors Management
-- Convee Care Centre (CarePulse)
-- ========================================================

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id) ON DELETE SET NULL,
  visitor_name TEXT NOT NULL,
  visitor_ic_passport TEXT,
  visitor_phone TEXT NOT NULL,
  relationship TEXT NOT NULL, -- e.g. Anak, Pasangan, Adik-beradik, Rakan, Doktor Pakar, Fisioterapis, Lain-lain
  purpose TEXT NOT NULL, -- e.g. Lawatan Pesakit, Konsultasi Perubatan, Fisioterapi / Rehab, Hantar Barang / Ubat, Pentadbiran
  scheduled_date TEXT NOT NULL, -- YYYY-MM-DD
  scheduled_time TEXT NOT NULL, -- e.g. 10:00 AM, 14:30
  duration_minutes INTEGER DEFAULT 45,
  pax_count INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'Scheduled' CHECK(status IN ('Scheduled', 'Checked-In', 'Completed', 'Cancelled', 'No-Show')),
  check_in_time TEXT,
  check_out_time TEXT,
  health_declaration INTEGER DEFAULT 1, -- 1: Sihat/Tiada Gejala, 0: Tidak Melepasi Saringan
  temperature REAL,
  notes TEXT,
  staff_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- Seed Initial Realistic Sample Appointments
INSERT OR IGNORE INTO appointments (
  id, patient_id, visitor_name, visitor_ic_passport, visitor_phone,
  relationship, purpose, scheduled_date, scheduled_time, duration_minutes,
  pax_count, status, check_in_time, check_out_time, health_declaration,
  temperature, notes, staff_user_id, created_at, updated_at
) VALUES 
(
  'apt_001', 'pt_001', 'Mohd Farhan bin Ahmad', '901205-14-5541', '012-3456789',
  'Anak', 'Lawatan Pesakit', date('now'), '10:00 AM', 60,
  2, 'Checked-In', datetime('now', '-45 minutes'), NULL, 1,
  36.5, 'Membawa buah-buahan dan keperluan pakaian', 'usr_admin', datetime('now', '-2 days'), datetime('now')
),
(
  'apt_002', 'pt_004', 'Nurul Huda binti Daud', '880314-10-5122', '017-8899123',
  'Adik-beradik', 'Lawatan Pesakit', date('now'), '02:30 PM', 45,
  1, 'Scheduled', NULL, NULL, 1,
  NULL, 'Temujanji ziarah petang', 'usr_admin', datetime('now', '-1 day'), datetime('now')
),
(
  'apt_003', 'pt_002', 'Dr. Shanti a/p Ramasamy', '760519-08-5432', '019-4455667',
  'Doktor Pakar', 'Konsultasi Perubatan', date('now', '+1 day'), '11:00 AM', 60,
  1, 'Scheduled', NULL, NULL, 1,
  NULL, 'Sesi semakan rehabilitasi mobiliti dan anggota fizikal', 'usr_admin', datetime('now', '-3 days'), datetime('now')
),
(
  'apt_004', 'pt_005', 'Tan Mei Ling', '920808-14-5234', '016-7788990',
  'Anak', 'Hantar Barang / Ubat', date('now', '-1 day'), '04:00 PM', 30,
  1, 'Completed', datetime('now', '-1 day', '+16 hours'), datetime('now', '-1 day', '+16 hours', '+35 minutes'), 1,
  36.4, 'Penyerahan bekalan lampin pakai buang dan susu khas', 'usr_admin', datetime('now', '-3 days'), datetime('now', '-1 day')
);
