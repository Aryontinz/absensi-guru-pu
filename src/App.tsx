/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import AppShell from './components/AppShell';
import DashboardPage from './pages/app/DashboardPage';
import AbsensiKaryawanPage from './pages/app/AbsensiKaryawanPage';
import AbsensiSiswaPage from './pages/app/AbsensiSiswaPage';
import RekapAbsensiPage from './pages/app/RekapAbsensiPage';
import DataSiswaPage from './pages/app/DataSiswaPage';
import ManajemenUserPage from './pages/app/ManajemenUserPage';
import EditUserPage from './pages/app/EditUserPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />

          <Route path="/app" element={<AppShell />}>
            <Route index element={<Navigate to="/app/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="absensi-karyawan" element={<AbsensiKaryawanPage />} />
            <Route path="absensi-siswa" element={<AbsensiSiswaPage />} />
            <Route path="rekap/:type" element={<RekapAbsensiPage />} />
            <Route path="data-siswa" element={<DataSiswaPage />} />
            <Route path="manajemen-user" element={<ManajemenUserPage />} />
            <Route path="manajemen-user/:id" element={<EditUserPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
