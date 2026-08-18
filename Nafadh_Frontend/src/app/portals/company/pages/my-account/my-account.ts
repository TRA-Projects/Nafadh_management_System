import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';

export interface TrainerProfileDto {
  trainerId: number;
  fullName?: string;
  email?: string;
  specialty?: string;
  experienceYears: number;
  biography?: string;
  cvUrl?: string;
  status: any;
}

@Component({
  selector: 'app-company-my-account',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-account.html',
  styleUrls: ['./my-account.scss']
})
export class CompanyMyAccount implements OnInit {
  profile = signal<TrainerProfileDto | null>(null);

  constructor(private api: CompanyApi, public auth: AuthService) {}

  ngOnInit() {
    const supervisorId = this.auth.userId ?? 1;
    this.api.getSupervisorProfile(supervisorId).subscribe({
      next: (p: any) => this.profile.set(p),
      error: (err) => console.error('خطأ في جلب بيانات الحساب:', err)
    });
  }

  // دالة الاستدعاء الديناميكي المباشر للمكتبة
  async exportToPDF() {
    const element = document.getElementById('account-page-content');
    if (!element) return;

    const html2pdf = (await import('html2pdf.js')).default;

    const options = {
      margin: 10,
      filename: `بيانات_الحساب_${this.profile()?.fullName || 'المستخدم'}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 }, // 👈 إضافة as const هنا
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const }
    };

    html2pdf().set(options).from(element).save();
  }
}