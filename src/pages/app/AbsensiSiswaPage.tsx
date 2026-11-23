import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCheck, Loader2, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import type { Student, StudentStatus } from '../../types/database';

interface StudentRowItem {
  student: Student;
  status: StudentStatus;
  notes: string;
  recorded: boolean;
}

const STATUS_OPTIONS: StudentStatus[] = ['Hadir', 'Izin', 'Sakit', 'Alpa'];

export default function AbsensiSiswaPage() {
  const { user } = useAuth();
  const [kelasList, setKelasList] = useState<string[]>([]);
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [rows, setRows] = useState<StudentRowItem[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const authorized = user?.role === 'admin' || user?.role === 'guru';

  useEffect(() => {
    if (!authorized) {
      setLoadingClasses(false);
      return;
    }

    apiFetch<{ students: Student[] }>('/api/students')
      .then((res) => {
        const classes = Array.from(new Set(res.students.map((s) => s.kelas))).sort();
        setKelasList(classes);
        if (classes.length > 0) {
          setSelectedKelas(classes[0]);
        }
      })
      .catch((err) => setFeedback({ type: 'error', message: (err as Error).message }))
      .finally(() => setLoadingClasses(false));
  }, [authorized]);

  const loadAttendanceRows = useCallback(async () => {
    if (!selectedKelas || !selectedDate) {
      setRows([]);
      return;
    }
    setLoadingRows(true);
    setFeedback(null);
    try {
      const res = await apiFetch<{ rows: StudentRowItem[] }>(
        `/api/attendance/student?kelas=${encodeURIComponent(selectedKelas)}&date=${encodeURIComponent(selectedDate)}`
      );
      setRows(res.rows);
    } catch (err) {
      setFeedback({ type: 'error', message: (err as Error).message });
    } finally {
      setLoadingRows(false);
    }
  }, [selectedKelas, selectedDate]);

  useEffect(() => {
    loadAttendanceRows();
  }, [loadAttendanceRows]);

  const updateRowStatus = (studentId: string, status: StudentStatus) => {
    setRows((prev) =>
      prev.map((r) => (r.student.id === studentId ? { ...r, status } : r))
    );
  };

  const updateRowNotes = (studentId: string, notes: string) => {
    setRows((prev) =>
      prev.map((r) => (r.student.id === studentId ? { ...r, notes } : r))
    );
  };

  const markAllPresent = () => {
    setRows((prev) => prev.map((r) => ({ ...r, status: 'Hadir' })));
  };

  const handleSave = async () => {
    if (rows.length === 0) return;
    setSaving(true);
    setFeedback(null);
    try {
      await apiFetch('/api/attendance/student/batch', {
        method: 'POST',
        body: JSON.stringify({
          date: selectedDate,
          entries: rows.map((r) => ({
            student_id: r.student.id,
            status: r.status,
            notes: r.notes,
          })),
        }),
      });
      setFeedback({
        type: 'success',
        message: `Absensi kelas ${selectedKelas} tanggal ${selectedDate} berhasil disimpan.`,
      });
      await loadAttendanceRows();
    } catch (err) {
      setFeedback({ type: 'error', message: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  if (!authorized) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">
        Akses ditolak. Menu Absensi Siswa hanya tersedia untuk Admin dan Guru.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Absensi Siswa</h1>
          <p className="mt-1 text-sm text-slate-500">
            Pilih kelas dan tanggal untuk mencatat kehadiran siswa.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {rows.length > 0 && (
            <button
              type="button"
              onClick={markAllPresent}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <CheckCheck className="h-4 w-4 text-emerald-600" />
              <span>Tandai Semua Hadir</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || rows.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Menyimpan...' : 'Simpan Absensi'}</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm font-medium ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Filter Kelas & Tanggal */}
      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">Pilih Kelas</label>
          <select
            value={selectedKelas}
            onChange={(e) => setSelectedKelas(e.target.value)}
            disabled={loadingClasses || kelasList.length === 0}
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
          >
            {kelasList.length === 0 ? (
              <option value="">Belum ada data kelas</option>
            ) : (
              kelasList.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">Tanggal</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 font-mono text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
          />
        </div>
      </div>

      {/* Empty State if no students exist yet */}
      {!loadingClasses && kelasList.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <p className="text-sm font-semibold text-slate-900">Belum ada data siswa terdaftar</p>
          <p className="mt-1 text-xs text-slate-500">
            {user?.role === 'admin'
              ? 'Tambahkan master data siswa terlebih dahulu agar absensi kelas dapat dilakukan.'
              : 'Hubungi Administrator untuk menambahkan data siswa pada kelas Anda.'}
          </p>
          {user?.role === 'admin' && (
            <Link
              to="/app/data-siswa"
              className="mt-4 inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
            >
              Kelola Data Siswa
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-3">NIS</th>
                  <th className="px-6 py-3">Nama Siswa</th>
                  <th className="px-6 py-3">Status Kehadiran</th>
                  <th className="px-6 py-3">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingRows ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-red-600" />
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.student.id} className="hover:bg-slate-50/70">
                      <td className="px-6 py-3 font-mono text-xs text-slate-600 tabular-nums">
                        {row.student.nis}
                      </td>
                      <td className="px-6 py-3 font-semibold text-slate-900">
                        {row.student.nama}
                      </td>
                      <td className="px-6 py-3">
                        <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                          {STATUS_OPTIONS.map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => updateRowStatus(row.student.id, st)}
                              className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                                row.status === st
                                  ? st === 'Alpa'
                                    ? 'bg-red-600 text-white shadow-xs'
                                    : st === 'Hadir'
                                      ? 'bg-emerald-600 text-white shadow-xs'
                                      : 'bg-slate-900 text-white shadow-xs'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <input
                          type="text"
                          value={row.notes}
                          onChange={(e) => updateRowNotes(row.student.id, e.target.value)}
                          placeholder="Catatan opsional..."
                          className="w-full min-w-[160px] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 outline-none focus:border-red-600"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
