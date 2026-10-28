import fs from 'node:fs';
import path from 'node:path';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';

let SQL: SqlJsStatic | null = null;
let dbInstance: Database | null = null;

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'local.d1.sqlite');
const MIGRATION_1 = path.resolve(process.cwd(), 'migrations/0001_initial.sql');
const MIGRATION_2 = path.resolve(process.cwd(), 'migrations/0002_seed.sql');
const MIGRATION_3 = path.resolve(process.cwd(), 'migrations/0003_patient_inventory.sql');
const MIGRATION_5 = path.resolve(process.cwd(), 'migrations/0005_appointments_visitors.sql');

function persistDb() {
  if (!dbInstance) return;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Failed to persist SQLite database to disk:', err);
  }
}

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  if (!SQL) {
    SQL = await initSqlJs();
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      dbInstance = new SQL.Database(fileBuffer);
    } catch {
      console.warn('Corrupt or invalid local DB file, creating fresh database...');
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  // Ensure tables exist
  try {
    const tableCheck = dbInstance.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
    const hasUsersTable = tableCheck.length > 0 && tableCheck[0].values.length > 0;

    if (!hasUsersTable) {
      console.log('Running D1 initial migration (0001_initial.sql)...');
      if (fs.existsSync(MIGRATION_1)) {
        const sql1 = fs.readFileSync(MIGRATION_1, 'utf-8');
        dbInstance.run(sql1);
      }
      console.log('Running D1 seed migration (0002_seed.sql)...');
      if (fs.existsSync(MIGRATION_2)) {
        const sql2 = fs.readFileSync(MIGRATION_2, 'utf-8');
        dbInstance.run(sql2);
      }
      persistDb();
      console.log('Database initialized and persisted successfully.');
    }

    const invCheck = dbInstance.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='patient_inventory_items'");
    const hasInvTable = invCheck.length > 0 && invCheck[0].values.length > 0;
    if (!hasInvTable) {
      console.log('Running D1 inventory migration (0003_patient_inventory.sql)...');
      if (fs.existsSync(MIGRATION_3)) {
        const sql3 = fs.readFileSync(MIGRATION_3, 'utf-8');
        dbInstance.run(sql3);
        persistDb();
        console.log('Patient inventory tables created and seeded.');
      }
    }

    const aptCheck = dbInstance.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='appointments'");
    const hasAptTable = aptCheck.length > 0 && aptCheck[0].values.length > 0;
    if (!hasAptTable) {
      console.log('Running D1 appointments migration (0005_appointments_visitors.sql)...');
      if (fs.existsSync(MIGRATION_5)) {
        const sql5 = fs.readFileSync(MIGRATION_5, 'utf-8');
        dbInstance.run(sql5);
        persistDb();
        console.log('Appointments & visitors tables created and seeded.');
      }
    }

    // Apply Migration 0004: DAPUD Enhancements, TCA, and Inventory Images
    try {
      const getColumns = (tableName: string): string[] => {
        const res = dbInstance!.exec(`PRAGMA table_info(${tableName})`);
        if (!res || res.length === 0) return [];
        return res[0].values.map((v) => String(v[1]));
      };

      const monCols = getColumns('monitoring_records');
      const addMonCol = (col: string, def: string) => {
        if (!monCols.includes(col)) {
          try {
            dbInstance!.run(`ALTER TABLE monitoring_records ADD COLUMN ${col} ${def}`);
          } catch (e) {
            console.warn(`Could not add column ${col} to monitoring_records:`, e);
          }
        }
      };
      addMonCol('diet_plan', 'TEXT');
      addMonCol('tube_has_ngt', 'INTEGER DEFAULT 0');
      addMonCol('tube_has_cbd', 'INTEGER DEFAULT 0');
      addMonCol('tube_type', 'TEXT');
      addMonCol('tube_material', 'TEXT');
      addMonCol('tube_replacement_date', 'TEXT');
      addMonCol('tube_size', 'TEXT');
      addMonCol('patient_behavior', 'TEXT');
      addMonCol('attachment_image', 'TEXT');
      addMonCol('nurse_advice', 'TEXT');
      addMonCol('urine_other', 'TEXT');

      const admCols = getColumns('admissions');
      const addAdmCol = (col: string, def: string) => {
        if (!admCols.includes(col)) {
          try {
            dbInstance!.run(`ALTER TABLE admissions ADD COLUMN ${col} ${def}`);
          } catch (e) {
            console.warn(`Could not add column ${col} to admissions:`, e);
          }
        }
      };
      addAdmCol('tca_date', 'TEXT');
      addAdmCol('tca_location', 'TEXT');
      addAdmCol('tca_remarks', 'TEXT');

      const invCols = getColumns('patient_inventory_items');
      if (!invCols.includes('image_url')) {
        try {
          dbInstance!.run('ALTER TABLE patient_inventory_items ADD COLUMN image_url TEXT');
        } catch (e) {
          console.warn('Could not add image_url to patient_inventory_items:', e);
        }
      }

      const invDetCols = getColumns('patient_inventory_check_details');
      if (!invDetCols.includes('image_url')) {
        try {
          dbInstance!.run('ALTER TABLE patient_inventory_check_details ADD COLUMN image_url TEXT');
        } catch (e) {
          console.warn('Could not add image_url to patient_inventory_check_details:', e);
        }
      }

      const patCols = getColumns('patients');
      if (!patCols.includes('photo_url')) {
        try {
          dbInstance!.run('ALTER TABLE patients ADD COLUMN photo_url TEXT');
        } catch (e) {
          console.warn('Could not add photo_url to patients:', e);
        }
      }

      // Upgrade users table schema if CHECK constraint does not allow caregiver role
      const userSchemaCheck = dbInstance!.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'");
      const currentUsersSql = (userSchemaCheck[0]?.values[0]?.[0] as string) || '';
      if (currentUsersSql && !currentUsersSql.includes('caregiver')) {
        console.log('Upgrading users table schema to support caregiver role...');
        dbInstance!.run('PRAGMA foreign_keys=OFF;');
        dbInstance!.run('ALTER TABLE users RENAME TO users_old;');
        dbInstance!.run(`
          CREATE TABLE users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin', 'staff_nurse', 'caregiver')),
            passcode_hash TEXT NOT NULL,
            passcode_salt TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
            must_change_passcode INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            last_login_at TEXT
          );
        `);
        const oldCols = getColumns('users_old');
        const newCols = getColumns('users');
        const commonCols = oldCols.filter((c) => newCols.includes(c));
        dbInstance!.run(
          `INSERT INTO users (${commonCols.join(', ')}) SELECT ${commonCols.join(', ')} FROM users_old;`
        );
        dbInstance!.run('DROP TABLE users_old;');
        dbInstance!.run('PRAGMA foreign_keys=ON;');
        console.log('users table schema successfully upgraded for caregiver role.');
      }

      // Ensure default Caregiver account exists in users table
      try {
        dbInstance.run(
          `INSERT OR REPLACE INTO users (id, username, full_name, role, passcode_hash, passcode_salt, status, must_change_passcode, created_at)
           VALUES ('usr_caregiver_01', 'caregiver.azlan', 'Penjaga Azlan Shah (Caregiver)', 'caregiver', '8525d17cc8036a1d4e05f022988faebf445232db1f142990728ee89645aebd42', 'f4967282e1badf6a17f2d35a20c32ed1', 'active', 0, datetime('now'))`
        );
        persistDb();
      } catch (cgErr) {
        console.warn('Could not seed default caregiver account:', cgErr);
      }

      // Upgrade monitoring_records schema if CHECK constraint does not allow Morning/Petang
      const schemaCheck = dbInstance!.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='monitoring_records'");
      const currentSql = (schemaCheck[0]?.values[0]?.[0] as string) || '';
      if (currentSql && !currentSql.includes('Morning')) {
        console.log('Upgrading monitoring_records table schema to support Morning, Petang, and Night shifts...');
        dbInstance!.run('PRAGMA foreign_keys=OFF;');
        dbInstance!.run('ALTER TABLE monitoring_records RENAME TO monitoring_records_old;');
        dbInstance!.run(`
          CREATE TABLE monitoring_records (
            id TEXT PRIMARY KEY,
            admission_id TEXT NOT NULL,
            patient_id TEXT NOT NULL,
            staff_user_id TEXT NOT NULL,
            staff_name TEXT NOT NULL,
            timestamp TEXT NOT NULL DEFAULT (datetime('now')),
            shift TEXT NOT NULL CHECK(shift IN ('Morning (7:00am-5:00pm)', 'Petang (2:00pm-12:00am)', 'Night (9:00pm-7:00am)', 'AM (7:00-5:00)', 'PM (5:00-9:00)')),
            clinical_status TEXT NOT NULL DEFAULT 'Stable' CHECK(clinical_status IN ('Stable', 'Red Alert')),
            blood_pressure TEXT,
            pulse_rate INTEGER,
            temperature REAL,
            spo2 INTEGER,
            blood_sugar TEXT,
            pain_level INTEGER DEFAULT 0,
            general_condition TEXT DEFAULT 'STABLE',
            consciousness TEXT DEFAULT 'ALERT',
            mobility_status TEXT DEFAULT 'ABLE TO AMBULATE',
            appetite TEXT DEFAULT 'GOOD' CHECK(appetite IN ('GOOD', 'FAIR', 'POOR')),
            urine_output TEXT DEFAULT 'NORMAL',
            bowel_movement INTEGER DEFAULT 0,
            medication_intake TEXT DEFAULT 'SERVED' CHECK(medication_intake IN ('SERVED', 'REFUSE', 'WITHHELD')),
            hygiene_care TEXT DEFAULT 'Normal shower',
            feeding_care TEXT DEFAULT 'DONE',
            wound_dressing TEXT DEFAULT 'N/A',
            repositioning TEXT DEFAULT 'N/A',
            mobilisation TEXT DEFAULT '1',
            nursing_report TEXT,
            rehab_assessment TEXT,
            visitor_log TEXT,
            diet_plan TEXT,
            tube_has_ngt INTEGER DEFAULT 0,
            tube_has_cbd INTEGER DEFAULT 0,
            tube_type TEXT,
            tube_material TEXT,
            tube_replacement_date TEXT,
            tube_size TEXT,
            patient_behavior TEXT,
            attachment_image TEXT,
            nurse_advice TEXT,
            urine_other TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (admission_id) REFERENCES admissions(id) ON DELETE CASCADE,
            FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
            FOREIGN KEY (staff_user_id) REFERENCES users(id)
          );
        `);
        const oldCols = getColumns('monitoring_records_old');
        const newCols = getColumns('monitoring_records');
        const commonCols = oldCols.filter((c) => newCols.includes(c));
        dbInstance!.run(
          `INSERT INTO monitoring_records (${commonCols.join(', ')}) SELECT ${commonCols.join(', ')} FROM monitoring_records_old;`
        );
        dbInstance!.run('DROP TABLE monitoring_records_old;');
        dbInstance!.run('PRAGMA foreign_keys=ON;');
        console.log('monitoring_records table schema successfully upgraded.');
      }

      persistDb();
      console.log('Migration 0004 verified and applied successfully.');
    } catch (migErr) {
      console.error('Error applying migration 0004 columns:', migErr);
    }
  } catch (err) {
    console.error('Error during database migration init:', err);
  }

  return dbInstance;
}

export async function all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}

export async function first<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await all<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export async function run(sql: string, params: any[] = []): Promise<{ changes: number }> {
  const db = await getDb();
  db.run(sql, params);
  persistDb();
  return { changes: 1 };
}

export async function exec(sql: string): Promise<void> {
  const db = await getDb();
  db.run(sql);
  persistDb();
}
