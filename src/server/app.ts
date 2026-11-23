import express, { NextFunction, Request, Response } from 'express';
import {
  checkInEmployee,
  checkOutEmployee,
  createManagedUser,
  createStudent,
  deleteStudent,
  getAuthStatus,
  getDashboardStats,
  getEmployeeRekap,
  getMyEmployeeAttendance,
  getStudentAttendanceForClass,
  getStudentRekap,
  getUserById,
  getUserFromToken,
  hardDeleteUser,
  listClasses,
  listMajors,
  listStudents,
  listUsers,
  loginWithPassword,
  saveStudentAttendanceBatch,
  setupInitialAdmin,
  updateManagedUser,
  updateStudent,
} from './db';
import type { Profile, UserRole } from '../types/database';

interface AuthenticatedRequest extends Request {
  user?: Profile;
}

async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Sesi tidak valid. Silakan login kembali.' });
    return;
  }

  const token = authHeader.slice(7).trim();
  const user = await getUserFromToken(token);
  if (!user) {
    res.status(401).json({ error: 'Sesi telah berakhir. Silakan login kembali.' });
    return;
  }

  req.user = user;
  next();
}

function requireRole(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Anda tidak memiliki izin untuk mengakses fitur ini.' });
      return;
    }
    next();
  };
}

export function createApiApp() {
  const app = express();
  app.use(express.json());

  // ==========================================
  // AUTH ROUTES
  // ==========================================

  app.get('/api/auth/status', async (_req, res) => {
    try {
      const status = await getAuthStatus();
      res.json(status);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/auth/setup-admin', async (req, res) => {
    try {
      const result = await setupInitialAdmin(req.body);
      res.status(201).json(result);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await loginWithPassword(email, password);
      res.json(result);
    } catch (err) {
      res.status(401).json({ error: (err as Error).message });
    }
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({ user: req.user });
  });

  // ==========================================
  // DASHBOARD
  // ==========================================

  app.get('/api/dashboard/stats', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const stats = await getDashboardStats(req.user!);
      res.json(stats);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // ==========================================
  // ABSENSI KARYAWAN (SEMUA ROLE)
  // ==========================================

  app.get('/api/attendance/employee/me', requireAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const data = await getMyEmployeeAttendance(req.user!.id);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post(
    '/api/attendance/employee/check-in',
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const record = await checkInEmployee(req.user!.id, req.body);
        res.status(201).json({ record });
      } catch (err) {
        res.status(400).json({ error: (err as Error).message });
      }
    }
  );

  app.post(
    '/api/attendance/employee/check-out',
    requireAuth,
    async (req: AuthenticatedRequest, res) => {
      try {
        const record = await checkOutEmployee(req.user!.id);
        res.json({ record });
      } catch (err) {
        res.status(400).json({ error: (err as Error).message });
      }
    }
  );

  // ==========================================
  // MASTER JURUSAN & KELAS
  // ==========================================

  app.get('/api/majors', requireAuth, async (_req, res) => {
    try {
      const majors = await listMajors();
      res.json({ majors });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get('/api/classes', requireAuth, async (_req, res) => {
    try {
      const classes = await listClasses();
      res.json({ classes });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // ==========================================
  // DATA SISWA (ADMIN CRUD, GURU READ)
  // ==========================================

  app.get('/api/students', requireAuth, requireRole('admin', 'guru'), async (_req, res) => {
    try {
      const students = await listStudents();
      res.json({ students });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/students', requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const student = await createStudent(req.body);
      res.status(201).json({ student });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.put('/api/students/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const student = await updateStudent(String(req.params.id), req.body);
      res.json({ student });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.delete('/api/students/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
      await deleteStudent(String(req.params.id));
      res.json({ message: 'Data siswa berhasil dihapus.' });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  // ==========================================
  // ABSENSI SISWA (ADMIN & GURU)
  // ==========================================

  app.get(
    '/api/attendance/student',
    requireAuth,
    requireRole('admin', 'guru'),
    async (req, res) => {
      try {
        const kelas = String(req.query.kelas || '');
        const date = String(req.query.date || '');
        if (!kelas || !date) {
          res.json({ rows: [] });
          return;
        }
        const rows = await getStudentAttendanceForClass(kelas, date);
        res.json({ rows });
      } catch (err) {
        res.status(500).json({ error: (err as Error).message });
      }
    }
  );

  app.post(
    '/api/attendance/student/batch',
    requireAuth,
    requireRole('admin', 'guru'),
    async (req: AuthenticatedRequest, res) => {
      try {
        const { date, entries } = req.body;
        await saveStudentAttendanceBatch(req.user!.id, date, entries);
        res.json({ message: 'Absensi siswa berhasil disimpan.' });
      } catch (err) {
        res.status(400).json({ error: (err as Error).message });
      }
    }
  );

  // ==========================================
  // REKAP ABSENSI (DYNAMIC)
  // ==========================================

  app.get('/api/rekap/karyawan', requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const month = String(req.query.month || new Date().toISOString().slice(0, 7));
      const records = await getEmployeeRekap(month);
      res.json({ records });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.get('/api/rekap/siswa', requireAuth, requireRole('admin', 'guru'), async (req, res) => {
    try {
      const month = String(req.query.month || new Date().toISOString().slice(0, 7));
      const kelas = req.query.kelas ? String(req.query.kelas) : undefined;
      const records = await getStudentRekap(month, kelas);
      res.json({ records });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // ==========================================
  // USER MANAGEMENT (ADMIN ONLY)
  // ==========================================

  app.get('/api/admin/users', requireAuth, requireRole('admin'), async (_req, res) => {
    try {
      const users = await listUsers();
      res.json({ users });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.post('/api/admin/users', requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const user = await createManagedUser(req.body);
      res.status(201).json({ user });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.get('/api/admin/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const user = await getUserById(String(req.params.id));
      if (!user) {
        res.status(404).json({ error: 'User tidak ditemukan.' });
        return;
      }
      res.json({ user });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  app.put('/api/admin/users/:id', requireAuth, requireRole('admin'), async (req, res) => {
    try {
      const user = await updateManagedUser(String(req.params.id), req.body);
      res.json({ user });
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.delete(
    '/api/admin/users/:id',
    requireAuth,
    requireRole('admin'),
    async (req: AuthenticatedRequest, res) => {
      try {
        await hardDeleteUser(String(req.params.id), req.user!.id);
        res.json({ message: 'User berhasil dihapus permanen.' });
      } catch (err) {
        res.status(400).json({ error: (err as Error).message });
      }
    }
  );

  return app;
}
