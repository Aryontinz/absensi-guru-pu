import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { apiFetch } from '../../lib/api';
import type { Profile, UserRole } from '../../types/database';

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser, refreshUser } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('guru');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const authorized = currentUser?.role === 'admin';

  useEffect(() => {
    if (!authorized || !id) {
      setLoading(false);
      return;
    }

    apiFetch<{ user: Profile }>(`/api/admin/users/${id}`)
      .then((res) => {
        setFullName(res.user.full_name);
        setEmail(res.user.email);
        setRole(res.user.role);
      })
      .catch((err) => setErrorMsg((err as Error).message))
      .finally(() => setLoading(false));
  }, [authorized, id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    setSaving(true);
    setErrorMsg('');

    try {
      await apiFetch(`/api/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          full_name: fullName,
          email,
          role,
          password,
        }),
      });
      if (id === currentUser?.id) {
        await refreshUser();
      }
      navigate('/app/manajemen-user');
    } catch (err) {
      setErrorMsg((err as Error).message);
      setSaving(false);
    }
  };

  if (!authorized) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm font-medium text-red-700">
        Akses ditolak. Halaman ini hanya dapat diakses oleh Administrator.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-red-600" />
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <Link
        to="/app/manajemen-user"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-red-600 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Kembali ke User Management</span>
      </Link>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h1 className="text-xl font-bold text-slate-900">Edit Data User</h1>
        <p className="mt-1 text-xs text-slate-500">
          Perubahan akan langsung tersinkronisasi dengan data profil dan autentikasi.
        </p>

        {errorMsg && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleUpdate} className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Nama Lengkap
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-red-600"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-red-600"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-red-600"
            >
              <option value="admin">Administrator</option>
              <option value="guru">Guru</option>
              <option value="tenaga_kependidikan">Tenaga Kependidikan</option>
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Password Baru (Kosongkan jika tidak diubah)
            </label>
            <input
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-red-600"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
