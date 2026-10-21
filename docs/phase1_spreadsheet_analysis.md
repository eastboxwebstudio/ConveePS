# FASA 1: ANALISIS STRUKTUR SPREADSHEET (SPREADSHEET ANALYSIS REPORT)
**Sistem:** Patient Monitoring System (Convee Care Centre)  
**Dokumen Rujukan:** Google Sheets (ID: `1komR-2Jqng8z-cRNR6y0DokP2IdI0NHsW59dPbjb5to`)  
**Tarikh Analisis:** 21 Oktober 2026  
**Status Privasi:** Data peribadi pesakit sebenar telah diasingkan dan dilindungi; hanya struktur medan, jenis data, formula dan aliran kerja yang dianalisis.

---

## 1. Senarai Tab (Worksheets / Views) & Fungsinya

| No | Tab / View | GID Asal | Jenis | Fungsi & Tujuan Utama |
|---|---|---|---|---|
| 1 | **Sheet4 (Patient Master / Admission Records)** | `1616194676` | Lembaran Data Induk | Mengandungi rekod profil pesakit dan maklumat kemasukan (Admission). Berfungsi sebagai pangkalan data profil pesakit (Master Patient Index) dan rekod pendaftaran masuk fasiliti. |
| 2 | **CAREGIVER \| Daily Patient Updates (DAPUD)** | `0` | Lembaran Data Pemantauan Berjadual | "Daily Patient Update Database". Lembaran utama di mana jururawat/penjaga merekodkan parameter klinikal harian, tanda vital, penjagaan harian (ADL), ubat-ubatan, laporan kejururawatan bagi setiap syif (AM/Night). |
| 3 | **Daily Patient Updates & Kanban Board Dashboard** | `716650735` | Paparan Kad / Papan Pemuka Klinikal | Dashboard KPI operasi (Total Patients, New Admissions, Discharges, Poor Appetite Alert, Refuse Meds Alert) serta papan Kanban klinikal berperingkat status (New Admission, Hospitalisation, Red Alert, TCA, Home Leave, Refuse Medication, Discharge). |
| 4 | **Patient Care Board 1** | `521989591` | Paparan Kanban Tugasan Penjagaan | Papan pemantauan visual mengikut status kestabilan (Stable, Red Alert, Unset) yang memaparkan kad pesakit lengkap dengan status pelaksanaan aktiviti penjagaan harian (hygiene, feeding, wound dressing, repositioning, mobilisation). Boleh dikelompokkan semula mengikut Syif, Penyakit, Selera, atau Status. |
| 5 | **Calc_Data** | `999054025` (sheetId: 6) | Lembaran Kiraan Metrik Ringkasan | Mengira metrik agregat operasi harian seperti *Unique Patients Today*, *Total Updates Today*, *AM Shift Updates*, *Night Shift Updates*, dan *Average Length of Stay*. |

---

## 2. Pemetaan Medan Terperinci (Field-by-Field Mapping)

### A. Lembaran `Sheet4` (Rekod Profil & Kemasukan Pesakit)

Pemeriksaan mendalam mendapati tajuk lajur (headers) asal pada baris 1 mempunyai ketidaksejajaran (column offset) pada data yang diisi oleh pengguna dalam spreadsheet:

| Lajur Asal | Tajuk Lajur Asal | Data Sebenar Diisi | Cadangan Medan Sistem (Database Field) | Jenis Data | Catatan / Keperluan Normalisasi |
|---|---|---|---|---|---|
| A | `Patient ID` | *(Kosong)* | `mrn` / `patient_id` | `VARCHAR(50)` (Unique) | Perlu dijana secara automatik (cth: `PT-2026-0001`) atau dimasukkan secara manual oleh Admin/Jururawat. |
| B | `Patient Name` | Nama Pesakit | `full_name` | `VARCHAR(150)` | Wajib (Required), indeks carian. |
| C | `Room/Bed` | *(Kosong dalam sheet)* | `room_bed` | `VARCHAR(50)` | Bilik / Nombor Katil pesakit di fasiliti. |
| D | `Gender` | Diisi Umur (cth: `56`, `79`) | `age` & `gender` | `age: INT`, `gender: ENUM('Male','Female','Other')` | Dalam sheet asal, lajur D dimasukkan nilai umur. Sistem web akan memisahkan `age` dan `gender` dengan tepat. |
| E | `Date of Birth` | Diisi Diagnosis (cth: `Stroke, HBP...`) | `dob` & `primary_diagnosis` | `dob: DATE`, `diagnosis: TEXT` | Dalam sheet asal, lajur E dimasukkan diagnosis. Sistem akan menyimpan kedua-duanya secara teratur. |
| F | `Medicine` | Senarai Ubat & Dos | `prescribed_medications` | `TEXT` | Senarai ubat berjadual pesakit beserta dos. |
| G | `Follow up Treatment` | Hospital Rujukan (cth: `HUKM`) | `follow_up_facility` | `VARCHAR(150)` | Fasiliti hospital atau tarikh/lokasi temujanji susulan (TCA). |
| H | `Admission Date` | Tarikh Masuk (Serial date) | `admission_date` | `DATE` | Tarikh pendaftaran pesakit masuk ke fasiliti. |
| I | `Contract Start` | Kiraan Tempoh (Formula `TODAY()-H`) | `length_of_stay` / `contract_start` | `INT` / `DATE` | Formula mengira bilangan hari berada di fasiliti. |
| J | `Contract End` | *(Kosong)* | `contract_end_date` | `DATE` (Nullable) | Tarikh tamat kontrak penginapan/jagaan jika ada. |
| K | `Care Level` | *(Kosong)* | `care_level` | `ENUM('Independent','Partial Assist','Total Assist')` | Tahap kebergantungan pesakit. |
| L | `Mobility` | *(Kosong)* | `baseline_mobility` | `VARCHAR(50)` | Keupayaan mobiliti asas pesakit. |
| M | `Feeding Method` | *(Kosong)* | `feeding_method` | `VARCHAR(50)` | Oral / Ryle's Tube / PEG tube. |
| N | `Main Diagnosis/Condition`| *(Kosong)* | `primary_diagnosis` | `TEXT` | Dipautkan ke rekod klinikal. |
| O | `Emergency Contact` | *(Kosong)* | `emergency_contact_name` | `VARCHAR(150)` | Waris / Penjaga kecemasan. |
| P | `Emergency Contact No.` | *(Kosong)* | `emergency_contact_phone`| `VARCHAR(50)` | Nombor telefon waris. |
| Q | `Status` | *(Kosong)* | `admission_status` | `ENUM` | Status semasa: `Active`, `Discharged`, `Hospitalised`, `Home Leave`. |
| R | `Discharge Date` | *(Kosong)* | `discharge_date` | `TIMESTAMP` (Nullable) | Tarikh & masa pesakit discaj. |
| S | `Remarks` | *(Kosong)* | `remarks` | `TEXT` (Nullable) | Catatan pentadbiran / kemasukan. |

---

### B. Lembaran `CAREGIVER | Daily Patient Updates (DAPUD)` (Rekod Pemantauan Harian)

Setiap baris merupakan rekod pemerhatian klinikal pada syif tertentu:

| Lajur | Tajuk Lajur | Nilai Sampel (Dikesan) | Cadangan Medan Sistem | Jenis Data | Huraian Medan |
|---|---|---|---|---|---|
| B | `Timestamp` | Tarikh & Masa | `observation_timestamp` | `TIMESTAMP` | Tarikh dan masa rekod dimasukkan. |
| C | `Shift` | `AM 7am-7pm`, `Night 7pm-7am` | `shift` | `VARCHAR(20)` | Syif bertugas jururawat. |
| D | `Staff full name` | Nama Jururawat | `staff_user_id` / `staff_name` | `UUID / FK` | Dipautkan terus ke akaun jururawat yang disahkan. |
| E | `Patient Name` | Nama Pesakit | `patient_id` / `admission_id` | `UUID / FK` | Pautan ke pesakit aktif. |
| F | `Age` | `45` - `85` | *(Dari Profil Pesakit)* | `INT` | Diambil automatik dari profil kemasukan (auto-fetch). |
| G | `Illness` | `STROKE`, `DEMENTIA`, `CKD` | *(Dari Profil Pesakit)* | `TEXT` | Diagnosis utama (auto-fetch daripada admission). |
| H | `DOA` | Tarikh Masuk | *(Dari Profil Pesakit)* | `DATE` | Date of Admission (auto-fetch). |
| I | `Length of Stay (count of days)` | Formula `TODAY() - H` | `length_of_stay` | `INT` (Dihitung) | Bilangan hari pesakit berada di fasiliti. |
| J | `Patient Status` | `Stable`, `Red Alert` | `patient_clinical_status` | `ENUM('Stable','Red Alert')` | Status klinikal semasa pemerhatian dibuat. |
| K | `Blood Pressure` | `110/73`, `177/50`, `200/100` | `blood_pressure` | `VARCHAR(20)` | Bacaan tekanan darah (Systolic/Diastolic mmHg). |
| L | `Pulse` | `75.0` - `120.0` | `pulse_rate` | `INT` | Kadar denyutan nadi (bpm). |
| M | `Temperature` | `36.5` - `39.0` | `temperature` | `DECIMAL(4,1)` | Suhu badan pesakit (°C). |
| N | `SPO 2` | `80.0` - `99.0` | `spo2` | `INT` | Ketepuan oksigen dalam darah (% SpO2). |
| O | `Blood sugar` | `5.5`, `11.0`, `-` | `blood_sugar` | `VARCHAR(20)` / `DECIMAL` | Bacaan glukosa darah (mmol/L), boleh '-' jika tiada arahan ujian. |
| P | `Pain level` | `0.0`, `1.0`, `2.0` (skala 0-10) | `pain_level` | `INT` | Skala kesakitan (0 = No Pain, 10 = Worst Pain). |
| Q | `General condition` | `STABLE` | `general_condition` | `VARCHAR(50)` | Keadaan am fizikal pesakit. |
| R | `Consciousness` | `ALERT` | `consciousness_level` | `VARCHAR(50)` | Tahap kesedaran (cth: Alert, Drowsy, Unresponsive). |
| S | `Mobility` | `ABLE TO AMBULATE` | `mobility_status` | `VARCHAR(50)` | Status pergerakan fizikal pada syif semasa. |
| T | `Appetite` | `GOOD`, `POOR` | `appetite` | `ENUM('GOOD','FAIR','POOR')` | Selera makan. Nilai `POOR` mencetuskan amaran "Poor Appetite". |
| U | `Urine` | `NORMAL` | `urine_output` | `VARCHAR(50)` | Corak/isipadu kencing (Normal, Incontinent, Catheter). |
| V | `Bowel` | `0`, `1` | `bowel_movement` | `INT` / `BOOLEAN` | Kekerapan buang air besar dalam syif (0 = belum, 1+ = ada). |
| W | `Medication intake` | `SERVED`, `REFUSE` | `medication_intake` | `ENUM('SERVED','REFUSE','WITHHELD')` | Pemberian ubat. `REFUSE` mencetuskan amaran "Refuse Meds Alert". |
| X | `Bath / personal hygiene` | `Normal shower`, `Sponging and bed bath` | `hygiene_care` | `VARCHAR(50)` | Mandian biasa atau lap badan di katil. |
| Y | `Feeding / hydration` | `DONE`, `0`, `N/A` | `feeding_care` | `VARCHAR(20)` | Pelaksanaan bantuan makan/minum. |
| Z | `Wound / dressing` | `DONE`, `0`, `N/a`, `1` | `wound_dressing` | `VARCHAR(20)` | Pelaksanaan rawatan luka/dressing. |
| AA | `Repositioning` | `DONE`, `0`, `N/A` | `repositioning` | `VARCHAR(20)` | Penukaran posisi baring (cegah luka tekanan/bed sores). |
| AB | `Mobilisation` | `DONE`, `0`, `1` | `mobilisation` | `VARCHAR(20)` | Aktiviti pergerakan/fisioterapi ringkas. |
| AC | `Nursing Report` | Teks catatan jururawat | `nursing_report` | `TEXT` | Laporan naratif perkembangan pesakit. |
| AD | `Rehab Assessment` | Catatan rehabilitasi | `rehab_assessment` | `TEXT` | Penilaian fisioterapi atau jurupulih. |
| AE | `Visitor Log` | Log pelawat | `visitor_log` | `TEXT` | Catatan nama waris/pelawat yang hadir. |
| AF | `Home Leave / Outing` | `DONE`, `0` | `home_leave` | `BOOLEAN / VARCHAR(20)` | Status pesakit keluar bercuti sementara bersama keluarga. |
| AG | `New Admission` | `1`, `0` | `is_new_admission` | `BOOLEAN` | Penanda sama ada ini rekod kemasukan hari pertama. |
| AH | `Discharge` | `1`, `0`, `N/A` | `is_discharge` | `BOOLEAN` | Penanda pelepasan/discaj pesakit. |

---

## 3. Analisis Medan Bertindih & Perkaitan Data (Duplicate / Related Fields)

1. **Maklumat Demografik Pesakit Berulang (Redundant Denormalization):**  
   - Dalam spreadsheet asal `CAREGIVER | Daily Patient Updates`, setiap kali jururawat memasukkan bacaan syif, mereka perlu mengisi semula nama, umur, penyakit (illness), dan tarikh kemasukan (DOA).
   - **Penyelesaian Seni Bina Pangkalan Data (Normalized Schema):**
     - Maklumat statik (Nama, No Pengenalan, Umur/Tarikh Lahir, Jantina, Penyakit Utama, Ubat Asas, Waris) disimpan sekali sahaja dalam jadual `patients` dan `admissions`.
     - Setiap rekod `monitoring_records` hanya memegang `admission_id`, `shift`, `staff_user_id`, dan tanda klinikal harian. Apabila paparan dibuka, sistem memautkan (JOIN/auto-fetch) maklumat profil secara automatik tanpa duplikasi data.

2. **Ketidaksejajaran Lajur Sheet4:**  
   - Sheet4 memaparkan tajuk lajur standard pendaftaran, tetapi data baris kedua dan seterusnya teralih ke kiri atau menggunakan lajur sedia ada untuk nilai berlainan (contohnya Lajur D "Gender" diisi umur, Lajur E "Date of Birth" diisi diagnosis).
   - **Penyelesaian:** Pangkalan data D1 akan membina skema rasmi yang mempunyai lajur jelas dan terpisah (`age`, `gender`, `date_of_birth`, `primary_diagnosis`, `medications`), mengelakkan ralat data.

3. **Status Pesakit Bertingkat (Clinical vs Lifecycle Status):**  
   - Terdapat perbezaan antara:
     - **Status Kitar Hayat Kemasukan (Admission Lifecycle Status):** `Active`, `Discharged`, `Hospitalised` (di rujuk hospital luar seperti HUKM), `Home Leave` (keluar bercuti), `Cancelled`.
     - **Status Klinikal Semasa (Clinical Acuity Status):** `Stable`, `Red Alert` (bacaan vital di luar jangkaan seperti BP tinggi atau SpO2 rendah).
     - **Status Amaran Khusus (Trigger Alerts):** `Poor Appetite` (jika Appetite = 'POOR'), `Refuse Meds` (jika Medication = 'REFUSE').

---

## 4. Aliran Kerja & Papan Kanban (Workflow & Status Mapping)

Berdasarkan definisi pada tab `716650735` (*Daily Patient Updates & Kanban Board Dashboard*) dan `521989591` (*Patient Care Board 1*), aliran kerja fasiliti terdiri daripada:

### A. Tahap Papan Kanban Klinikal (Clinical Kanban Stages)
1. **New Admission:** Pesakit yang baru didaftarkan ke pusat jagaan dalam tempoh penilaian kemasukan.
2. **Hospitalisation / Ward:** Pesakit yang sedang aktif dirawat dalam wad biasa pusat jagaan.
3. **Red Alert:** Pesakit yang memerlukan perhatian intensif disebabkan bacaan tanda vital membimbangkan (cth: Demam panas, BP krisis, SpO2 rendah, perubahan kesedaran).
4. **TCA (To Come Again / Hospital Follow-up):** Pesakit yang mempunyai jadual temujanji susulan hospital luar (seperti temujanji HUKM).
5. **Home Leave / Outing:** Pesakit yang dibenarkan keluar bercuti sementara bersama waris/keluarga.
6. **Refuse Medication:** Pesakit yang menolak ubat dalam syif semasa, memerlukan kaunseling jururawat atau penilaian semula doktor/penjaga.
7. **Discharge:** Pesakit yang telah selesai proses discaj pentadbiran dan klinikal.

### B. Matriks Kebenaran Mengikut Peranan (Role Permission Matrix)
- **Admin:**
  - Pendaftaran pesakit baru (Admission).
  - Mengesahkan dan meluluskan proses Discaj rasmi.
  - Mengurus akaun jururawat (cipta akaun, reset passcode, aktif/nyahaktif, batal sesi aktif).
  - Mengakses log audit lengkap (Audit Trail).
  - Menjana dan mengeksport laporan statistik/CSV.
  - Mengubah maklumat konfigurasi fasiliti (bilik, katil, syif).
- **Staff Nurse:**
  - Melihat senarai pesakit dan membuka profil pesakit.
  - Memasukkan rekod pemantauan tanda vital dan tugasan penjagaan harian (ADL) bagi syif AM / Night.
  - Menandakan status ubat (`SERVED`, `REFUSE`).
  - Menulis laporan kejururawatan (`Nursing Report`) dan kemas kini log pelawat.
  - Memulakan permohonan discaj (Discharge request) untuk pengesahan pentadbir.
  - Melihat sejarah kronologi pesakit tanpa kebenaran memadam rekod lalu.

---

## 5. Pemetaan Formula & Pengesahan Data (Formulas & Validation)

1. **Formula `Length of Stay (count of days)`:**
   - Formula asal spreadsheet: `=IF(DOA="", "", TODAY() - DOA)`
   - Pelaksanaan sistem: Dihitung secara automatik di backend daripada `admission_date` hingga tarikh semasa (atau hingga `discharge_date` jika telah discaj).
2. **Formula Ringkasan Metrik (Tab `Calc_Data` & Header DAPUD):**
   - `Total Patients Today`: Bilangan pesakit unik yang mempunyai status kemasukan aktif (`COUNT(DISTINCT patient_id) WHERE status = 'Active'`).
   - `AM Shift Updates`: Bilangan rekod pemantauan syif pagi pada tarikh semasa (`COUNT(*) WHERE shift = 'AM 7am-7pm' AND DATE(timestamp) = CURRENT_DATE`).
   - `Night Shift Updates`: Bilangan rekod pemantauan syif malam pada tarikh semasa (`COUNT(*) WHERE shift = 'Night 7pm-7am' AND DATE(timestamp) = CURRENT_DATE`).
   - `Total Updates Today`: Jumlah keseluruhan catatan pemantauan hari ini (`AM + Night`).
   - `Avg Length of Stay`: Purata bilangan hari penginapan semua pesakit aktif (`AVG(JULIANDAY('now') - JULIANDAY(admission_date))`).
3. **Syarat Pengesahan Input (Validation Rules):**
   - Tekanan darah (`Blood Pressure`): Format `XXX/YY` (contoh: `120/80`).
   - Nadi (`Pulse`): Integer positif (30 - 220 bpm).
   - Suhu (`Temperature`): Nombor perpuluhan (34.0°C - 42.0°C).
   - SpO2: Peratusan (50% - 100%).
   - Skala Kesakitan (`Pain level`): Integer 0 hingga 10.
   - Pilihan Terhad (Dropdowns):
     - Syif: `AM 7am-7pm`, `Night 7pm-7am`
     - Status Pesakit: `Stable`, `Red Alert`
     - Pengambilan Ubat: `SERVED`, `REFUSE`, `WITHHELD`
     - Selera: `GOOD`, `FAIR`, `POOR`
     - Mandian/Kebersihan: `Normal shower`, `Sponging and bed bath`
     - Tugasan ADL (Feeding, Dressing, Repositioning, Mobilisation): `DONE`, `0`, `N/A`

---

## 6. Laporan Operasi & Analitik yang Diperlukan (Reporting Requirements)

1. **Laporan Ringkasan Eksekutif Harian (Daily Operational Summary):**
   - Ringkasan kemasukan baru vs discaj.
   - Kehadiran amaran kritikal harian: Senarai pesakit `Red Alert`, `Refuse Meds`, dan `Poor Appetite`.
2. **Laporan Sejarah Pemantauan Klinikal (Patient Monitoring History Timeline):**
   - Garis masa kronologi bacaan tanda vital dan aktiviti penjagaan pesakit mengikut syif.
   - Pilihan eksport rekod ke format CSV berpaginasi bagi tujuan audit atau rujukan doktor.
3. **Laporan Purata Tempoh Rawatan (Length of Stay Report):**
   - Analisis taburan tempoh tinggal pesakit di pusat jagaan (cth: <30 hari, 1-6 bulan, >1 tahun).
4. **Log Audit & Keselamatan (Audit Trail Report):**
   - Rekod aktiviti capaian: Siapa yang log masuk, memasukkan rekod pemantauan, membuat pindaan profil pesakit, atau meluluskan discaj.

---

## 7. Soalan Pengesahan Sebelum Memulakan Fasa 2 (Pangkalan Data & Seni Bina)

Sebelum melangkah ke reka bentuk skema SQL D1 dan backend Cloudflare Workers, berikut adalah beberapa perkara untuk pengesahan:

1. **Format Nombor Pendaftaran Pesakit (Patient ID / MRN):** Adakah fasiliti mempunyai format ID khas (contoh: `CCC-2026-001`) atau adakah anda ingin sistem menjana nombor siri automatik?
2. **Kategori Bilik / Katil (Room & Bed Allocation):** Adakah fasiliti menggunakan nama wad/bilik khusus (contoh: Bilik 101, Katil A, dsb.) yang ingin dipaparkan dalam penapis?
3. **Tempoh Syif Bertugas:** Adakah pembahagian 2 syif iaitu **AM (7am - 7pm)** dan **Night (7pm - 7am)** mencukupi dan mengikut operasi semasa fasiliti anda?
4. **Dasar Kelulusan Discaj (Discharge Approval):** Adakah Staff Nurse hanya dibenarkan membuat *permohonan discaj*, manakala pengesahan akhir status *Discharged* mesti diluluskan oleh Admin?

---
*Laporan Analisis Fasa 1 selesai. Sila semak struktur dan pemetaan di atas untuk membolehkan kita meneruskan ke Fasa 2 (Reka Bentuk Pangkalan Data D1 & Migrasi).*
