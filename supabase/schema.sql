-- ============================================================================
-- SCHEMA DATABASE RELASIONAL SUPABASE (POSTGRESQL)
-- Aplikasi Absensi Siswa & Karyawan — SMK Prima Unggul
-- Jalankan seluruh script ini di Supabase Dashboard -> SQL Editor
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- 1. TABEL PROFILES (Relasi 1:1 dengan auth.users Supabase Authentication)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'guru', 'tenaga_kependidikan')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: User pertama di auth.users otomatis mendapatkan role 'admin'
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_count INT;
  assigned_role TEXT;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;

  IF user_count = 0 THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := COALESCE(NEW.raw_user_meta_data->>'role', 'tenaga_kependidikan');
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    assigned_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Sinkronisasi otomatis jika email / metadata user diedit di auth.users
CREATE OR REPLACE FUNCTION public.handle_auth_user_updated()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET
    email = NEW.email,
    full_name = COALESCE(NEW.raw_user_meta_data->>'full_name', full_name),
    role = COALESCE(NEW.raw_user_meta_data->>'role', role),
    updated_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_updated();

-- ----------------------------------------------------------------------------
-- 2. TABEL MAJORS (Master 3 Rumpun Jurusan & 6 Kompetensi Keahlian)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.majors (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  rumpun TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.majors (code, name, rumpun) VALUES
  ('TKJ', 'Teknik Komputer dan Jaringan', 'Teknologi Informasi'),
  ('DKV', 'Desain Komunikasi Visual', 'Seni & Ekonomi Kreatif'),
  ('BC', 'Broadcasting dan Perfilman', 'Seni & Ekonomi Kreatif'),
  ('AK', 'Akuntansi', 'Bisnis & Manajemen'),
  ('MPLB', 'Manajemen Perkantoran dan Layanan Bisnis', 'Bisnis & Manajemen'),
  ('BD', 'Bisnis Digital', 'Bisnis & Manajemen')
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. TABEL CLASSES (Relasi Many:1 ke public.majors)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  major_code TEXT REFERENCES public.majors(code) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. TABEL STUDENTS (Relasi Many:1 ke public.classes)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nis TEXT UNIQUE NOT NULL,
  nama TEXT NOT NULL,
  kelas TEXT NOT NULL,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger otomatis: menautkan students.kelas ke tabel classes & majors
CREATE OR REPLACE FUNCTION public.sync_student_class()
RETURNS TRIGGER AS $$
DECLARE
  matched_major TEXT := NULL;
  resolved_class_id UUID;
  upper_kelas TEXT;
BEGIN
  upper_kelas := UPPER(TRIM(NEW.kelas));

  IF upper_kelas LIKE '%TKJ%' THEN matched_major := 'TKJ';
  ELSIF upper_kelas LIKE '%DKV%' THEN matched_major := 'DKV';
  ELSIF upper_kelas LIKE '%MPLB%' THEN matched_major := 'MPLB';
  ELSIF upper_kelas LIKE '%BC%' THEN matched_major := 'BC';
  ELSIF upper_kelas LIKE '%AK%' THEN matched_major := 'AK';
  ELSIF upper_kelas LIKE '%BD%' THEN matched_major := 'BD';
  END IF;

  INSERT INTO public.classes (name, major_code)
  VALUES (TRIM(NEW.kelas), matched_major)
  ON CONFLICT (name) DO UPDATE SET
    major_code = COALESCE(public.classes.major_code, EXCLUDED.major_code)
  RETURNING id INTO resolved_class_id;

  NEW.kelas := TRIM(NEW.kelas);
  NEW.class_id := resolved_class_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_student_class ON public.students;
CREATE TRIGGER trg_sync_student_class
  BEFORE INSERT OR UPDATE OF kelas ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.sync_student_class();

-- ----------------------------------------------------------------------------
-- 5. TABEL EMPLOYEE_ATTENDANCE (Relasi Many:1 ke public.profiles)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  check_in TIMESTAMPTZ,
  check_out TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('Hadir', 'Izin', 'Sakit')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ----------------------------------------------------------------------------
-- 6. TABEL STUDENT_ATTENDANCE (Relasi ke public.students & public.profiles)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('Hadir', 'Izin', 'Sakit', 'Alpa')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, date)
);

-- ----------------------------------------------------------------------------
-- 7. INDEX PERFORMA QUERY RELASIONAL
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_students_class_id ON public.students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_kelas ON public.students(kelas);
CREATE INDEX IF NOT EXISTS idx_emp_att_user_date ON public.employee_attendance(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_emp_att_date ON public.employee_attendance(date DESC);
CREATE INDEX IF NOT EXISTS idx_stu_att_student_date ON public.student_attendance(student_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_stu_att_date ON public.student_attendance(date DESC);
CREATE INDEX IF NOT EXISTS idx_stu_att_recorded_by ON public.student_attendance(recorded_by);

-- ----------------------------------------------------------------------------
-- 8. RELATIONAL REPORTING VIEWS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_employee_attendance_report AS
SELECT
  ea.id,
  ea.user_id,
  p.full_name,
  p.email,
  p.role,
  ea.date,
  ea.check_in,
  ea.check_out,
  ea.status,
  ea.notes,
  ea.created_at
FROM public.employee_attendance ea
JOIN public.profiles p ON p.id = ea.user_id;

CREATE OR REPLACE VIEW public.v_student_attendance_report AS
SELECT
  sa.id,
  sa.student_id,
  s.nis,
  s.nama AS student_name,
  s.kelas,
  c.major_code,
  m.name AS major_name,
  sa.date,
  sa.status,
  sa.notes,
  sa.recorded_by,
  p.full_name AS recorded_by_name,
  sa.created_at
FROM public.student_attendance sa
JOIN public.students s ON s.id = sa.student_id
LEFT JOIN public.classes c ON c.id = s.class_id
LEFT JOIN public.majors m ON m.code = c.major_code
LEFT JOIN public.profiles p ON p.id = sa.recorded_by;

-- ----------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) + HELPER ANTI-REKURSIF
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.majors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read profiles" ON public.profiles;
CREATE POLICY "Authenticated read profiles" ON public.profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated read majors" ON public.majors;
CREATE POLICY "Authenticated read majors" ON public.majors
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated read classes" ON public.classes;
CREATE POLICY "Authenticated read classes" ON public.classes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin manage classes" ON public.classes;
CREATE POLICY "Admin manage classes" ON public.classes
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "Authenticated read students" ON public.students;
CREATE POLICY "Authenticated read students" ON public.students
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin manage students" ON public.students;
CREATE POLICY "Admin manage students" ON public.students
  FOR ALL TO authenticated
  USING (public.current_user_role() = 'admin')
  WITH CHECK (public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "Read own or admin read all employee attendance" ON public.employee_attendance;
CREATE POLICY "Read own or admin read all employee attendance" ON public.employee_attendance
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.current_user_role() = 'admin');

DROP POLICY IF EXISTS "Manage own employee attendance" ON public.employee_attendance;
CREATE POLICY "Manage own employee attendance" ON public.employee_attendance
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Admin and Guru manage student attendance" ON public.student_attendance;
CREATE POLICY "Admin and Guru manage student attendance" ON public.student_attendance
  FOR ALL TO authenticated
  USING (public.current_user_role() IN ('admin', 'guru'))
  WITH CHECK (public.current_user_role() IN ('admin', 'guru'));

-- ----------------------------------------------------------------------------
-- 10. EXPLICIT SCHEMA & TABLE GRANTS
-- ----------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON public.v_employee_attendance_report, public.v_student_attendance_report TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO anon, authenticated, service_role;

