import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Building2,
  Calculator,
  Camera,
  CheckCircle2,
  Cpu,
  Monitor,
  Palette,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const rumpunJurusan = [
  {
    number: '01',
    rumpun: 'Teknologi Informasi',
    ringkasan:
      'Mempersiapkan tenaga ahli infrastruktur jaringan komputer, administrasi server, serta keamanan sistem digital.',
    kompetensi: [
      {
        kode: 'TKJ',
        nama: 'Teknik Komputer dan Jaringan',
        fokus: 'Instalasi jaringan fiber optik, routing MikroTik & Cisco, manajemen server Linux, dan keamanan siber.',
        icon: Cpu,
      },
    ],
  },
  {
    number: '02',
    rumpun: 'Seni & Ekonomi Kreatif',
    ringkasan:
      'Mengasah keahlian komunikasi visual, desain media digital, fotografi, serta produksi audio visual standar industri.',
    kompetensi: [
      {
        kode: 'DKV',
        nama: 'Desain Komunikasi Visual',
        fokus: 'Desain grafis, identitas merek, ilustrasi digital, desain antarmuka UI/UX, dan periklanan kreatif.',
        icon: Palette,
      },
      {
        kode: 'BC',
        nama: 'Broadcasting dan Perfilman',
        fokus: 'Produksi program televisi, sinematografi, penyutradaraan, tata suara, dan penyuntingan video profesional.',
        icon: Camera,
      },
    ],
  },
  {
    number: '03',
    rumpun: 'Bisnis & Manajemen',
    ringkasan:
      'Mencetak profesional di bidang keuangan, tata kelola perkantoran modern, pemasaran daring, dan kewirausahaan.',
    kompetensi: [
      {
        kode: 'AK',
        nama: 'Akuntansi',
        fokus: 'Penyusunan laporan keuangan, perpajakan, audit dasar, dan pengoperasian perangkat lunak akuntansi.',
        icon: Calculator,
      },
      {
        kode: 'MPLB',
        nama: 'Manajemen Perkantoran & Layanan Bisnis',
        fokus: 'Administrasi perkantoran digital, korespondensi bisnis, manajemen kearsipan, dan layanan pelanggan.',
        icon: Briefcase,
      },
      {
        kode: 'BD',
        nama: 'Bisnis Digital',
        fokus: 'Strategi pemasaran digital, pengelolaan toko daring, analisis pasar, dan pengembangan usaha berbasis platform.',
        icon: TrendingUp,
      },
    ],
  },
];

export default function LandingPage() {
  const { user } = useAuth();
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [labImgFailed, setLabImgFailed] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Top Bar: Strict 3-zone contract */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-6 py-4">
          <Link
            to="/"
            className="text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            SMK Prima Unggul
          </Link>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a
              href="#profil"
              className="hover:text-red-600 transition-colors whitespace-nowrap shrink-0"
            >
              Profil Sekolah
            </a>
            <a
              href="#jurusan"
              className="hover:text-red-600 transition-colors whitespace-nowrap shrink-0"
            >
              Program Keahlian
            </a>
            <a
              href="#sistem"
              className="hover:text-red-600 transition-colors whitespace-nowrap shrink-0"
            >
              Sistem Presensi
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to={user ? '/app/dashboard' : '/login'}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors whitespace-nowrap shrink-0"
            >
              <span>{user ? 'Buka Aplikasi' : 'Masuk Portal'}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 pt-12 pb-16 lg:pt-16 lg:pb-20">
        <div className="grid items-stretch gap-10 lg:grid-cols-12">
          <div className="flex flex-col justify-center lg:col-span-6">
            <p className="text-xs font-semibold tracking-wide text-red-600">
              Pendidikan Vokasi Terpadu · Tangerang & Sekitarnya
            </p>
            <h1
              className="mt-4 font-extrabold tracking-tight text-slate-900 leading-[1.12]"
              style={{ fontSize: 'clamp(2.25rem, 3.6vw, 3.35rem)', textWrap: 'balance' }}
            >
              Sekolah Vokasi Unggul Berstandar Industri & Tata Kelola Digital
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">
              SMK Prima Unggul menyelenggarakan pendidikan kejuruan berbasis kompetensi pada 3
              rumpun jurusan utama dan 6 program keahlian (TKJ, DKV, AK, BC, MPLB, dan BD),
              didukung sistem presensi terintegrasi bagi siswa, guru, dan tenaga kependidikan.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                to={user ? '/app/dashboard' : '/login'}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-semibold text-white hover:bg-red-700 transition-colors whitespace-nowrap shrink-0"
              >
                <span>{user ? 'Masuk ke Dashboard' : 'Login Sistem Absensi'}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#jurusan"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:border-red-300 hover:text-red-700 transition-colors whitespace-nowrap shrink-0"
              >
                Lihat 6 Kompetensi Keahlian
              </a>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-72 w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 sm:h-96 lg:h-full lg:min-h-[420px]">
              {!heroImgFailed ? (
                <img
                  src="/src/assets/images/hero_campus_vocational_1795061929754.jpg"
                  alt="Gedung Utama Kampus SMK Prima Unggul"
                  referrerPolicy="no-referrer"
                  onError={() => setHeroImgFailed(true)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-red-50 via-white to-slate-100 p-8 text-center">
                  <Building2 className="h-12 w-12 text-red-600" />
                  <p className="mt-3 text-sm font-semibold text-slate-700">
                    Kampus Terpadu SMK Prima Unggul
                  </p>
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/75 via-slate-950/30 to-transparent p-6">
                <p className="text-xs font-medium text-slate-200">
                  Kampus Utama SMK Prima Unggul · Fasilitas Laboratorium & Studio Praktik
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Full-width 4-column metric strip below hero */}
        <div className="mt-14 grid grid-cols-2 divide-y divide-slate-200 border-y border-slate-200 md:grid-cols-4 md:divide-x md:divide-y-0">
          <div className="py-5 md:pr-6">
            <p className="font-mono text-3xl font-bold text-red-600 tabular-nums">03</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">Rumpun Jurusan</p>
            <p className="mt-0.5 text-xs text-slate-500">TI, Kreatif, & Bisnis Manajemen</p>
          </div>
          <div className="py-5 md:px-6">
            <p className="font-mono text-3xl font-bold text-red-600 tabular-nums">06</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">Kompetensi Keahlian</p>
            <p className="mt-0.5 text-xs text-slate-500">TKJ · DKV · BC · AK · MPLB · BD</p>
          </div>
          <div className="py-5 md:px-6">
            <p className="font-mono text-3xl font-bold text-red-600 tabular-nums">03</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">Akses Role Pengguna</p>
            <p className="mt-0.5 text-xs text-slate-500">Admin, Guru, & Tenaga Kependidikan</p>
          </div>
          <div className="py-5 md:pl-6">
            <p className="font-mono text-3xl font-bold text-red-600 tabular-nums">100%</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">Rekap Kehadiran Digital</p>
            <p className="mt-0.5 text-xs text-slate-500">Presensi Karyawan & Siswa Harian</p>
          </div>
        </div>
      </section>

      {/* Profil Sekolah */}
      <section id="profil" className="border-t border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              {!labImgFailed ? (
                <img
                  src="/src/assets/images/vocational_lab_practice_1795061929413.jpg"
                  alt="Praktik Siswa di Laboratorium Komputer dan Media Kreatif SMK Prima Unggul"
                  referrerPolicy="no-referrer"
                  onError={() => setLabImgFailed(true)}
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] w-full flex-col items-center justify-center bg-slate-100 p-6 text-center">
                  <Monitor className="h-10 w-10 text-red-600" />
                  <p className="mt-2 text-sm font-semibold text-slate-700">
                    Laboratorium Praktik Vokasi
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-7">
            <p className="text-xs font-semibold tracking-wide text-red-600">
              Tentang Sekolah
            </p>
            <h2
              className="mt-2 text-3xl font-bold tracking-tight text-slate-900"
              style={{ textWrap: 'balance' }}
            >
              Profil SMK Prima Unggul
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              SMK Prima Unggul adalah lembaga pendidikan menengah kejuruan yang memadukan penguasaan
              keterampilan teknis, etos kerja profesional, dan kedisiplinan karakter. Seluruh
              kegiatan belajar mengajar didukung kurikulum selaras Dunia Usaha dan Dunia Industri
              (DUDI) serta pencatatan kehadiran digital secara terpusat.
            </p>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-bold text-slate-900">Pembelajaran Berbasis Proyek</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  Siswa mempraktikkan langsung studi kasus industri di laboratorium jaringan,
                  studio kreatif, dan unit bisnis sekolah.
                </p>
              </div>
              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-sm font-bold text-slate-900">Kedisiplinan Terukur</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  Rekam kehadiran guru, tenaga kependidikan, dan seluruh siswa dicatat secara rapi
                  untuk evaluasi akademik berkala.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Program Keahlian: 3 Jurusan -> 6 Kompetensi (TKJ, DKV, AK, BC, MPLB, BD) */}
      <section id="jurusan" className="border-t border-slate-200 bg-white py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-wide text-red-600">
              Struktur Kurikulum Vokasi
            </p>
            <h2
              className="mt-2 text-3xl font-bold tracking-tight text-slate-900"
              style={{ textWrap: 'balance' }}
            >
              3 Rumpun Jurusan & 6 Kompetensi Keahlian
            </h2>
            <p className="mt-3 text-base leading-relaxed text-slate-600">
              SMK Prima Unggul menaungi tiga bidang keahlian utama yang terbagi ke dalam enam
              program keahlian: TKJ, DKV, BC, AK, MPLB, dan BD.
            </p>
          </div>

          <div className="mt-12 space-y-10">
            {rumpunJurusan.map((group) => (
              <div
                key={group.number}
                className="rounded-xl border border-slate-200 bg-white p-6 md:p-8"
              >
                <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-end">
                  <div>
                    <p className="font-mono text-xs font-semibold text-red-600">
                      Jurusan {group.number}
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-slate-900">{group.rumpun}</h3>
                  </div>
                  <p className="max-w-xl text-sm leading-relaxed text-slate-600">
                    {group.ringkasan}
                  </p>
                </div>

                <div
                  className={`mt-6 grid gap-6 ${
                    group.kompetensi.length === 1
                      ? 'grid-cols-1'
                      : group.kompetensi.length === 2
                        ? 'md:grid-cols-2'
                        : 'md:grid-cols-3'
                  }`}
                >
                  {group.kompetensi.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.kode}
                        className="flex flex-col justify-between rounded-lg border border-slate-200 bg-slate-50/60 p-5"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-mono text-sm font-bold text-red-700">
                              {item.kode}
                            </span>
                            <Icon className="h-4 w-4 text-slate-400" />
                          </div>
                          <h4 className="mt-3 text-base font-bold text-slate-900">{item.nama}</h4>
                          <p className="mt-2 text-sm leading-relaxed text-slate-600">
                            {item.fokus}
                          </p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-200/80 text-xs font-medium text-slate-500">
                          Program 3 Tahun · Sertifikasi Kompetensi
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sistem Presensi Overview */}
      <section id="sistem" className="border-t border-slate-200 bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold tracking-wide text-red-600">
                Sistem Informasi Sekolah
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                Satu Portal Presensi untuk Seluruh Civitas
              </h2>
              <p className="mt-3 text-base text-slate-600">
                Hak akses menu disesuaikan secara otomatis berdasarkan peran masing-masing pengguna
                di sekolah.
              </p>
            </div>
            <Link
              to={user ? '/app/dashboard' : '/login'}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors whitespace-nowrap shrink-0 self-start"
            >
              <span>{user ? 'Masuk Dashboard' : 'Login Sekarang'}</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-xs font-semibold text-red-600">01 · Administrator</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900">Kontrol Penuh & Master Data</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <span>Kelola akun Admin, Guru, & Tenaga Kependidikan</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <span>Kelola master data siswa (NIS, Nama, Kelas)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <span>Rekap absensi karyawan & siswa bulanan</span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-xs font-semibold text-red-600">02 · Guru</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900">Presensi Mandiri & Kelas</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <span>Absen masuk dan pulang mandiri sebagai karyawan</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <span>Input absensi harian siswa per kelas</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <span>Pantau dan ekspor rekap absensi siswa</span>
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <p className="text-xs font-semibold text-red-600">03 · Tenaga Kependidikan</p>
              <h3 className="mt-2 text-lg font-bold text-slate-900">Presensi Kerja Harian</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <span>Dashboard ringkasan kehadiran pribadi</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <span>Absen mandiri (Hadir, Izin, atau Sakit)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                  <span>Riwayat presensi 30 hari terakhir</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-6 text-sm text-slate-500 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-4 w-4 text-red-600" />
            <span className="font-semibold text-slate-900">SMK Prima Unggul</span>
            <span aria-hidden="true">·</span>
            <span>TKJ · DKV · AK · BC · MPLB · BD</span>
          </div>
          <p className="text-xs">
            &copy; {new Date().getFullYear()} SMK Prima Unggul. Sistem Absensi Siswa & Karyawan.
          </p>
        </div>
      </footer>
    </div>
  );
}
