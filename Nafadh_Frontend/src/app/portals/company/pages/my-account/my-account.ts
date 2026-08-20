import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';

@Component({
  selector: 'app-my-account',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './my-account.html',
  styleUrls: ['./my-account.scss']
})
export class CompanyMyAccount implements OnInit {
  // استخدام any لتجنب التعارض مع Dto إذا كانت الخصائص غير معرفة فيه
  profile = signal<any>(null);
  activeTab = signal<'info' | 'permissions' | 'activities'>('info');

  constructor(private api: CompanyApi, public auth: AuthService) {}

  ngOnInit() {
    const supervisorId = this.auth.userId ?? 1;
    this.api.getSupervisorProfile(supervisorId).subscribe({
      next: (p) => this.profile.set(p),
      error: (err) => console.error('Error fetching profile:', err)
    });
  }

  setActiveTab(tab: 'info' | 'permissions' | 'activities') {
    this.activeTab.set(tab);
  }

  async exportToPdf() {
    const element = document.getElementById('account-pdf-content');
    if (!element) return;

    if (typeof (window as any).html2pdf === 'undefined') {
      await this.loadPdfScript();
    }

    const html2pdf = (window as any).html2pdf;

    const opt = {
      margin:       10,
      filename:     `بيانات_الحساب_${new Date().toISOString().slice(0, 10)}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  }

  private loadPdfScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => resolve();
      script.onerror = (err) => reject(err);
      document.body.appendChild(script);
    });
  }
}