import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarCheck, Shield, UserCheck, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import type { DashboardStats } from '../../types/database';
import { AttendanceStatusText, formatRoleLabel, formatTime } from '../../components/StatusBadge';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<DashboardStats>('/api/dashboard/stats')
      .then((res) => setStats(res))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const todayFormatted = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col justify-between gap-4 rounded-xl border border-red-200 bg-red-600 p-6 text-white sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-medium text-red-100">{todayFormatted}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            Selamat Datang, {user?.full_name}
          </h1>
          <p className="mt-1 text-sm text-red-100">
            Role aktif: {formatRoleLabel(user?.role)} · SMK Prima Unggul
          </p>
        </div>

        <Link
          to="/app/absensi-karyawan"
          className="inline-flex items-center gap-2 self-start rounded-lg bg-white px-4 py-2.5 text-xs font-bold text-red-700 hover:bg-red-50 transition-colors whitespace-nowrap shrink-0 sm:self-center"
        >
          <span>
            {stats?.todaySelfAttendance ? 'Lihat Absensi Hari Ini' : 'Isi Absensi Hari Ini'}
          </span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Status Presensi Anda</span>
            <UserCheck className="h-4 w-4 text-red-600" />
          </div>
          <div className="mt-3">
            {stats?.todaySelfAttendance ? (
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold text-slate-900">
                  {stats.todaySelfAttendance.status}
                </span>
                <span className="font-mono text-xs text-slate-500 tabular-nums">
                  {formatTime(stats.todaySelfAttendance.check_in)}
                </span>
              </div>
            ) : (
              <p className="text-base font-semibold text-amber-700">Belum Absen</p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Total Karyawan Terdaftar</span>
            <Shield className="h-4 w-4 text-red-600" />
          </div>
          <p className="mt-3 font-mono text-3xl font-bold text-slate-900 tabular-nums">
            {stats?.totalEmployees ?? 0}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Karyawan Hadir Hari Ini</span>
            <CalendarCheck className="h-4 w-4 text-red-600" />
          </div>
          <p className="mt-3 font-mono text-3xl font-bold text-slate-900 tabular-nums">
            {stats?.todayEmployeePresent ?? 0}
          </p>
        </div>

        {(user?.role === 'admin' || user?.role === 'guru') && (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold">Siswa Hadir / Total</span>
              <Users className="h-4 w-4 text-red-600" />
            </div>
            <p className="mt-3 font-mono text-3xl font-bold text-slate-900 tabular-nums">
              {stats?.todayStudentPresent ?? 0}
              <span className="text-base font-medium text-slate-400">
                {' '}
                / {stats?.totalStudents ?? 0}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Recent Activity Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Employee Recent Table */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 className="text-sm font-bold text-slate-900">
              {user?.role === 'admin'
                ? 'Presensi Karyawan Terbaru'
                : 'Riwayat Presensi Anda Terbaru'}
            </h2>
            <Link
              to={user?.role === 'admin' ? '/app/rekap/karyawan' : '/app/absensi-karyawan'}
              className="text-xs font-semibold text-red-600 hover:text-red-700"
            >
              Lihat Semua
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-5 py-3">Tanggal</th>
                  <th className="px-5 py-3">Nama</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Masuk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats?.recentEmployeeAttendance.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-2.5 font-mono text-xs text-slate-600 tabular-nums">
                      {item.date}
                    </td>
                    <td className="px-5 py-2.5 font-medium text-slate-900">
                      {item.full_name || user?.full_name}
                    </td>
                    <td className="px-5 py-2.5">
                      <AttendanceStatusText status={item.status} />
                    </td>
                    <td className="px-5 py-2.5 text-right font-mono text-xs text-slate-600 tabular-nums">
                      {formatTime(item.check_in)}
                    </td>
                  </tr>
                ))}
                {(!stats || stats.recentEmployeeAttendance.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-xs text-slate-400">
                      Belum ada catatan presensi karyawan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Student Recent Table (Admin & Guru only) */}
        {(user?.role === 'admin' || user?.role === 'guru') && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <h2 className="text-sm font-bold text-slate-900">Presensi Siswa Terbaru</h2>
              <Link
                to="/app/rekap/siswa"
                className="text-xs font-semibold text-red-600 hover:text-red-700"
              >
                Lihat Rekap
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Tanggal</th>
                    <th className="px-5 py-3">Siswa</th>
                    <th className="px-5 py-3">Kelas</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats?.recentStudentAttendance.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-2.5 font-mono text-xs text-slate-600 tabular-nums">
                        {item.date}
                      </td>
                      <td className="px-5 py-2.5 font-medium text-slate-900">{item.nama}</td>
                      <td className="px-5 py-2.5 text-xs text-slate-600">{item.kelas}</td>
                      <td className="px-5 py-2.5">
                        <AttendanceStatusText status={item.status} />
                      </td>
                    </tr>
                  ))}
                  {(!stats || stats.recentStudentAttendance.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-xs text-slate-400">
                        Belum ada catatan presensi siswa.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
