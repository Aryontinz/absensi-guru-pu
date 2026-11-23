import type Database from 'better-sqlite3';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import fs from 'fs';
import { createRequire } from 'module';
import path from 'path';
import type {
  EmployeeAttendance,
  EmployeeStatus,
  Major,
  Profile,
  SchoolClass,
  Student,
  StudentAttendance,
  StudentStatus,
  UserRole,
} from '../types/database.js';

const cleanEnv = (v?: string) => (v || '').trim().replace(/^["']|["']$/g, '');

const SUPABASE_URL = cleanEnv(
  process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL
);
const SUPABASE_ANON_KEY = cleanEnv(
  process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
const SUPABASE_SERVICE_ROLE_KEY = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);

export const isSupabaseConfigured = Boolean(
  /^https?:\/\//i.test(SUPABASE_URL) && SUPABASE_ANON_KEY && SUPABASE_SERVICE_ROLE_KEY
);

let supabaseAnon: SupabaseClient | null = null;
let supabaseAdmin: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  } catch (err) {
    console.error('Supabase client initialization failed:', (err as Error).message);
  }
}

// Local SQLite Initialization (used when Supabase env vars are not configured)
let sqliteDb: Database.Database | null = null;
let localAuthSecret: string | null = null;

function inferMajorCode(kelas: string): string | null {
  const upper = kelas.trim().toUpperCase();
  if (upper.includes('TKJ')) return 'TKJ';
  if (upper.includes('DKV')) return 'DKV';
  if (upper.includes('MPLB')) return 'MPLB';
  if (upper.includes('BC')) return 'BC';
  if (upper.includes('AK')) return 'AK';
  if (upper.includes('BD')) return 'BD';
  return null;
}

function getSqliteDb(): Database.Database {
  if (sqliteDb) return sqliteDb;

  if (process.env.VERCEL) {
    throw new Error(
      'Environment variables SUPABASE_URL, SUPABASE_ANON_KEY, dan SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di Vercel.'
    );
  }

  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const require = createRequire(import.meta.url);
  const sqliteModule = 'better-sqlite3';
  const BetterSqlite3 = require(sqliteModule) as typeof Database;
  const dbPath = path.join(dataDir, 'absensi.db');
  const instance = new BetterSqlite3(dbPath);
  instance.pragma('journal_mode = WAL');
  instance.pragma('foreign_keys = ON');
  sqliteDb = instance;

  sqliteDb.exec(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'guru', 'tenaga_kependidikan')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS majors (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      rumpun TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      major_code TEXT REFERENCES majors(code) ON DELETE SET NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY,
      nis TEXT UNIQUE NOT NULL,
      nama TEXT NOT NULL,
      kelas TEXT NOT NULL,
      class_id TEXT REFERENCES classes(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS employee_attendance (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      check_in TEXT,
      check_out TEXT,
      status TEXT NOT NULL CHECK (status IN ('Hadir', 'Izin', 'Sakit')),
      notes TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, date)
    );

    CREATE TABLE IF NOT EXISTS student_attendance (
      id TEXT PRIMARY KEY,
      student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
      recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('Hadir', 'Izin', 'Sakit', 'Alpa')),
      notes TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(student_id, date)
    );
  `);

  // Backward-compatible migration if students table existed prior to class_id column
  const studentCols = sqliteDb.prepare("PRAGMA table_info('students')").all() as Array<{
    name: string;
  }>;
  if (!studentCols.some((c) => c.name === 'class_id')) {
    sqliteDb.exec('ALTER TABLE students ADD COLUMN class_id TEXT REFERENCES classes(id) ON DELETE SET NULL;');
  }

  // Ensure master majors exist (3 rumpun, 6 kompetensi keahlian)
  const now = new Date().toISOString();
  const seedMajor = sqliteDb.prepare(
    'INSERT OR IGNORE INTO majors (code, name, rumpun, created_at) VALUES (?, ?, ?, ?)'
  );
  const majorsSeed: Array<[string, string, string]> = [
    ['TKJ', 'Teknik Komputer dan Jaringan', 'Teknologi Informasi'],
    ['DKV', 'Desain Komunikasi Visual', 'Seni & Ekonomi Kreatif'],
    ['BC', 'Broadcasting dan Perfilman', 'Seni & Ekonomi Kreatif'],
    ['AK', 'Akuntansi', 'Bisnis & Manajemen'],
    ['MPLB', 'Manajemen Perkantoran dan Layanan Bisnis', 'Bisnis & Manajemen'],
    ['BD', 'Bisnis Digital', 'Bisnis & Manajemen'],
  ];
  for (const [code, name, rumpun] of majorsSeed) {
    seedMajor.run(code, name, rumpun, now);
  }

  return sqliteDb;
}

function ensureSqliteClassId(db: Database.Database, kelasName: string): string {
  const cleanName = kelasName.trim();
  const existing = db.prepare('SELECT id FROM classes WHERE name = ?').get(cleanName) as
    | { id: string }
    | undefined;
  if (existing) return existing.id;

  const id = crypto.randomUUID();
  const majorCode = inferMajorCode(cleanName);
  const now = new Date().toISOString();
  db.prepare('INSERT INTO classes (id, name, major_code, created_at) VALUES (?, ?, ?, ?)').run(
    id,
    cleanName,
    majorCode,
    now
  );
  return id;
}

function getAuthSecret(): string {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET;
  if (localAuthSecret) return localAuthSecret;

  const db = getSqliteDb();
  const row = db
    .prepare("SELECT value FROM app_meta WHERE key = 'auth_secret'")
    .get() as { value: string } | undefined;

  if (row?.value) {
    localAuthSecret = row.value;
    return localAuthSecret;
  }

  const generated = crypto.randomBytes(32).toString('hex');
  db.prepare("INSERT INTO app_meta (key, value) VALUES ('auth_secret', ?)").run(generated);
  localAuthSecret = generated;
  return localAuthSecret;
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(key, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

function signToken(payload: { sub: string; email: string; role: UserRole }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 days
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const data = `${header}.${body}`;
  const sig = crypto.createHmac('sha256', getAuthSecret()).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyToken(token: string): { sub: string; email: string; role: UserRole } | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const data = `${header}.${body}`;
  const expected = crypto.createHmac('sha256', getAuthSecret()).update(data).digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as {
      sub: string;
      email: string;
      role: UserRole;
      exp: number;
    };
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return { sub: parsed.sub, email: parsed.email, role: parsed.role };
  } catch {
    return null;
  }
}

export function getTodayDateString(): string {
  const now = new Date();
  const offsetMs = 7 * 60 * 60 * 1000; // WIB (UTC+7)
  const wib = new Date(now.getTime() + offsetMs);
  return wib.toISOString().split('T')[0];
}

// ==========================================
// AUTHENTICATION & USER RESOLUTION
// ==========================================

export async function getAuthStatus(): Promise<{
  needsInitialAdmin: boolean;
  provider: 'supabase' | 'sqlite';
}> {
  if (isSupabaseConfigured && supabaseAdmin) {
    const { count, error } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact' })
      .limit(1);
    if (error) {
      const msg =
        error.message ||
        [error.code, error.details, error.hint].filter(Boolean).join(' - ') ||
        'Gagal terhubung ke tabel profiles Supabase.';
      throw new Error(msg);
    }
    return { needsInitialAdmin: (count || 0) === 0, provider: 'supabase' };
  }

  const db = getSqliteDb();
  const row = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
  return { needsInitialAdmin: row.cnt === 0, provider: 'sqlite' };
}

export async function setupInitialAdmin(input: {
  email: string;
  password: string;
  full_name: string;
}): Promise<{ token: string; user: Profile }> {
  const status = await getAuthStatus();
  if (!status.needsInitialAdmin) {
    throw new Error('Akun admin awal sudah terdaftar. Silakan login.');
  }

  const email = input.email.trim().toLowerCase();
  const fullName = input.full_name.trim();
  if (!email || !fullName || input.password.length < 6) {
    throw new Error('Nama lengkap, email valid, dan password minimal 6 karakter wajib diisi.');
  }

  if (isSupabaseConfigured && supabaseAdmin && supabaseAnon) {
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: 'admin' },
    });
    if (createErr || !created.user) {
      throw new Error(createErr?.message || 'Gagal membuat admin pertama.');
    }

    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', created.user.id)
      .single();

    if (!existingProfile) {
      await supabaseAdmin.from('profiles').insert({
        id: created.user.id,
        email,
        full_name: fullName,
        role: 'admin',
      });
    } else if (existingProfile.role !== 'admin') {
      await supabaseAdmin.from('profiles').update({ role: 'admin' }).eq('id', created.user.id);
    }

    const { data: signed, error: signErr } = await supabaseAnon.auth.signInWithPassword({
      email,
      password: input.password,
    });
    if (signErr || !signed.session) {
      throw new Error(signErr?.message || 'Gagal login otomatis.');
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', created.user.id)
      .single();

    return { token: signed.session.access_token, user: profile as Profile };
  }

  const db = getSqliteDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const passwordHash = hashPassword(input.password);

  db.prepare(
    'INSERT INTO users (id, email, password_hash, full_name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, email, passwordHash, fullName, 'admin', now);

  const user: Profile = { id, email, full_name: fullName, role: 'admin', created_at: now };
  const token = signToken({ sub: id, email, role: 'admin' });
  return { token, user };
}

export async function loginWithPassword(
  emailInput: string,
  password: string
): Promise<{ token: string; user: Profile }> {
  const email = emailInput.trim().toLowerCase();

  if (isSupabaseConfigured && supabaseAnon && supabaseAdmin) {
    const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });
    if (error || !data.session || !data.user) {
      throw new Error('Email atau password salah.');
    }

    const { data: profile, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profErr || !profile) {
      throw new Error('Profil pengguna tidak ditemukan.');
    }

    return { token: data.session.access_token, user: profile as Profile };
  }

  const db = getSqliteDb();
  const row = db
    .prepare('SELECT id, email, password_hash, full_name, role, created_at FROM users WHERE email = ?')
    .get(email) as (Profile & { password_hash: string }) | undefined;

  if (!row || !verifyPassword(password, row.password_hash)) {
    throw new Error('Email atau password salah.');
  }

  const user: Profile = {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: row.role,
    created_at: row.created_at,
  };
  const token = signToken({ sub: row.id, email: row.email, role: row.role });
  return { token, user };
}

export async function getUserFromToken(token: string): Promise<Profile | null> {
  if (!token) return null;

  if (isSupabaseConfigured && supabaseAdmin) {
    const {
      data: { user },
      error,
    } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) return null;

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return (profile as Profile) || null;
  }

  const payload = verifyToken(token);
  if (!payload) return null;

  const db = getSqliteDb();
  const row = db
    .prepare('SELECT id, email, full_name, role, created_at FROM users WHERE id = ?')
    .get(payload.sub) as Profile | undefined;

  return row || null;
}

// ==========================================
// ADMIN USER MANAGEMENT (SYNC + HARD DELETE)
// ==========================================

export async function listUsers(): Promise<Profile[]> {
  if (isSupabaseConfigured && supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data as Profile[]) || [];
  }

  const db = getSqliteDb();
  return db
    .prepare('SELECT id, email, full_name, role, created_at FROM users ORDER BY created_at DESC')
    .all() as Profile[];
}

export async function getUserById(id: string): Promise<Profile | null> {
  if (isSupabaseConfigured && supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data as Profile;
  }

  const db = getSqliteDb();
  const row = db
    .prepare('SELECT id, email, full_name, role, created_at FROM users WHERE id = ?')
    .get(id) as Profile | undefined;
  return row || null;
}

export async function createManagedUser(input: {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}): Promise<Profile> {
  const email = input.email.trim().toLowerCase();
  const fullName = input.full_name.trim();
  if (!email || !fullName || input.password.length < 6) {
    throw new Error('Nama lengkap, email valid, dan password minimal 6 karakter wajib diisi.');
  }

  if (isSupabaseConfigured && supabaseAdmin) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: input.password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: input.role },
    });
    if (error || !data.user) {
      throw new Error(error?.message || 'Gagal membuat user di Supabase Auth.');
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profile) return profile as Profile;

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: data.user.id,
        email,
        full_name: fullName,
        role: input.role,
      })
      .select()
      .single();
    if (insErr) throw new Error(insErr.message);
    return inserted as Profile;
  }

  const db = getSqliteDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    throw new Error('Email sudah terdaftar.');
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const passwordHash = hashPassword(input.password);

  db.prepare(
    'INSERT INTO users (id, email, password_hash, full_name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, email, passwordHash, fullName, input.role, now);

  return { id, email, full_name: fullName, role: input.role, created_at: now };
}

export async function updateManagedUser(
  id: string,
  input: {
    email: string;
    full_name: string;
    role: UserRole;
    password?: string;
  }
): Promise<Profile> {
  const email = input.email.trim().toLowerCase();
  const fullName = input.full_name.trim();
  if (!email || !fullName) {
    throw new Error('Nama lengkap dan email wajib diisi.');
  }
  if (input.password && input.password.trim().length > 0 && input.password.trim().length < 6) {
    throw new Error('Password baru minimal 6 karakter.');
  }

  if (isSupabaseConfigured && supabaseAdmin) {
    const authPayload: {
      email: string;
      password?: string;
      user_metadata: { full_name: string; role: UserRole };
    } = {
      email,
      user_metadata: { full_name: fullName, role: input.role },
    };
    if (input.password && input.password.trim() !== '') {
      authPayload.password = input.password.trim();
    }

    const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(id, authPayload);
    if (authErr) throw new Error(authErr.message);

    const { data, error: profErr } = await supabaseAdmin
      .from('profiles')
      .update({ email, full_name: fullName, role: input.role })
      .eq('id', id)
      .select()
      .single();

    if (profErr) throw new Error(profErr.message);
    return data as Profile;
  }

  const db = getSqliteDb();
  const current = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
  if (!current) throw new Error('User tidak ditemukan.');

  const duplicate = db
    .prepare('SELECT id FROM users WHERE email = ? AND id != ?')
    .get(email, id);
  if (duplicate) throw new Error('Email sudah digunakan akun lain.');

  if (input.password && input.password.trim() !== '') {
    const passwordHash = hashPassword(input.password.trim());
    db.prepare(
      'UPDATE users SET email = ?, full_name = ?, role = ?, password_hash = ? WHERE id = ?'
    ).run(email, fullName, input.role, passwordHash, id);
  } else {
    db.prepare('UPDATE users SET email = ?, full_name = ?, role = ? WHERE id = ?').run(
      email,
      fullName,
      input.role,
      id
    );
  }

  return (await getUserById(id)) as Profile;
}

export async function hardDeleteUser(id: string, requesterId: string): Promise<void> {
  if (id === requesterId) {
    throw new Error('Tidak dapat menghapus akun Anda sendiri yang sedang aktif.');
  }

  if (isSupabaseConfigured && supabaseAdmin) {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(id);
    if (error) throw new Error(error.message);
    return;
  }

  const db = getSqliteDb();
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  if (result.changes === 0) {
    throw new Error('User tidak ditemukan.');
  }
}

// ==========================================
// MAJORS & CLASSES (RELATIONAL MASTER)
// ==========================================

export async function listMajors(): Promise<Major[]> {
  if (isSupabaseConfigured && supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('majors')
      .select('*')
      .order('code', { ascending: true });
    if (error) throw new Error(error.message);
    return (data as Major[]) || [];
  }

  const db = getSqliteDb();
  return db.prepare('SELECT * FROM majors ORDER BY code ASC').all() as Major[];
}

export async function listClasses(): Promise<SchoolClass[]> {
  if (isSupabaseConfigured && supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('classes')
      .select('*')
      .order('name', { ascending: true });
    if (error) throw new Error(error.message);
    return (data as SchoolClass[]) || [];
  }

  const db = getSqliteDb();
  return db.prepare('SELECT * FROM classes ORDER BY name ASC').all() as SchoolClass[];
}

// ==========================================
// DATA SISWA (MASTER CRUD RELASIONAL)
// ==========================================

export async function listStudents(): Promise<Student[]> {
  if (isSupabaseConfigured && supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('students')
      .select('*, classes(major_code)')
      .order('kelas', { ascending: true })
      .order('nama', { ascending: true });
    if (error) throw new Error(error.message);

    return (data || []).map((row: Record<string, unknown>) => {
      const cls = row.classes as { major_code?: string | null } | null;
      return {
        id: String(row.id),
        nis: String(row.nis),
        nama: String(row.nama),
        kelas: String(row.kelas),
        class_id: (row.class_id as string | null) || null,
        major_code: cls?.major_code || null,
        created_at: String(row.created_at),
      };
    });
  }

  const db = getSqliteDb();
  return db
    .prepare(
      `SELECT s.*, c.major_code
       FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       ORDER BY s.kelas ASC, s.nama ASC`
    )
    .all() as Student[];
}

export async function createStudent(input: {
  nis: string;
  nama: string;
  kelas: string;
}): Promise<Student> {
  const nis = input.nis.trim();
  const nama = input.nama.trim();
  const kelas = input.kelas.trim();
  if (!nis || !nama || !kelas) {
    throw new Error('NIS, Nama, dan Kelas wajib diisi.');
  }

  if (isSupabaseConfigured && supabaseAdmin) {
    // Trigger trg_sync_student_class in Supabase automatically resolves & links class_id + major_code
    const { data, error } = await supabaseAdmin
      .from('students')
      .insert({ nis, nama, kelas })
      .select('*, classes(major_code)')
      .single();
    if (error) throw new Error(error.message);
    const cls = (data as Record<string, unknown>).classes as { major_code?: string | null } | null;
    return {
      ...(data as Student),
      major_code: cls?.major_code || null,
    };
  }

  const db = getSqliteDb();
  const existing = db.prepare('SELECT id FROM students WHERE nis = ?').get(nis);
  if (existing) throw new Error('NIS sudah terdaftar.');

  const classId = ensureSqliteClassId(db, kelas);
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    'INSERT INTO students (id, nis, nama, kelas, class_id, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, nis, nama, kelas, classId, now);

  return db
    .prepare(
      `SELECT s.*, c.major_code FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       WHERE s.id = ?`
    )
    .get(id) as Student;
}

export async function updateStudent(
  id: string,
  input: { nis: string; nama: string; kelas: string }
): Promise<Student> {
  const nis = input.nis.trim();
  const nama = input.nama.trim();
  const kelas = input.kelas.trim();
  if (!nis || !nama || !kelas) {
    throw new Error('NIS, Nama, dan Kelas wajib diisi.');
  }

  if (isSupabaseConfigured && supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('students')
      .update({ nis, nama, kelas })
      .eq('id', id)
      .select('*, classes(major_code)')
      .single();
    if (error) throw new Error(error.message);
    const cls = (data as Record<string, unknown>).classes as { major_code?: string | null } | null;
    return {
      ...(data as Student),
      major_code: cls?.major_code || null,
    };
  }

  const db = getSqliteDb();
  const duplicate = db.prepare('SELECT id FROM students WHERE nis = ? AND id != ?').get(nis, id);
  if (duplicate) throw new Error('NIS sudah digunakan siswa lain.');

  const classId = ensureSqliteClassId(db, kelas);
  const result = db
    .prepare('UPDATE students SET nis = ?, nama = ?, kelas = ?, class_id = ? WHERE id = ?')
    .run(nis, nama, kelas, classId, id);
  if (result.changes === 0) throw new Error('Data siswa tidak ditemukan.');

  return db
    .prepare(
      `SELECT s.*, c.major_code FROM students s
       LEFT JOIN classes c ON c.id = s.class_id
       WHERE s.id = ?`
    )
    .get(id) as Student;
}

export async function deleteStudent(id: string): Promise<void> {
  if (isSupabaseConfigured && supabaseAdmin) {
    const { error } = await supabaseAdmin.from('students').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }

  const db = getSqliteDb();
  const result = db.prepare('DELETE FROM students WHERE id = ?').run(id);
  if (result.changes === 0) throw new Error('Data siswa tidak ditemukan.');
}

// ==========================================
// ABSENSI KARYAWAN (SELF ATTENDANCE)
// ==========================================

export async function getMyEmployeeAttendance(userId: string): Promise<{
  today: string;
  todayRecord: EmployeeAttendance | null;
  history: EmployeeAttendance[];
}> {
  const today = getTodayDateString();

  if (isSupabaseConfigured && supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('employee_attendance')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    const history = (data as EmployeeAttendance[]) || [];
    const todayRecord = history.find((r) => r.date === today) || null;
    return { today, todayRecord, history };
  }

  const db = getSqliteDb();
  const history = db
    .prepare('SELECT * FROM employee_attendance WHERE user_id = ? ORDER BY date DESC LIMIT 30')
    .all(userId) as EmployeeAttendance[];
  const todayRecord = history.find((r) => r.date === today) || null;
  return { today, todayRecord, history };
}

export async function checkInEmployee(
  userId: string,
  input: { status: EmployeeStatus; notes?: string }
): Promise<EmployeeAttendance> {
  const today = getTodayDateString();
  const nowIso = new Date().toISOString();
  const checkInTime = input.status === 'Hadir' ? nowIso : null;
  const notes = input.notes?.trim() || null;

  if (isSupabaseConfigured && supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('employee_attendance')
      .insert({
        user_id: userId,
        date: today,
        check_in: checkInTime,
        status: input.status,
        notes,
      })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') throw new Error('Anda sudah mengisi presensi hari ini.');
      throw new Error(error.message);
    }
    return data as EmployeeAttendance;
  }

  const db = getSqliteDb();
  const existing = db
    .prepare('SELECT id FROM employee_attendance WHERE user_id = ? AND date = ?')
    .get(userId, today);
  if (existing) throw new Error('Anda sudah mengisi presensi hari ini.');

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO employee_attendance (id, user_id, date, check_in, check_out, status, notes, created_at)
     VALUES (?, ?, ?, ?, NULL, ?, ?, ?)`
  ).run(id, userId, today, checkInTime, input.status, notes, nowIso);

  return db.prepare('SELECT * FROM employee_attendance WHERE id = ?').get(id) as EmployeeAttendance;
}

export async function checkOutEmployee(userId: string): Promise<EmployeeAttendance> {
  const today = getTodayDateString();
  const nowIso = new Date().toISOString();

  if (isSupabaseConfigured && supabaseAdmin) {
    const { data: existing } = await supabaseAdmin
      .from('employee_attendance')
      .select('*')
      .eq('user_id', userId)
      .eq('date', today)
      .single();

    if (!existing) throw new Error('Belum ada data absen masuk hari ini.');
    if (existing.status !== 'Hadir') {
      throw new Error('Absen pulang hanya berlaku untuk status Hadir.');
    }
    if (existing.check_out) throw new Error('Anda sudah melakukan absen pulang hari ini.');

    const { data, error } = await supabaseAdmin
      .from('employee_attendance')
      .update({ check_out: nowIso })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data as EmployeeAttendance;
  }

  const db = getSqliteDb();
  const existing = db
    .prepare('SELECT * FROM employee_attendance WHERE user_id = ? AND date = ?')
    .get(userId, today) as EmployeeAttendance | undefined;

  if (!existing) throw new Error('Belum ada data absen masuk hari ini.');
  if (existing.status !== 'Hadir') {
    throw new Error('Absen pulang hanya berlaku untuk status Hadir.');
  }
  if (existing.check_out) throw new Error('Anda sudah melakukan absen pulang hari ini.');

  db.prepare('UPDATE employee_attendance SET check_out = ? WHERE id = ?').run(nowIso, existing.id);
  return db
    .prepare('SELECT * FROM employee_attendance WHERE id = ?')
    .get(existing.id) as EmployeeAttendance;
}

// ==========================================
// ABSENSI SISWA (BY GURU & ADMIN)
// ==========================================

export async function getStudentAttendanceForClass(kelas: string, date: string) {
  if (isSupabaseConfigured && supabaseAdmin) {
    const { data: stuData, error: stuErr } = await supabaseAdmin
      .from('students')
      .select('*')
      .eq('kelas', kelas)
      .order('nama', { ascending: true });
    if (stuErr) throw new Error(stuErr.message);
    const students = (stuData as Student[]) || [];
    if (students.length === 0) return [];

    const ids = students.map((s) => s.id);
    const { data: attData, error: attErr } = await supabaseAdmin
      .from('student_attendance')
      .select('*')
      .in('student_id', ids)
      .eq('date', date);
    if (attErr) throw new Error(attErr.message);

    return students.map((s) => {
      const att = attData?.find((a) => a.student_id === s.id);
      return {
        student: s,
        status: (att?.status as StudentStatus) || 'Hadir',
        notes: att?.notes || '',
        recorded: Boolean(att),
      };
    });
  }

  const db = getSqliteDb();
  const students = db
    .prepare('SELECT * FROM students WHERE kelas = ? ORDER BY nama ASC')
    .all(kelas) as Student[];

  const attRows = db
    .prepare(
      `SELECT sa.* FROM student_attendance sa
       JOIN students s ON s.id = sa.student_id
       WHERE s.kelas = ? AND sa.date = ?`
    )
    .all(kelas, date) as StudentAttendance[];

  return students.map((s) => {
    const att = attRows.find((a) => a.student_id === s.id);
    return {
      student: s,
      status: (att?.status as StudentStatus) || 'Hadir',
      notes: att?.notes || '',
      recorded: Boolean(att),
    };
  });
}

export async function saveStudentAttendanceBatch(
  recordedBy: string,
  date: string,
  entries: Array<{ student_id: string; status: StudentStatus; notes?: string }>
): Promise<void> {
  if (!date || entries.length === 0) {
    throw new Error('Tanggal dan daftar siswa wajib diisi.');
  }

  if (isSupabaseConfigured && supabaseAdmin) {
    const payload = entries.map((e) => ({
      student_id: e.student_id,
      recorded_by: recordedBy,
      date,
      status: e.status,
      notes: e.notes?.trim() || null,
    }));

    const { error } = await supabaseAdmin
      .from('student_attendance')
      .upsert(payload, { onConflict: 'student_id,date' });
    if (error) throw new Error(error.message);
    return;
  }

  const db = getSqliteDb();
  const now = new Date().toISOString();
  const upsertStmt = db.prepare(`
    INSERT INTO student_attendance (id, student_id, recorded_by, date, status, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(student_id, date) DO UPDATE SET
      recorded_by = excluded.recorded_by,
      status = excluded.status,
      notes = excluded.notes
  `);

  const transaction = db.transaction(() => {
    for (const entry of entries) {
      upsertStmt.run(
        crypto.randomUUID(),
        entry.student_id,
        recordedBy,
        date,
        entry.status,
        entry.notes?.trim() || null,
        now
      );
    }
  });
  transaction();
}

// ==========================================
// REKAP & DASHBOARD
// ==========================================

export async function getEmployeeRekap(month: string): Promise<EmployeeAttendance[]> {
  const startDate = `${month}-01`;
  const endDate = `${month}-31`;

  if (isSupabaseConfigured && supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('employee_attendance')
      .select('*, profiles(full_name, role, email)')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });
    if (error) throw new Error(error.message);

    return (data || []).map((row: Record<string, unknown>) => {
      const prof = row.profiles as { full_name?: string; role?: UserRole; email?: string } | null;
      return {
        id: String(row.id),
        user_id: String(row.user_id),
        date: String(row.date),
        check_in: (row.check_in as string | null) || null,
        check_out: (row.check_out as string | null) || null,
        status: row.status as EmployeeStatus,
        notes: (row.notes as string | null) || null,
        created_at: String(row.created_at),
        full_name: prof?.full_name || '-',
        role: prof?.role,
        email: prof?.email,
      };
    });
  }

  const db = getSqliteDb();
  return db
    .prepare(
      `SELECT ea.*, u.full_name, u.role, u.email
       FROM employee_attendance ea
       JOIN users u ON u.id = ea.user_id
       WHERE ea.date >= ? AND ea.date <= ?
       ORDER BY ea.date DESC, u.full_name ASC`
    )
    .all(startDate, endDate) as EmployeeAttendance[];
}

export async function getStudentRekap(
  month: string,
  kelasFilter?: string
): Promise<StudentAttendance[]> {
  const startDate = `${month}-01`;
  const endDate = `${month}-31`;

  if (isSupabaseConfigured && supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('student_attendance')
      .select('*, students(nis, nama, kelas, classes(major_code)), profiles(full_name)')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });
    if (error) throw new Error(error.message);

    const mapped = (data || []).map((row: Record<string, unknown>) => {
      const stu = row.students as {
        nis?: string;
        nama?: string;
        kelas?: string;
        classes?: { major_code?: string | null } | null;
      } | null;
      const prof = row.profiles as { full_name?: string } | null;
      return {
        id: String(row.id),
        student_id: String(row.student_id),
        recorded_by: (row.recorded_by as string | null) || null,
        date: String(row.date),
        status: row.status as StudentStatus,
        notes: (row.notes as string | null) || null,
        created_at: String(row.created_at),
        nis: stu?.nis || '-',
        nama: stu?.nama || '-',
        kelas: stu?.kelas || '-',
        major_code: stu?.classes?.major_code || null,
        recorded_by_name: prof?.full_name || null,
      };
    });

    if (kelasFilter && kelasFilter !== 'ALL') {
      return mapped.filter((m) => m.kelas === kelasFilter);
    }
    return mapped;
  }

  const db = getSqliteDb();
  if (kelasFilter && kelasFilter !== 'ALL') {
    return db
      .prepare(
        `SELECT sa.*, s.nis, s.nama, s.kelas, c.major_code, u.full_name as recorded_by_name
         FROM student_attendance sa
         JOIN students s ON s.id = sa.student_id
         LEFT JOIN classes c ON c.id = s.class_id
         LEFT JOIN users u ON u.id = sa.recorded_by
         WHERE sa.date >= ? AND sa.date <= ? AND s.kelas = ?
         ORDER BY sa.date DESC, s.nama ASC`
      )
      .all(startDate, endDate, kelasFilter) as StudentAttendance[];
  }

  return db
    .prepare(
      `SELECT sa.*, s.nis, s.nama, s.kelas, c.major_code, u.full_name as recorded_by_name
       FROM student_attendance sa
       JOIN students s ON s.id = sa.student_id
       LEFT JOIN classes c ON c.id = s.class_id
       LEFT JOIN users u ON u.id = sa.recorded_by
       WHERE sa.date >= ? AND sa.date <= ?
       ORDER BY sa.date DESC, s.kelas ASC, s.nama ASC`
    )
    .all(startDate, endDate) as StudentAttendance[];
}

export async function getDashboardStats(user: Profile) {
  const today = getTodayDateString();

  if (isSupabaseConfigured && supabaseAdmin) {
    const [{ count: empCount }, { count: empToday }, { data: selfToday }] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
      supabaseAdmin
        .from('employee_attendance')
        .select('*', { count: 'exact', head: true })
        .eq('date', today)
        .eq('status', 'Hadir'),
      supabaseAdmin
        .from('employee_attendance')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle(),
    ]);

    let totalStudents = 0;
    let todayStudentPresent = 0;
    let recentEmployeeAttendance: EmployeeAttendance[] = [];
    let recentStudentAttendance: StudentAttendance[] = [];

    if (user.role === 'admin' || user.role === 'guru') {
      const [{ count: stuCount }, { count: stuToday }] = await Promise.all([
        supabaseAdmin.from('students').select('*', { count: 'exact', head: true }),
        supabaseAdmin
          .from('student_attendance')
          .select('*', { count: 'exact', head: true })
          .eq('date', today)
          .eq('status', 'Hadir'),
      ]);
      totalStudents = stuCount || 0;
      todayStudentPresent = stuToday || 0;

      const month = today.slice(0, 7);
      recentStudentAttendance = (await getStudentRekap(month)).slice(0, 6);
    }

    if (user.role === 'admin') {
      recentEmployeeAttendance = (await getEmployeeRekap(today.slice(0, 7))).slice(0, 6);
    } else {
      const mine = await getMyEmployeeAttendance(user.id);
      recentEmployeeAttendance = mine.history.slice(0, 6);
    }

    return {
      totalEmployees: empCount || 0,
      todayEmployeePresent: empToday || 0,
      totalStudents,
      todayStudentPresent,
      todaySelfAttendance: (selfToday as EmployeeAttendance) || null,
      recentEmployeeAttendance,
      recentStudentAttendance,
    };
  }

  const db = getSqliteDb();
  const totalEmployees = (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number })
    .cnt;
  const todayEmployeePresent = (
    db
      .prepare("SELECT COUNT(*) as cnt FROM employee_attendance WHERE date = ? AND status = 'Hadir'")
      .get(today) as { cnt: number }
  ).cnt;
  const todaySelfAttendance =
    (db
      .prepare('SELECT * FROM employee_attendance WHERE user_id = ? AND date = ?')
      .get(user.id, today) as EmployeeAttendance | undefined) || null;

  let totalStudents = 0;
  let todayStudentPresent = 0;
  let recentEmployeeAttendance: EmployeeAttendance[] = [];
  let recentStudentAttendance: StudentAttendance[] = [];

  if (user.role === 'admin' || user.role === 'guru') {
    totalStudents = (db.prepare('SELECT COUNT(*) as cnt FROM students').get() as { cnt: number })
      .cnt;
    todayStudentPresent = (
      db
        .prepare("SELECT COUNT(*) as cnt FROM student_attendance WHERE date = ? AND status = 'Hadir'")
        .get(today) as { cnt: number }
    ).cnt;
    recentStudentAttendance = db
      .prepare(
        `SELECT sa.*, s.nis, s.nama, s.kelas, c.major_code, u.full_name as recorded_by_name
         FROM student_attendance sa
         JOIN students s ON s.id = sa.student_id
         LEFT JOIN classes c ON c.id = s.class_id
         LEFT JOIN users u ON u.id = sa.recorded_by
         ORDER BY sa.date DESC, sa.created_at DESC
         LIMIT 6`
      )
      .all() as StudentAttendance[];
  }

  if (user.role === 'admin') {
    recentEmployeeAttendance = db
      .prepare(
        `SELECT ea.*, u.full_name, u.role, u.email
         FROM employee_attendance ea
         JOIN users u ON u.id = ea.user_id
         ORDER BY ea.date DESC, ea.created_at DESC
         LIMIT 6`
      )
      .all() as EmployeeAttendance[];
  } else {
    recentEmployeeAttendance = db
      .prepare(
        `SELECT ea.*, u.full_name, u.role, u.email
         FROM employee_attendance ea
         JOIN users u ON u.id = ea.user_id
         WHERE ea.user_id = ?
         ORDER BY ea.date DESC, ea.created_at DESC
         LIMIT 6`
      )
      .all(user.id) as EmployeeAttendance[];
  }

  return {
    totalEmployees,
    todayEmployeePresent,
    totalStudents,
    todayStudentPresent,
    todaySelfAttendance,
    recentEmployeeAttendance,
    recentStudentAttendance,
  };
}
