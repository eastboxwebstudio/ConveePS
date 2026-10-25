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
