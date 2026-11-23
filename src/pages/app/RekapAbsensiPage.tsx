import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Loader2, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import type { EmployeeAttendance, StudentAttendance } from '../../types/database';
import { AttendanceStatusText, formatRoleLabel, formatTime } from '../../components/StatusBadge';

export default function RekapAbsensiPage() {
  const { type } = useParams<{ type: string }>();
  const { user } = useAuth();

  const [monthFilter, setMonthFilter] = useState(() => new Date().toISOString().slice(0, 7));
  const [kelasFilter, setKelasFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [empRecords, setEmpRecords] = useState<EmployeeAttendance[]>([]);
  const [stuRecords, setStuRecords] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isKaryawan = type === 'karyawan';
  const isSiswa = type === 'siswa';

  const authorized =
    (isKaryawan && user?.role === 'admin') ||
    (isSiswa && (user?.role === 'admin' || user?.role === 'guru'));

  useEffect(() => {
    if (!authorized) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    if (isKaryawan) {
      apiFetch<{ records: EmployeeAttendance[] }>(
        `/api/rekap/karyawan?month=${encodeURIComponent(monthFilter)}`
      )
        .then((res) => setEmpRecords(res.records))
        .catch((err) => setError((err as Error).message))
        .finally(() => setLoading(false));
    } else if (isSiswa) {
      apiFetch<{ records: StudentAttendance[] }>(
        `/api/rekap/siswa?month=${encodeURIComponent(monthFilter)}`
      )
        .then((res) => setStuRecords(res.records))
        .catch((err) => setError((err as Error).message))
        .finally(() => setLoading(false));
    }
  }, [authorized, isKaryawan, isSiswa, monthFilter]);

  const kelasOptions = useMemo(() => {
    return Array.from(new Set(stuRecords.map((r) => r.kelas || '').filter(Boolean))).sort();
  }, [stuRecords]);

  const filteredEmp = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return empRecords;
    return empRecords.filter(
      (r) =>
        (r.full_name || '').toLowerCase().includes(q) ||
        (r.email || '').toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
    );
  }, [empRecords, searchQuery]);

  const filteredStu = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return stuRecords.filter((r) => {
      const matchKelas = kelasFilter === 'ALL' || r.kelas === kelasFilter;
      const matchQuery =
        !q ||
        (r.nama || '').toLowerCase().includes(q) ||
        (r.nis || '').toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q);
      return matchKelas && matchQuery;
    });
  }, [stuRecords, kelasFilter, searchQuery]);

  const summaryCounts = useMemo(() => {
    const list = isKaryawan ? filteredEmp : filteredStu;
    return {
      total: list.length,
      hadir: list.filter((x) => x.status === 'Hadir').length,
      izin: list.filter((x) => x.status === 'Izin').length,
      sakit: list.filter((x) => x.status === 'Sakit').length,
      alpa: list.filter((x) => x.status === 'Alpa').length,
    };
  }, [isKaryawan, filteredEmp, filteredStu]);

  const handleExportCsv = () => {
    const headers = isKaryawan
      ? ['Tanggal', 'Nama Karyawan', 'Role', 'Status', 'Jam Masuk', 'Jam Pulang', 'Catatan']
      : ['Tanggal', 'NIS', 'Nama Siswa', 'Kelas', 'Status', 'Diabsen Oleh', 'Catatan'];

    const lines = isKaryawan
      ? filteredEmp.map((r) => [
          r.date,
          r.full_name || '-',
          formatRoleLabel(r.role),
          r.status,
          formatTime(r.check_in),
          formatTime(r.check_out),
          r.notes || '',
        ])
      : filteredStu.map((r) => [
          r.date,
          r.nis || '-',
          r.nama || '-',
          r.kelas || '-',
          r.status,
          r.recorded_by_name || '-',
          r.notes || '',
        ]);

    const csvContent = [headers, ...lines]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rekap-absensi-${type}-${monthFilter}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!authorized) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">
        Anda tidak memiliki akses untuk melihat halaman rekap ini.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Rekap Absensi {isKaryawan ? 'Karyawan' : 'Siswa'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Laporan kehadiran bulanan SMK Prima Unggul.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCsv}
          disabled={summaryCounts.total === 0}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-800 hover:border-red-300 hover:text-red-700 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="h-4 w-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Filter Bar */}
      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isKaryawan ? 'Cari nama karyawan...' : 'Cari nama atau NIS siswa...'}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-red-600"
          />
        </div>

        <div>
          <input
            type="month"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm text-slate-900 outline-none focus:border-red-600"
          />
        </div>

        {isSiswa && (
          <div>
            <select
              value={kelasFilter}
              onChange={(e) => setKelasFilter(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-red-600"
            >
              <option value="ALL">Semua Kelas</option>
              {kelasOptions.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white sm:grid-cols-5 sm:divide-x sm:divide-y-0">
        <div className="p-4">
          <p className="text-xs font-medium text-slate-500">Total Catatan</p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {summaryCounts.total}
          </p>
        </div>
        <div className="p-4">
          <p className="text-xs font-medium text-slate-500">Hadir</p>
          <p className="mt-1 font-mono text-2xl font-bold text-emerald-700 tabular-nums">
            {summaryCounts.hadir}
          </p>
        </div>
        <div className="p-4">
          <p className="text-xs font-medium text-slate-500">Izin</p>
          <p className="mt-1 font-mono text-2xl font-bold text-amber-700 tabular-nums">
            {summaryCounts.izin}
          </p>
        </div>
        <div className="p-4">
          <p className="text-xs font-medium text-slate-500">Sakit</p>
          <p className="mt-1 font-mono text-2xl font-bold text-slate-700 tabular-nums">
            {summaryCounts.sakit}
          </p>
        </div>
        <div className="p-4">
          <p className="text-xs font-medium text-slate-500">Alpa</p>
          <p className="mt-1 font-mono text-2xl font-bold text-red-700 tabular-nums">
            {summaryCounts.alpa}
          </p>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-red-600" />
            </div>
          ) : isKaryawan ? (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-3">Tanggal</th>
                  <th className="px-6 py-3">Nama Karyawan</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Masuk</th>
                  <th className="px-6 py-3">Pulang</th>
                  <th className="px-6 py-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmp.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3 font-mono text-xs text-slate-600 tabular-nums">
                      {r.date}
                    </td>
                    <td className="px-6 py-3 font-semibold text-slate-900">{r.full_name}</td>
                    <td className="px-6 py-3 text-xs text-slate-600">
                      {formatRoleLabel(r.role)}
                    </td>
                    <td className="px-6 py-3">
                      <AttendanceStatusText status={r.status} />
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-slate-600 tabular-nums">
                      {formatTime(r.check_in)}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-slate-600 tabular-nums">
                      {formatTime(r.check_out)}
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-500">{r.notes || '-'}</td>
                  </tr>
                ))}
                {filteredEmp.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">
                      Tidak ada data absensi karyawan pada periode ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-3">Tanggal</th>
                  <th className="px-6 py-3">NIS</th>
                  <th className="px-6 py-3">Nama Siswa</th>
                  <th className="px-6 py-3">Kelas</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Diabsen Oleh</th>
                  <th className="px-6 py-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStu.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3 font-mono text-xs text-slate-600 tabular-nums">
                      {r.date}
                    </td>
                    <td className="px-6 py-3 font-mono text-xs text-slate-600 tabular-nums">
                      {r.nis}
                    </td>
                    <td className="px-6 py-3 font-semibold text-slate-900">{r.nama}</td>
                    <td className="px-6 py-3 text-xs font-medium text-slate-700">{r.kelas}</td>
                    <td className="px-6 py-3">
                      <AttendanceStatusText status={r.status} />
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-500">
                      {r.recorded_by_name || '-'}
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-500">{r.notes || '-'}</td>
                  </tr>
                ))}
                {filteredStu.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-400">
                      Tidak ada data absensi siswa pada periode ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
