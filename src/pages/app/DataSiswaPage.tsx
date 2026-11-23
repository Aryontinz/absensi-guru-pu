import { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit2, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import type { Student } from '../../types/database';
import ConfirmModal from '../../components/ConfirmModal';

const KELAS_SUGGESTIONS = [
  'X TKJ 1',
  'X TKJ 2',
  'X DKV 1',
  'X BC 1',
  'X AK 1',
  'X MPLB 1',
  'X BD 1',
  'XI TKJ 1',
  'XI DKV 1',
  'XI BC 1',
  'XI AK 1',
  'XI MPLB 1',
  'XI BD 1',
  'XII TKJ 1',
  'XII DKV 1',
  'XII BC 1',
  'XII AK 1',
  'XII MPLB 1',
  'XII BD 1',
];

export default function DataSiswaPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [nis, setNis] = useState('');
  const [nama, setNama] = useState('');
  const [kelas, setKelas] = useState('');
  const [editId, setEditId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [kelasFilter, setKelasFilter] = useState('ALL');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);

  const authorized = user?.role === 'admin';

  const loadStudents = useCallback(async () => {
    if (!authorized) {
      setLoading(false);
      return;
    }
    try {
      const res = await apiFetch<{ students: Student[] }>('/api/students');
      setStudents(res.students);
    } catch (err) {
      setFeedback({ type: 'error', message: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [authorized]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const kelasOptions = useMemo(
    () => Array.from(new Set(students.map((s) => s.kelas))).sort(),
    [students]
  );

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return students.filter((s) => {
      const matchKelas = kelasFilter === 'ALL' || s.kelas === kelasFilter;
      const matchQuery =
        !q ||
        s.nama.toLowerCase().includes(q) ||
        s.nis.toLowerCase().includes(q) ||
        s.kelas.toLowerCase().includes(q);
      return matchKelas && matchQuery;
    });
  }, [students, searchQuery, kelasFilter]);

  const resetForm = () => {
    setEditId(null);
    setNis('');
    setNama('');
    setKelas('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      if (editId) {
        await apiFetch(`/api/students/${editId}`, {
          method: 'PUT',
          body: JSON.stringify({ nis, nama, kelas }),
        });
        setFeedback({ type: 'success', message: 'Data siswa berhasil diperbarui.' });
      } else {
        await apiFetch('/api/students', {
          method: 'POST',
          body: JSON.stringify({ nis, nama, kelas }),
        });
        setFeedback({ type: 'success', message: 'Siswa baru berhasil ditambahkan.' });
      }
      resetForm();
      await loadStudents();
    } catch (err) {
      setFeedback({ type: 'error', message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (s: Student) => {
    setEditId(s.id);
    setNis(s.nis);
    setNama(s.nama);
    setKelas(s.kelas);
    setFeedback(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setFeedback(null);
    try {
      await apiFetch(`/api/students/${deleteTarget.id}`, { method: 'DELETE' });
      setFeedback({
        type: 'success',
        message: `Data siswa "${deleteTarget.nama}" berhasil dihapus.`,
      });
      setDeleteTarget(null);
      await loadStudents();
    } catch (err) {
      setFeedback({ type: 'error', message: (err as Error).message });
    } finally {
      setDeleting(false);
    }
  };

  if (!authorized) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">
        Akses ditolak. Menu Data Siswa hanya dapat diakses oleh Administrator.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Data Siswa</h1>
        <p className="mt-1 text-sm text-slate-500">
          Kelola master data siswa (NIS, Nama Lengkap, dan Kelas) untuk absensi oleh Guru.
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

      {/* Form Tambah / Edit Siswa */}
      <form
        onSubmit={handleSubmit}
        className="rounded-xl border border-slate-200 bg-white p-6"
      >
        <h2 className="mb-4 text-sm font-bold text-slate-900">
          {editId ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
        </h2>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">NIS</label>
            <input
              type="text"
              required
              placeholder="Contoh: 2026001"
              value={nis}
              onChange={(e) => setNis(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-mono text-sm text-slate-900 outline-none focus:border-red-600"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Nama Lengkap
            </label>
            <input
              type="text"
              required
              placeholder="Nama lengkap siswa"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-red-600"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Kelas</label>
            <input
              type="text"
              required
              list="kelas-suggestions"
              placeholder="Contoh: X TKJ 1"
              value={kelas}
              onChange={(e) => setKelas(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-red-600"
            />
            <datalist id="kelas-suggestions">
              {KELAS_SUGGESTIONS.map((k) => (
                <option key={k} value={k} />
              ))}
            </datalist>
          </div>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>{submitting ? 'Menyimpan...' : editId ? 'Simpan' : 'Tambah Siswa'}</span>
            </button>
            {editId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Filter & Search Bar */}
      <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <div className="relative sm:col-span-2">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari siswa berdasarkan NIS, nama, atau kelas..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-red-600"
          />
        </div>
        <div>
          <select
            value={kelasFilter}
            onChange={(e) => setKelasFilter(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-red-600"
          >
            <option value="ALL">Semua Kelas ({students.length})</option>
            {kelasOptions.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-red-600" />
            </div>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-6 py-3">NIS</th>
                  <th className="px-6 py-3">Nama Siswa</th>
                  <th className="px-6 py-3">Kelas</th>
                  <th className="px-6 py-3">Kompetensi</th>
                  <th className="px-6 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3 font-mono text-xs text-slate-700 tabular-nums">
                      {s.nis}
                    </td>
                    <td className="px-6 py-3 font-semibold text-slate-900">{s.nama}</td>
                    <td className="px-6 py-3 text-xs font-medium text-slate-700">{s.kelas}</td>
                    <td className="px-6 py-3 font-mono text-xs font-semibold text-red-700">
                      {s.major_code || '-'}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleEdit(s)}
                        className="mr-4 inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-red-600 cursor-pointer"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(s)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Hapus</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-400">
                      Belum ada data siswa yang sesuai.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Hapus Data Siswa"
        description={`Yakin ingin menghapus data siswa "${deleteTarget?.nama}" (NIS: ${deleteTarget?.nis})? Seluruh riwayat absensi siswa tersebut juga akan ikut terhapus.`}
        confirmLabel="Hapus Siswa"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
