
export type TrainerAttendanceStatus = 'Present' | 'Late' | 'Absent' | 'EarlyLeave';

export interface CompanyTrainerDto {
  trainerId: number;
  fullName?: string | null;
  specialty?: string | null;
  profileImageUrl?: string | null;
  status: string; // Active | Inactive | Suspended
}

export interface TrainerAttendanceDto {
  trainerAttendanceId: number;
  companyId: number;
  trainerId: number;
  trainerName?: string | null;
  date: string; // e.g. "2026-10-07T00:00:00"
  status: TrainerAttendanceStatus;
  checkInTime?: string | null; // "HH:mm:ss"
  checkOutTime?: string | null; // "HH:mm:ss"
  reason?: string | null;
  excuseProofUrl?: string | null;
  isConfirmed: boolean;
}

export interface TrainerAttendanceUpsertDto {
  companyId: number;
  trainerId: number;
  date: string; // "YYYY-MM-DD"
  status: TrainerAttendanceStatus;
  reason?: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
}

export interface TrainerAttendanceConfirmDto {
  companyId: number;
  date: string; // "YYYY-MM-DD"
}