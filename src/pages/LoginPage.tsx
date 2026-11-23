import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, GraduationCap, Loader2, Lock, Mail, ShieldCheck, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, login, setupInitialAdmin } = useAuth();

  const [checkingStatus, setCheckingStatus] = useState(true);
  const [needsInitialAdmin, setNeedsInitialAdmin] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/app/dashboard', { replace: true });
    }
  }, [authLoading, user, navigate]);

  useEffect(() => {
    apiFetch<{ needsInitialAdmin: boolean }>('/api/auth/status')
      .then((res) => {
        setNeedsInitialAdmin(res.needsInitialAdmin);
      })
      .catch((err) => {
        setNeedsInitialAdmin(false);
        setErrorMsg((err as Error).message);
      })
      .finally(() => {
        setCheckingStatus(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');

    try {
      if (needsInitialAdmin) {
        await setupInitialAdmin({ full_name: fullName, email, password });
      } else {
        await login(email, password);
      }
      navigate('/app/dashboard', { replace: true });
    } catch (err) {
      setErrorMsg((err as Error).message);
      setSubmitting(false);
    }
  };

  if (authLoading || checkingStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2.5 text-sm font-semibold text-red-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Mempersiapkan halaman login...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col justify-center bg-slate-50 px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-red-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Profil Sekolah</span>
        </Link>

        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="mb-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-600 text-white">
              {needsInitialAdmin ? (
                <ShieldCheck className="h-6 w-6" />
              ) : (
                <GraduationCap className="h-6 w-6" />
              )}
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
              {needsInitialAdmin ? 'Registrasi Admin Pertama' : 'Login Portal Absensi'}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {needsInitialAdmin
                ? 'Belum ada pengguna terdaftar. Akun pertama otomatis mendapatkan role Administrator.'
                : 'SMK Prima Unggul · Admin, Guru & Tenaga Kependidikan'}
            </p>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
            >
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {needsInitialAdmin && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Nama Lengkap Admin
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: Kepala Tata Usaha"
                    className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@smkprimaunggul.sch.id"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-600/15"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition-colors cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : needsInitialAdmin ? (
                'Buat Akun Admin & Masuk'
              ) : (
                'Masuk ke Aplikasi'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
