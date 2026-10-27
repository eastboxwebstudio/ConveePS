-- Migration: 0004_dapud_enhancements_and_tca.sql
-- Penambahbaikan Catatan Pemantauan Syif (DAPUD), Peringatan TCA Kanban, Lampiran Gambar Inventori, dan Storage Cloudflare R2

-- 1. Penambahan kolum pada jadual monitoring_records (DAPUD)
-- Patient condition, Diet plan, Tube details, Patient Behavior, Gambar & Nasihat Jururawat
ALTER TABLE monitoring_records ADD COLUMN diet_plan TEXT;
ALTER TABLE monitoring_records ADD COLUMN tube_has_ngt INTEGER DEFAULT 0;
ALTER TABLE monitoring_records ADD COLUMN tube_has_cbd INTEGER DEFAULT 0;
ALTER TABLE monitoring_records ADD COLUMN tube_type TEXT;
ALTER TABLE monitoring_records ADD COLUMN tube_material TEXT; -- 'silicone' / 'PVC'
ALTER TABLE monitoring_records ADD COLUMN tube_replacement_date TEXT;
ALTER TABLE monitoring_records ADD COLUMN tube_size TEXT;
ALTER TABLE monitoring_records ADD COLUMN patient_behavior TEXT; -- Pilihan tingkah laku bertanda (Calm, Agitated, Verbal Aggression, etc.)
ALTER TABLE monitoring_records ADD COLUMN attachment_image TEXT; -- Lampiran gambar berkaitan (Disimpan di Cloudflare R2 Storage)
ALTER TABLE monitoring_records ADD COLUMN nurse_advice TEXT; -- Nasihat / Arahan khusus jururawat untuk syif seterusnya
ALTER TABLE monitoring_records ADD COLUMN urine_other TEXT; -- Catatan khusus urin jika 'Other'

-- 2. Penambahan kolum pada jadual admissions untuk Temujanji TCA (To Come Again)
ALTER TABLE admissions ADD COLUMN tca_date TEXT; -- Tarikh temujanji susulan hospital/klinik (YYYY-MM-DD)
ALTER TABLE admissions ADD COLUMN tca_location TEXT; -- Hospital / Fasiliti (cth: Hospital Selayang, HKL)
ALTER TABLE admissions ADD COLUMN tca_remarks TEXT; -- Catatan persediaan temujanji TCA

-- 3. Penambahan kolum gambar pada jadual inventori pesakit & profil pesakit (Disimpan di Cloudflare R2 Storage)
ALTER TABLE patient_inventory_items ADD COLUMN image_url TEXT; -- Gambar rujukan barang/ubat R2
ALTER TABLE patient_inventory_check_details ADD COLUMN image_url TEXT; -- Snapshot gambar semakan
ALTER TABLE patients ADD COLUMN photo_url TEXT; -- Foto profil / avatar pesakit R2

-- 4. Indeks untuk carian tarikh TCA
CREATE INDEX IF NOT EXISTS idx_admissions_tca ON admissions(kanban_stage, tca_date);

-- 5. Peranan Pengguna Baharu (New Role: Caregiver)
-- Menyokong peranan Caregiver (Penjaga Pesakit) selain Admin dan Staff Nurse bagi tugasan harian & semakan inventori
-- Peranan: 'admin', 'staff_nurse', 'caregiver'
