import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit2, Loader2, Search, Trash2, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import type { Profile, UserRole } from '../../types/database';
import { formatRoleLabel } from '../../components/StatusBadge';
import ConfirmModal from '../../components/ConfirmModal';

export default function ManajemenUserPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('guru');

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const authorized = currentUser?.role === 'admin';

  const fetchUsers = useCallback(async () => {
    if (!authorized) {
      setLoading(false);
      return;
    }
    try {
      const res = await apiFetch<{ users: Profile[] }>('/api/admin/users');
      setUsers(res.users);
    } catch (err) {
      setFeedback({ type: 'error', message: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [authorized]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return users.filter((u) => {
      const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchQuery =
        !q || u.full_name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      return matchRole && matchQuery;
    });
  }, [users, searchQuery, roleFilter]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    try {
      await apiFetch('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({ full_name: fullName, email, password, role }),
      });
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('guru');
      setFeedback({
        type: 'success',
        message: 'Akun user baru berhasil dibuat dan tersinkronisasi.',
      });
      await fetchUsers();
    } catch (err) {
      setFeedback({ type: 'error', message: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const confirmHardDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setFeedback(null);

    try {
      await apiFetch(`/api/admin/users/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      setFeedback({
        type: 'success',
        message: `Akun "${deleteTarget.full_name}" berhasil dihapus permanen (Hard Delete).`,
      });
      setDeleteTarget(null);
      await fetchUsers();
    } catch (err) {
      setFeedback({ type: 'error', message: (err as Error).message });
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  if (!authorized) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">
        Akses ditolak. Menu User Management hanya dapat diakses oleh Administrator.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Management</h1>
        <p className="mt-1 text-sm text-slate-500">
          Kelola akun Admin, Guru, dan Tenaga Kependidikan yang tersinkronisasi penuh dengan
          sistem autentikasi.
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

      {/* Form Tambah User Baru */}
      <form
        onSubmit={handleCreateUser}
        className="rounded-xl border border-slate-200 bg-white p-6"
      >
        <h2 className="mb-4 text-sm font-bold text-slate-900">Tambah User Baru</h2>
        <div className="grid gap-4 md:grid-cols-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Nama Lengkap
            </label>
            <input
              type="text"
              required
              placeholder="Nama lengkap"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-red-600"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Email</label>
            <input
              type="email"
              required
              placeholder="email@sekolah.sch.id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-red-600"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Password</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Min. 6 karakter"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-red-600"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-red-600"
            >
              <option value="guru">Guru</option>
              <option value="tenaga_kependidikan">Tenaga Kependidikan</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              <span>{submitting ? 'Menyimpan...' : 'Tambah User'}</span>
            </button>
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
            placeholder="Cari user berdasarkan nama atau email..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-red-600"
          />
        </div>
        <div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'ALL' | UserRole)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 outline-none focus:border-red-600"
          >
            <option value="ALL">Semua Role ({users.length})</option>
            <option value="admin">Administrator</option>
            <option value="guru">Guru</option>
            <option value="tenaga_kependidikan">Tenaga Kependidikan</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
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
                  <th className="px-6 py-3">Nama Lengkap</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3 font-semibold text-slate-900">
                      {u.full_name}
                      {u.id === currentUser?.id && (
                        <span className="ml-2 text-xs font-normal text-slate-400">(Anda)</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-600">{u.email}</td>
                    <td className="px-6 py-3 text-xs font-semibold text-red-700">
                      {formatRoleLabel(u.role)}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <Link
                        to={`/app/manajemen-user/${u.id}`}
                        className="mr-4 inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-red-600"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </Link>
                      <button
                        type="button"
                        disabled={u.id === currentUser?.id}
                        onClick={() => setDeleteTarget(u)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Hapus</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-sm text-slate-400">
                      Tidak ada pengguna yang sesuai dengan pencarian.
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
        title="Hard Delete Akun Pengguna"
        description={`Yakin ingin menghapus permanen akun "${deleteTarget?.full_name}" (${deleteTarget?.email}) hingga ke sistem autentikasi? Tindakan ini tidak dapat dibatalkan.`}
        confirmLabel="Hard Delete User"
        loading={deleting}
        onConfirm={confirmHardDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
