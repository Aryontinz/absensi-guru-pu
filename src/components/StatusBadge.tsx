import { CheckCircle2, Clock, FileWarning, XCircle } from 'lucide-react';
import type { EmployeeStatus, StudentStatus } from '../types/database';

export function AttendanceStatusText({
  status,
}: {
  status: EmployeeStatus | StudentStatus;
}) {
  switch (status) {
    case 'Hadir':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>Hadir</span>
        </span>
      );
    case 'Izin':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>Izin</span>
        </span>
      );
    case 'Sakit':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <FileWarning className="h-3.5 w-3.5 shrink-0" />
          <span>Sakit</span>
        </span>
      );
    case 'Alpa':
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700">
          <XCircle className="h-3.5 w-3.5 shrink-0" />
          <span>Alpa</span>
        </span>
      );
  }
}

export function formatRoleLabel(role?: string): string {
  if (role === 'admin') return 'Administrator';
  if (role === 'guru') return 'Guru';
  if (role === 'tenaga_kependidikan') return 'Tenaga Kependidikan';
  return role || '-';
}

export function formatTime(isoString: string | null): string {
  if (!isoString) return '-';
  return new Date(isoString).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
