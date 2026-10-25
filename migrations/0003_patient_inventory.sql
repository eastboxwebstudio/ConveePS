-- Migration: 0003_patient_inventory.sql
-- Modul Inventori Peralatan & Ubatan Pesakit (CECC - Patient Personal Items & Medication Weekly Stock Check)

PRAGMA foreign_keys = ON;

-- 1. Table for current patient inventory items (both personal items and medications)
CREATE TABLE IF NOT EXISTS patient_inventory_items (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('personal', 'medication')),
    item_order INTEGER DEFAULT 0,
    item_name TEXT NOT NULL,
    stock_balance TEXT NOT NULL DEFAULT '0',
    stock_necessity TEXT NOT NULL DEFAULT 'NO' CHECK(stock_necessity IN ('YES', 'NO')),
    restock_date TEXT,
    restock_qty TEXT,
    remark TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- 2. Table for weekly stock check logs
CREATE TABLE IF NOT EXISTS patient_inventory_checks (
    id TEXT PRIMARY KEY,
    patient_id TEXT NOT NULL,
    check_date TEXT NOT NULL, -- e.g. 2026-09-30 or YYYY-MM-DD
    personal_staff_name TEXT NOT NULL, -- e.g. HAJAR
    med_staff_name TEXT, -- e.g. AISYAH
    status TEXT NOT NULL DEFAULT 'Completed' CHECK(status IN ('Draft', 'Completed', 'Approved')),
    total_items INTEGER DEFAULT 0,
    total_restock_needed INTEGER DEFAULT 0,
    general_remarks TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- 3. Table for historical snapshots of checked items in each weekly check
CREATE TABLE IF NOT EXISTS patient_inventory_check_details (
    id TEXT PRIMARY KEY,
    check_id TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('personal', 'medication')),
    item_name TEXT NOT NULL,
    stock_balance TEXT NOT NULL,
    stock_necessity TEXT NOT NULL DEFAULT 'NO' CHECK(stock_necessity IN ('YES', 'NO')),
    restock_date TEXT,
    restock_qty TEXT,
    remark TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (check_id) REFERENCES patient_inventory_checks(id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
);

-- Indexes for swift queries
CREATE INDEX IF NOT EXISTS idx_inventory_items_patient ON patient_inventory_items(patient_id, category);
CREATE INDEX IF NOT EXISTS idx_inventory_checks_patient ON patient_inventory_checks(patient_id, check_date);
CREATE INDEX IF NOT EXISTS idx_inventory_check_details ON patient_inventory_check_details(check_id);

-- 4. Seed CECC Patients from the spreadsheet tabs if they do not exist
INSERT OR IGNORE INTO patients (id, mrn, full_name, gender, age, date_of_birth, zone, room_bed, primary_diagnosis, prescribed_medications, follow_up_facility, emergency_contact_name, emergency_contact_phone, care_level, baseline_mobility, feeding_method, status)
VALUES
('pt_cecc_01', 'CECC-001', 'Aisah Bebe', 'Female', 74, '1952-05-14', 'Zon Perempuan', 'Katil P-01', 'Hypertension, Dyslipidemia, Mild Cognitive Impairment', 'Uthvital NMN+, Aspirin 100mg, Amlodipine 5mg, Atenolol 50mg', 'HUKM', 'Faridah (Anak)', '012-3344551', 'Partial Assist', 'Able to ambulate with assistance', 'Oral normal diet', 'Active'),
('pt_cecc_02', 'CECC-002', 'Sharifah', 'Female', 78, '1948-09-10', 'Zon Perempuan', 'Katil P-02', 'Osteoporosis, Hypertension, General Frailty', 'Calcium + Vit D, Losartan 50mg OD', 'Hospital Ampang', 'Syed Ali (Anak)', '017-9988112', 'Partial Assist', 'Walking frame', 'Oral soft diet', 'Active'),
('pt_cecc_03', 'CECC-003', 'Guljan', 'Female', 69, '1957-03-22', 'Zon Perempuan', 'Katil P-03', 'Post CVA Stroke, Right Hemiparesis', 'Aspirin 100mg OD, Atorvastatin 20mg ON', 'HKL', 'Zahra (Anak)', '013-7766554', 'Total Assist', 'Wheelchair bound', 'Oral pureed', 'Active'),
('pt_cecc_04', 'CECC-004', 'Baheram', 'Male', 71, '1955-11-12', 'Zon Lelaki', 'Katil L-01', 'Type 2 Diabetes, Hypertension, Neuropathy', 'Metformin 500mg BD, Mecobalamin 500mcg TDS', 'Hospital Serdang', 'Hassan (Anak)', '018-2233441', 'Independent', 'Able to ambulate', 'Diabetic diet', 'Active'),
('pt_cecc_05', 'CECC-005', 'Madznah', 'Female', 82, '1944-07-08', 'Zon Perempuan', 'Katil P-04', 'Dementia, Hypertension', 'Memantine 10mg OD, Amlodipine 5mg OD', 'HUKM', 'Salmah (Anak)', '019-4455663', 'Total Assist', 'Bedbound', 'Oral soft diet', 'Active'),
('pt_cecc_06', 'CECC-006', 'Azizah Malik', 'Female', 76, '1950-01-15', 'Zon Perempuan', 'Katil P-05', 'Parkinson Disease, Chronic Back Pain', 'Levodopa/Benserazide, Paracetamol 1g PRN', 'Hospital Selayang', 'Azlan (Anak)', '012-8877661', 'Partial Assist', 'Wheelchair bound', 'Oral soft diet', 'Active'),
('pt_cecc_07', 'CECC-007', 'Nazil Bibi', 'Female', 68, '1958-08-30', 'Zon Perempuan', 'Katil P-06', 'Hypertension, Dyslipidemia', 'Telmisartan 40mg OD, Rosuvastatin 10mg ON', 'Klinik Kesihatan Cheras', 'Imran (Anak)', '016-5544332', 'Independent', 'Able to ambulate', 'Normal diet', 'Active'),
('pt_cecc_08', 'CECC-008', 'Nyaros', 'Female', 80, '1946-12-04', 'Zon Perempuan', 'Katil P-07', 'Severe Osteoarthritis, Hypertension', 'Glucosamine, Perindopril 4mg OD', 'Hospital Serdang', 'Kamariah (Anak)', '011-3322119', 'Partial Assist', 'Walking frame', 'Normal diet', 'Active'),
('pt_cecc_09', 'CECC-009', 'Ridzowal', 'Male', 73, '1953-06-19', 'Zon Lelaki', 'Katil L-02', 'Chronic Bronchitis, Hypertension', 'Salbutamol Inhaler, Amlodipine 10mg OD', 'HKL', 'Rahim (Anak)', '014-9988776', 'Independent', 'Able to ambulate', 'Normal diet', 'Active'),
('pt_cecc_10', 'CECC-010', 'Esah', 'Female', 77, '1949-04-25', 'Zon Perempuan', 'Katil P-08', 'Dementia, Frailty', 'Donepezil 5mg ON', 'Hospital Ampang', 'Khadijah (Anak)', '017-6655441', 'Total Assist', 'Wheelchair bound', 'Soft diet', 'Active'),
('pt_cecc_11', 'CECC-011', 'Fauziah', 'Female', 65, '1961-10-18', 'Zon Perempuan', 'Katil P-09', 'Post Hip Surgery Rehab, Osteopenia', 'Calcium + Vit D, Tramadol PRN', 'HUKM', 'Fariq (Anak)', '012-1122334', 'Partial Assist', 'Crutches/Frame', 'Normal diet', 'Active'),
('pt_cecc_12', 'CECC-012', 'Azizah Ismail', 'Female', 79, '1947-02-11', 'Zon Perempuan', 'Katil P-10', 'Hypertension, Hypothyroidism', 'Eltroxin 50mcg OD, Losartan 50mg OD', 'HKL', 'Zainab (Anak)', '019-3322445', 'Partial Assist', 'Walking frame', 'Normal diet', 'Active');

-- 5. Seed Admissions for CECC patients
INSERT OR IGNORE INTO admissions (id, patient_id, admission_number, admission_date, admission_time, zone, room_bed, admitted_by, lifecycle_status, kanban_stage, admission_remarks)
VALUES
('adm_cecc_01', 'pt_cecc_01', 'ADM-2026-C01', date('now', '-60 days'), '10:00', 'Zon Perempuan', 'Katil P-01', 'usr_admin_01', 'Active', 'New Admission', 'Semakan mingguan inventori dan ubat berjadual'),
('adm_cecc_02', 'pt_cecc_02', 'ADM-2026-C02', date('now', '-50 days'), '11:00', 'Zon Perempuan', 'Katil P-02', 'usr_admin_01', 'Active', 'New Admission', 'Pesakit jagaan warga emas standard'),
('adm_cecc_03', 'pt_cecc_03', 'ADM-2026-C03', date('now', '-40 days'), '14:00', 'Zon Perempuan', 'Katil P-03', 'usr_admin_01', 'Active', 'Hospitalisation', 'Pemantauan strok'),
('adm_cecc_04', 'pt_cecc_04', 'ADM-2026-C04', date('now', '-35 days'), '09:30', 'Zon Lelaki', 'Katil L-01', 'usr_admin_01', 'Active', 'New Admission', 'Kawalan kencing manis dan pemantauan ubat'),
('adm_cecc_05', 'pt_cecc_05', 'ADM-2026-C05', date('now', '-30 days'), '15:20', 'Zon Perempuan', 'Katil P-04', 'usr_admin_01', 'Active', 'New Admission', 'Jagaan rapi demensia'),
('adm_cecc_06', 'pt_cecc_06', 'ADM-2026-C06', date('now', '-25 days'), '10:45', 'Zon Perempuan', 'Katil P-05', 'usr_admin_01', 'Active', 'New Admission', 'Bantuan peribadi dan ubat Parkinson'),
('adm_cecc_07', 'pt_cecc_07', 'ADM-2026-C07', date('now', '-20 days'), '11:15', 'Zon Perempuan', 'Katil P-06', 'usr_admin_01', 'Active', 'New Admission', 'Jagaan warga emas'),
('adm_cecc_08', 'pt_cecc_08', 'ADM-2026-C08', date('now', '-18 days'), '16:00', 'Zon Perempuan', 'Katil P-07', 'usr_admin_01', 'Active', 'New Admission', 'Fisioterapi dan bantuan mobiliti'),
('adm_cecc_09', 'pt_cecc_09', 'ADM-2026-C09', date('now', '-15 days'), '08:45', 'Zon Lelaki', 'Katil L-02', 'usr_admin_01', 'Active', 'New Admission', 'Pemantauan nebulizer & ubat'),
('adm_cecc_10', 'pt_cecc_10', 'ADM-2026-C10', date('now', '-10 days'), '13:30', 'Zon Perempuan', 'Katil P-08', 'usr_admin_01', 'Active', 'New Admission', 'Jagaan demensia'),
('adm_cecc_11', 'pt_cecc_11', 'ADM-2026-C11', date('now', '-8 days'), '10:00', 'Zon Perempuan', 'Katil P-09', 'usr_admin_01', 'Active', 'New Admission', 'Rehabilitasi ortopedik'),
('adm_cecc_12', 'pt_cecc_12', 'ADM-2026-C12', date('now', '-5 days'), '14:20', 'Zon Perempuan', 'Katil P-10', 'usr_admin_01', 'Active', 'New Admission', 'Jagaan rutin');

-- 6. Seed Aisah Bebe's Inventory directly from the uploaded spreadsheet
-- Section 1: Barangan Peribadi
INSERT OR REPLACE INTO patient_inventory_items (id, patient_id, category, item_order, item_name, stock_balance, stock_necessity, restock_date, restock_qty, remark)
VALUES
('inv_pt01_01', 'pt_cecc_01', 'personal', 1, 'Diaper', '3 paks', 'YES', '27/9', '5', 'Saiz L - Baki 3 pek perlu topup segera'),
('inv_pt01_02', 'pt_cecc_01', 'personal', 2, 'Wet Tissue', '6', 'NO', '', '', 'Stok mencukupi untuk 2 minggu'),
('inv_pt01_03', 'pt_cecc_01', 'personal', 3, 'Tissue', 'Cukup', 'NO', '', '', 'Dalam simpanan loker'),
('inv_pt01_04', 'pt_cecc_01', 'personal', 4, 'Underpad', '8 pcs', 'YES', '27/9', '2', 'Baki 8 keping - perlukan 2 pek baharu'),
('inv_pt01_05', 'pt_cecc_01', 'personal', 5, 'Adult Wipes', 'Cukup', 'NO', '', '', ''),
('inv_pt01_06', 'pt_cecc_01', 'personal', 6, 'Gloves', '0', 'YES', '', '', 'Habis - perlu restock saiz M'),
('inv_pt01_07', 'pt_cecc_01', 'personal', 7, 'Lotion / Cream', '1 botol', 'NO', '27/9', '1', 'cream aqueous'),
('inv_pt01_08', 'pt_cecc_01', 'personal', 8, 'Milk', '1 tin', 'NO', '', '', 'Ensure Gold vanilla'),
('inv_pt01_09', 'pt_cecc_01', 'personal', 9, 'Dressing item', 'Cukup', 'NO', '', '', 'Gauze dan micropore mencukupi'),
('inv_pt01_10', 'pt_cecc_01', 'personal', 10, 'Toiletries', 'Cukup', 'NO', '', '', 'Sabun mandian & syampu'),
('inv_pt01_11', 'pt_cecc_01', 'personal', 11, 'Shaver', 'Cukup', 'NO', '', '', '2 unit bilah'),
('inv_pt01_12', 'pt_cecc_01', 'personal', 12, 'Tooth Brush', 'Cukup', 'NO', '', '', 'Ubat gigi dan berus gigi lembut'),
('inv_pt01_13', 'pt_cecc_01', 'personal', 13, 'Tube', 'Tiada', 'NO', '', '', 'Tidak gunakan tiub Ryle'),
('inv_pt01_14', 'pt_cecc_01', 'personal', 14, 'Snacking Food', 'Ada', 'NO', '', '', 'PEANUT BUTTER, CREAM CHEESE, VITAGEN, ROTI');

-- Section 2: Ubatan Pesakit (15. Medicine)
INSERT OR REPLACE INTO patient_inventory_items (id, patient_id, category, item_order, item_name, stock_balance, stock_necessity, restock_date, restock_qty, remark)
VALUES
('inv_pt01_m01', 'pt_cecc_01', 'medication', 1, 'Uthvital NMN+', '6 tab', 'YES', '27/9', '', 'Perlu topup'),
('inv_pt01_m02', 'pt_cecc_01', 'medication', 2, 'Aspirin 100mg', '3 tab', 'YES', '27/9', '', 'Perlu topup'),
('inv_pt01_m03', 'pt_cecc_01', 'medication', 3, 'Amlodipine 5mg', '6 tab', 'YES', '27/9', '', 'Perlu topup'),
('inv_pt01_m04', 'pt_cecc_01', 'medication', 4, 'Atenolol 50mg', '2 tab', 'YES', '27/9', '', 'Perlu topup'),
('inv_pt01_m05', 'pt_cecc_01', 'medication', 5, 'Aspirin 100mg + Glycine 45mg', '14 tab', 'NO', '27/9', '14', 'Mencukupi'),
('inv_pt01_m06', 'pt_cecc_01', 'medication', 6, 'Multivitamin tablet (mvt)', '20 tab', 'NO', '27/9', '30', 'Mencukupi');

-- 7. Seed standard inventory items for Sharifah, Baheram and default patients so they are pre-populated
INSERT OR REPLACE INTO patient_inventory_items (id, patient_id, category, item_order, item_name, stock_balance, stock_necessity, restock_date, restock_qty, remark)
VALUES
('inv_pt02_01', 'pt_cecc_02', 'personal', 1, 'Diaper', '5 paks', 'NO', '25/9', '4', 'Mencukupi'),
('inv_pt02_02', 'pt_cecc_02', 'personal', 2, 'Wet Tissue', '4 pek', 'NO', '25/9', '2', ''),
('inv_pt02_04', 'pt_cecc_02', 'personal', 4, 'Underpad', '2 pcs', 'YES', '', '', 'Perlu restock segera'),
('inv_pt02_m01', 'pt_cecc_02', 'medication', 1, 'Calcium Carbonate + Vit D', '4 tab', 'YES', '', '', 'Perlu topup'),
('inv_pt02_m02', 'pt_cecc_02', 'medication', 2, 'Losartan 50mg', '18 tab', 'NO', '20/9', '30', 'Cukup');

-- 8. Seed latest weekly check record matching the image
INSERT OR REPLACE INTO patient_inventory_checks (id, patient_id, check_date, personal_staff_name, med_staff_name, status, total_items, total_restock_needed, general_remarks)
VALUES
('chk_pt01_sep30', 'pt_cecc_01', '2026-09-30', 'HAJAR', 'AISYAH', 'Completed', 20, 7, 'Semakan mingguan akhir bulan September. Keluarga telah dimaklumkan untuk membawa bekalan Diaper, Underpad dan Ubatan harian.');
