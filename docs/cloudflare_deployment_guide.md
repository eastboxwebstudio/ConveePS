# PANDUAN DEPLOYMENT: CLOUDFLARE WORKERS & D1
**Sistem:** Patient Monitoring System (Convee Care Centre)  
**Teknologi:** React + TypeScript (Vite), Cloudflare Workers, Cloudflare D1 (SQLite), Wrangler CLI

---

## 1. Struktur Projek

```
├── data/                       # Storan pangkalan data SQLite tempatan (development)
├── dist/                       # Hasil binaan frontend (Vite static build)
├── docs/                       # Dokumentasi analisis spreadsheet dan deployment
│   ├── phase1_spreadsheet_analysis.md
│   └── cloudflare_deployment_guide.md
├── migrations/                 # Migrasi SQL Cloudflare D1
│   ├── 0001_initial.sql        # Skema pangkalan data lengkap
│   └── 0002_seed.sql           # Data permulaan akaun dan rekod ujian
├── src/
│   ├── components/             # Komponen UI (Header, Kanban, ADL Board, Modals)
│   ├── context/                # AuthContext (Sesi & Peranan Pengguna)
│   ├── lib/                    # API Client (Type-safe Fetchers)
│   ├── server/                 # Logik API Backend & Pengesahan PBKDF2
│   │   ├── api.ts              # REST Endpoints
│   │   ├── auth.ts             # Pengesahan Sesi & Token
│   │   └── db.ts               # D1 / SQLite Adapter
│   ├── types/                  # Definisi TypeScript
│   ├── worker/                 # Cloudflare Worker Edge Entry Point (src/worker/index.ts)
│   ├── App.tsx                 # Aplikasi Utama
│   ├── index.css               # Tailwind CSS
│   └── main.tsx                # Entry point React
├── wrangler.toml               # Konfigurasi Cloudflare Workers & D1 Binding
├── package.json
└── tsconfig.json
```

---

## 2. Langkah-Langkah Deployment ke Cloudflare Workers & D1

### Langkah 1: Pasang Wrangler CLI
Jika belum dipasang:
```bash
npm install -g wrangler
```

### Langkah 2: Log Masuk ke Akaun Cloudflare
```bash
wrangler login
```

### Langkah 3: Cipta Pangkalan Data Cloudflare D1
Jalankan arahan berikut di terminal untuk menghasilkan pangkalan data D1:
```bash
wrangler d1 create patient-monitoring-d1
```
Terminal akan memaparkan output seperti berikut:
```toml
[[d1_databases]]
binding = "DB"
database_name = "patient-monitoring-d1"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

Salin `database_id` yang terhasil dan kemas kini fail `wrangler.toml` anda pada bahagian:
```toml
[[d1_databases]]
binding = "DB"
database_name = "patient-monitoring-d1"
database_id = "gantikan-dengan-database-id-anda"
migrations_dir = "./migrations"
```

### Langkah 4: Laksanakan Migrasi SQL ke D1 (Production)
Terapkan skema pangkalan data dan data permulaan ke Cloudflare D1 secara langsung:
```bash
# Terapkan migrasi 0001_initial.sql
wrangler d1 migrations apply patient-monitoring-d1 --remote
```

### Langkah 5: Bina Aset Frontend (Static Build)
```bash
npm run build
```
Ini akan menjana fail aset pengeluaran di dalam direktori `./dist`.

### Langkah 6: Deploy ke Cloudflare Workers
```bash
wrangler deploy
```
Workers akan memuat naik fail statik dari `./dist` dan mengaktifkan routing API yang terikat kepada pangkalan data D1 anda.

---

## 3. Akaun Default untuk Log Masuk Pertama (Bootstrap Credentials)

| Peranan | Nama Pengguna | Kata Laluan Sementara | Penerangan |
|---|---|---|---|
| **Admin** | `admin` | `Admin@123` | Akses penuh: Papan Pemuka, Pengurusan Staf, Log Audit, Eksport CSV, Pendaftaran & Discaj. |
| **Staff Nurse** | `nurse.hajar` | `Nurse@123` | Akses klinikal: Senarai Pesakit, Papan Kanban, Patient Care Board (ADL), Catatan Tanda Vital Syif (AM/Night). |
| **Staff Nurse** | `nurse.shahdan` | `Nurse@123` | Jururawat bertugas syif. |

*Nota Keselamatan: Kata laluan disimpan menggunakan enkripsi PBKDF2 SHA-256 bergaram (salted hash). Pentadbir disyorkan menukar kata laluan pada kali pertama log masuk melalui menu "Tetapan Akaun".*
