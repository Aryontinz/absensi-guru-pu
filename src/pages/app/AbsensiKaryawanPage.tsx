import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Clock, Loader2, LogOut as CheckOutIcon } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import type { EmployeeAttendance, EmployeeStatus } from '../../types/database';
import { AttendanceStatusText, formatTime } from '../../components/StatusBadge';

export default function AbsensiKaryawanPage() {
  const [todayDate, setTodayDate] = useState('');
  const [todayRecord, setTodayRecord] = useState<EmployeeAttendance | null>(null);
  const [history, setHistory] = useState<EmployeeAttendance[]>([]);
  const [status, setStatus] = useState<EmployeeStatus>('Hadir');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const loadData = useCallback(async () => {
    try {
      const res = await apiFetch<{
        today: string;
        todayRecord: EmployeeAttendance | null;
        history: EmployeeAttendance[];
      }>('/api/attendance/employee/me');
      setTodayDate(res.today);
      setTodayRecord(res.todayRecord);
      setHistory(res.history);
    } catch (err) {
      setFeedback({ type: 'error', message: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      await apiFetch('/api/attendance/employee/check-in', {
        method: 'POST',
        body: JSON.stringify({ status, notes }),
      });
      setNotes('');
      setFeedback({
        type: 'success',
        message:
          status === 'Hadir'
            ? 'Absen masuk hari ini berhasil dicatat.'
            : `Keterangan ${status} berhasil dicatat.`,
      });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    setSubmitting(true);
    setFeedback(null);

    try {
      await apiFetch('/api/attendance/employee/check-out', {
        method: 'POST',
      });
      setFeedback({ type: 'success', message: 'Absen pulang hari ini berhasil dicatat.' });
      await loadData();
    } catch (err) {
      setFeedback({ type: 'error', message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Absensi Mandiri Karyawan
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Catat kehadiran masuk dan pulang Anda setiap hari kerja.
        </p>
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

      {/* Daily Check-in / Check-out Panel */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <Clock className="h-5 w-5 text-red-600" />
            <h2 className="text-base font-bold text-slate-900">
              Presensi Tanggal{' '}
              <span className="font-mono tabular-nums text-red-600">{todayDate}</span>
            </h2>
          </div>
        </div>

        {!todayRecord ? (
          <form onSubmit={handleCheckIn} className="mt-5 grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Status Kehadiran
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as EmployeeStatus)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
              >
                <option value="Hadir">Hadir</option>
                <option value="Izin">Izin</option>
                <option value="Sakit">Sakit</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Keterangan (Opsional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan tambahan..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {submitting
                  ? 'Menyimpan...'
                  : status === 'Hadir'
                    ? 'Absen Masuk Sekarang'
                    : 'Kirim Keterangan'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-5 flex flex-col justify-between gap-4 rounded-lg border border-slate-200 bg-slate-50 p-5 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3.5">
              <CheckCircle2 className="mt-0.5 h-6 w-6 shrink-0 text-emerald-600" />
              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <span>Presensi Hari Ini Tercatat:</span>
                  <AttendanceStatusText status={todayRecord.status} />
                </div>
                <p className="mt-1 font-mono text-xs text-slate-600 tabular-nums">
                  Masuk: {formatTime(todayRecord.check_in)} · Pulang:{' '}
                  {formatTime(todayRecord.check_out)}
                </p>
                {todayRecord.notes && (
                  <p className="mt-1 text-xs text-slate-500">Catatan: {todayRecord.notes}</p>
                )}
              </div>
            </div>

            {todayRecord.status === 'Hadir' && !todayRecord.check_out && (
              <button
                type="button"
                onClick={handleCheckOut}
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <CheckOutIcon className="h-4 w-4" />
                <span>{submitting ? 'Memproses...' : 'Absen Pulang'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Personal Attendance History */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-4">
          <h3 className="text-sm font-bold text-slate-900">
            Riwayat Absensi Anda (30 Terakhir)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-3">Tanggal</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Jam Masuk</th>
                <th className="px-6 py-3">Jam Pulang</th>
                <th className="px-6 py-3">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="px-6 py-3 font-mono text-xs font-medium text-slate-900 tabular-nums">
                    {item.date}
                  </td>
                  <td className="px-6 py-3">
                    <AttendanceStatusText status={item.status} />
                  </td>
                  <td className="px-6 py-3 font-mono text-xs text-slate-600 tabular-nums">
                    {formatTime(item.check_in)}
                  </td>
                  <td className="px-6 py-3 font-mono text-xs text-slate-600 tabular-nums">
                    {formatTime(item.check_out)}
                  </td>
                  <td className="px-6 py-3 text-xs text-slate-500">{item.notes || '-'}</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-400">
                    Belum ada riwayat absensi pribadi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
