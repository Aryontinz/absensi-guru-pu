import { useEffect, useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  Database,
  FileSpreadsheet,
  GraduationCap,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  ShieldCheck,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatRoleLabel } from './StatusBadge';

export default function AppShell() {
  const { user, loading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rekapOpen, setRekapOpen] = useState(true);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2.5 text-sm font-semibold text-red-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Memuat portal aplikasi...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const getPageTitle = () => {
    const p = location.pathname;
    if (p.startsWith('/app/dashboard')) return 'Dashboard';
    if (p.startsWith('/app/absensi-karyawan')) return 'Absensi Karyawan';
    if (p.startsWith('/app/absensi-siswa')) return 'Absensi Siswa';
    if (p === '/app/rekap/karyawan') return 'Rekap Absensi Karyawan';
    if (p === '/app/rekap/siswa') return 'Rekap Absensi Siswa';
    if (p.startsWith('/app/data-siswa')) return 'Data Siswa';
    if (p.startsWith('/app/manajemen-user')) return 'User Management';
    return 'Dashboard';
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden"
        />
      )}

      {/* Left Sidebar Menu (Dominant Red Theme) */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col bg-red-700 text-white transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-red-600/80 px-5 py-4">
          <Link to="/app/dashboard" className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-red-700">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight text-white">
                SMK Prima Unggul
              </p>
              <p className="truncate text-[11px] font-medium text-red-100">
                Portal Absensi
              </p>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-1 text-red-100 hover:bg-red-600 lg:hidden"
            aria-label="Tutup menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 text-sm font-medium">
          {/* 1. Dashboard (Semua Role) */}
          <Link
            to="/app/dashboard"
            className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 transition-colors whitespace-nowrap ${
              isActive('/app/dashboard')
                ? 'bg-white font-semibold text-red-700 shadow-xs'
                : 'text-red-50 hover:bg-red-600/80'
            }`}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            <span>Dashboard</span>
          </Link>

          {/* 2. Absensi Karyawan (Semua Role) */}
          <Link
            to="/app/absensi-karyawan"
            className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 transition-colors whitespace-nowrap ${
              isActive('/app/absensi-karyawan')
                ? 'bg-white font-semibold text-red-700 shadow-xs'
                : 'text-red-50 hover:bg-red-600/80'
            }`}
          >
            <UserCheck className="h-4 w-4 shrink-0" />
            <span>Absensi Karyawan</span>
          </Link>

          {/* 3. Absensi Siswa (Admin & Guru) */}
          {(user.role === 'admin' || user.role === 'guru') && (
            <Link
              to="/app/absensi-siswa"
              className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 transition-colors whitespace-nowrap ${
                isActive('/app/absensi-siswa')
                  ? 'bg-white font-semibold text-red-700 shadow-xs'
                  : 'text-red-50 hover:bg-red-600/80'
              }`}
            >
              <Users className="h-4 w-4 shrink-0" />
              <span>Absensi Siswa</span>
            </Link>
          )}

          {/* 4. Rekap Absensi Submenu (Admin & Guru) */}
          {(user.role === 'admin' || user.role === 'guru') && (
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setRekapOpen(!rekapOpen)}
                className="flex w-full items-center justify-between rounded-lg px-3.5 py-2.5 text-red-50 hover:bg-red-600/80 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-3 whitespace-nowrap">
                  <FileSpreadsheet className="h-4 w-4 shrink-0" />
                  <span>Rekap Absensi</span>
                </span>
                {rekapOpen ? (
                  <ChevronDown className="h-4 w-4 shrink-0" />
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0" />
                )}
              </button>

              {rekapOpen && (
                <div className="mt-1 space-y-1 pl-7">
                  {user.role === 'admin' && (
                    <Link
                      to="/app/rekap/karyawan"
                      className={`block rounded-lg px-3 py-2 text-xs transition-colors whitespace-nowrap ${
                        location.pathname === '/app/rekap/karyawan'
                          ? 'bg-white font-semibold text-red-700'
                          : 'text-red-100 hover:bg-red-600/80'
                      }`}
                    >
                      Absensi Karyawan
                    </Link>
                  )}
                  <Link
                    to="/app/rekap/siswa"
                    className={`block rounded-lg px-3 py-2 text-xs transition-colors whitespace-nowrap ${
                      location.pathname === '/app/rekap/siswa'
                        ? 'bg-white font-semibold text-red-700'
                        : 'text-red-100 hover:bg-red-600/80'
                    }`}
                  >
                    Absensi Siswa
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* 5. Data Siswa (Admin only) */}
          {user.role === 'admin' && (
            <Link
              to="/app/data-siswa"
              className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 transition-colors whitespace-nowrap ${
                isActive('/app/data-siswa')
                  ? 'bg-white font-semibold text-red-700 shadow-xs'
                  : 'text-red-50 hover:bg-red-600/80'
              }`}
            >
              <Database className="h-4 w-4 shrink-0" />
              <span>Data Siswa</span>
            </Link>
          )}

          {/* 6. User Management (Admin only) */}
          {user.role === 'admin' && (
            <Link
              to="/app/manajemen-user"
              className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 transition-colors whitespace-nowrap ${
                isActive('/app/manajemen-user')
                  ? 'bg-white font-semibold text-red-700 shadow-xs'
                  : 'text-red-50 hover:bg-red-600/80'
              }`}
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>User Management</span>
            </Link>
          )}
        </nav>

        <div className="border-t border-red-600/80 px-5 py-4 text-xs">
          <p className="truncate font-semibold text-white">{user.full_name}</p>
          <p className="mt-0.5 truncate text-red-100">{formatRoleLabel(user.role)}</p>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar: Breadcrumb on Left, User Info & Logout Button at Top-Right */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3.5">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Buka menu navigasi"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="hidden text-slate-400 sm:inline whitespace-nowrap">
                Portal Absensi
              </span>
              <span className="hidden text-slate-300 sm:inline" aria-hidden="true">
                /
              </span>
              <span className="truncate font-semibold text-slate-900">{getPageTitle()}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="hidden items-center gap-2 text-xs text-slate-600 sm:flex">
              <span className="font-semibold text-slate-900">{user.full_name}</span>
              <span aria-hidden="true">·</span>
              <span>{formatRoleLabel(user.role)}</span>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
