# DOKUMEN PENYERAHAN SISTEM (HANDOVER DOCUMENTATION)
**Sistem:** Patient Monitoring System (Convee Care Centre)  
**Versi:** 1.0.0 (Production-Ready)  
**Seni Bina:** React + TypeScript (Vite), Cloudflare Workers, Cloudflare D1 (SQLite)  
**Tarikh Penyerahan:** 21 Oktober 2026

---

## 1. Ringkasan Sistem (System Overview)

Sistem Pemantauan Pesakit (*Patient Monitoring System*) ini dibina untuk mengurus dan memantau keseluruhan kitaran pesakit di **Convee Care Centre** dari saat pendaftaran kemasukan (*Admission*) sehingga pelepasan (*Discharge*). 

Sistem ini merealisasikan aliran kerja klinikal berasaskan pangkalan data **DAPUD (Daily Patient Update Database)** dengan visualisasi moden yang tenang dan bebas daripada rekaan *AI slop*.

---

## 2. Struktur Pangkalan Data D1 (Schema & Relationships)

Pangkalan data D1 SQLite terdiri daripada 7 jadual ternormalisasi yang dilindungi kekunci asing (*foreign keys*) dan indeks:

1. **`users`**: Menyimpan akaun pentadbir (*Admin*) dan jururawat (*Staff Nurse*) dengan enkripsi kata laluan bergaram PBKDF2 Web Crypto.
2. **`sessions`**: Menyimpan token sesi aktif sebelah pelayan dengan pengesahan tarikh luput.
3. **`patients`**: Indeks Induk Pesakit (*Master Patient Index*) dengan nombor MRN ringkas automatik (`PT-001`, `PT-002`...), umur, diagnosis utama, senarai ubat berjadual, fasiliti susulan (*TCA*), dan kenalan waris.
4. **`admissions`**: Rekod kemasukan pesakit, peruntukan Zon (Zon Lelaki / Zon Perempuan), nombor katil, dan fasa semasa papan Kanban.
5. **`monitoring_records`**: Rekod pemantauan bersiri masa (*time-series*) bagi setiap syif mengandungi tanda vital (BP, Nadi, Suhu, SpO2, Glukosa, Sakit), status klinikal (*Stable/Red Alert*), dan senarai tugasan penjagaan harian (ADL: Mandi, Suapan, Balutan Luka, Ubah Posisi Katil, Mobilisasi).
6. **`discharge_records`**: Rekod pelepasan rasmi yang mengandungi destinasi pulang, ringkasan pelepasan, ubat yang dibekalkan, dan pengesahan waris.
7. **`audit_logs`**: Jejak audit tidak boleh diubah (*immutable audit trail*) yang mencatatkan identiti staf, peranan, jenis tindakan, entiti sasaran, masa, dan alamat IP.

---

## 3. Matriks Kebenaran & Peranan Pengguna (Role & Permission Matrix)

| Ciri / Fungsi Sistem | Pentadbir (Admin) | Jururawat Bertugas (Staff Nurse) |
|---|:---:|:---:|
| Log masuk dengan kata laluan persendirian | Ya | Ya |
| Paparan Papan Pemuka Klinikal & KPI | Ya | Ya |
| Pendaftaran Kemasukan Pesakit Baru (*Auto MRN*) | Ya | Ya |
| Papan Kanban Klinikal (7 Fasa) | Ya | Ya |
| Patient Care Board (Tugasan Penjagaan Harian & ADL) | Ya | Ya |
| Catatan Tanda Vital Syif (AM & Night Wajib) | Ya | Ya |
| Proses Discaj Pesakit Segera | Ya | Ya |
| Cipta Akaun Staf & Jururawat Baru | Ya | **Ditolak (403)** |
| Reset Kata Laluan Staf & Batal Sesi Aktif | Ya | **Ditolak (403)** |
| Aktifkan / Nyahaktifkan Akaun Staf | Ya | **Ditolak (403)** |
| Akses Log Audit Keselamatan Penuh | Ya | **Ditolak (403)** |
| Eksport Laporan Rasmi Format CSV | Ya | Ya |
| Tukar Kata Laluan Peribadi | Ya | Ya |

---

## 4. Jadual Syif & Pemeriksaan Tanda Vital

Fasiliti beroperasi dalam 3 syif bertugas, di mana **pemeriksaan tanda vital dijalankan 2x sehari**:

- **Syif AM (7:00am – 5:00pm):** Pemeriksaan tanda vital (BP, Kadar Nadi, Suhu Badan, SpO2) adalah **wajib**.
- **Syif PM (5:00pm – 9:00pm):** Pemantauan jagaan kejururawatan harian, hidangan makanan petang, dan pematuhan ubat.
- **Syif Night (9:00pm – 7:00am):** Pemeriksaan tanda vital (BP, Kadar Nadi, Suhu Badan, SpO2) adalah **wajib**.

Sistem secara automatik mencetuskan amaran **Red Alert** dan memindahkan pesakit ke lajur Red Alert jika dikesan nilai di luar jangkaan (Suhu $\ge$ 38.0°C, SpO2 $<$ 92%, Nadi $>$ 120 bpm atau $<$ 50 bpm).

---

## 5. Keputusan Ujian Automasi Fasa 5 (Test Execution Report)

Ujian automasi telah dijalankan menggunakan fail penguji `tests/run_tests.ts` dengan 15 senario ujian:

| No | Senario Ujian | Status | Masa Respons |
|---|---|:---:|:---:|
| 1 | Log Masuk Pentadbir (Admin Login Success) | **LULUS** | 142ms |
| 2 | Log Masuk Jururawat (Staff Nurse Login Success) | **LULUS** | 17ms |
| 3 | Penolakan Kata Laluan Tidak Sah (Invalid Passcode Rejection) | **LULUS** | 9ms |
| 4 | Pembatalan Sesi & Log Keluar (Logout & Session Invalidation) | **LULUS** | 36ms |
| 5 | Pentadbir Sahaja Boleh Urus Staf (Admin-Only Staff Management) | **LULUS** | 19ms |
| 6 | Sekatan Akses Log Audit untuk Jururawat (Nurse Audit Restriction) | **LULUS** | 42ms |
| 7 | Pendaftaran Kemasukan Pesakit & Auto MRN (Patient Admission Creation) | **LULUS** | 27ms |
| 8 | Pengesahan Tanda Vital Wajib Syif AM (Mandatory Vitals Validation on AM Shift) | **LULUS** | 14ms |
| 9 | Pengesanan Automatik Red Alert (Red Alert Auto Detection) | **LULUS** | 16ms |
| 10 | Aliran Pesakit Menolak Ubat (Refuse Medication Stage Transition) | **LULUS** | 13ms |
| 11 | Aliran Pelepasan / Discaj Segera (Direct Discharge Workflow) | **LULUS** | 14ms |
| 12 | Ketulenan Log Audit (Audit Trail Integrity) | **LULUS** | 6ms |
| 13 | Pencegahan Penduaan Nama Pengguna (Duplicate Username Prevention) | **LULUS** | 6ms |
| 14 | Penapisan Zon Lelaki & Perempuan (Zone & Status Filtering) | **LULUS** | 16ms |
| 15 | Penjanaan Eksport Laporan CSV (CSV Export Generation) | **LULUS** | 14ms |

**Kadar Kejayaan:** 15 / 15 Ujian Lulus (100% Pass Rate).

---

## 6. Kredensial Log Masuk Sedia Ada

| Peranan | Username | Passcode |
|---|---|---|
| **Admin** | `admin` | `Admin@123` |
| **Staff Nurse** | `nurse.hajar` | `Nurse@123` |
| **Staff Nurse** | `nurse.shahdan` | `Nurse@123` |
