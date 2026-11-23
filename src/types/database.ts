export type UserRole = 'admin' | 'guru' | 'tenaga_kependidikan';

export type EmployeeStatus = 'Hadir' | 'Izin' | 'Sakit';
export type StudentStatus = 'Hadir' | 'Izin' | 'Sakit' | 'Alpa';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Major {
  code: string;
  name: string;
  rumpun: string;
  created_at: string;
}

export interface SchoolClass {
  id: string;
  name: string;
  major_code: string | null;
  created_at: string;
}

export interface Student {
  id: string;
  nis: string;
  nama: string;
  kelas: string;
  class_id?: string | null;
  major_code?: string | null;
  created_at: string;
}

export interface EmployeeAttendance {
  id: string;
  user_id: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: EmployeeStatus;
  notes: string | null;
  created_at: string;
  full_name?: string;
  role?: UserRole;
  email?: string;
}

export interface StudentAttendance {
  id: string;
  student_id: string;
  recorded_by: string | null;
  date: string;
  status: StudentStatus;
  notes: string | null;
  created_at: string;
  nis?: string;
  nama?: string;
  kelas?: string;
  major_code?: string | null;
  recorded_by_name?: string | null;
}

export interface DashboardStats {
  totalEmployees: number;
  todayEmployeePresent: number;
  totalStudents: number;
  todayStudentPresent: number;
  todaySelfAttendance: EmployeeAttendance | null;
  recentEmployeeAttendance: EmployeeAttendance[];
  recentStudentAttendance: StudentAttendance[];
}
