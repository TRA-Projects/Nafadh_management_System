import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';

import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyAccountDto } from '../../../../core/models/dtos';

type AccountTab = 'info' | 'permissions' | 'activities';

@Component({
  selector: 'app-my-account',
  imports: [DatePipe],
  templateUrl: './my-account.html',
  styleUrls: ['./my-account.scss'],
})
export class CompanyMyAccount implements OnInit {
  private readonly api = inject(CompanyApi);
  readonly auth = inject(AuthService);

  profile = signal<CompanyAccountDto | null>(null);
  loading = signal(true);
  loadError = signal(false);
  activeTab = signal<AccountTab>('info');

  ngOnInit(): void {
    this.loadAccount();
  }

  setActiveTab(tab: AccountTab): void {
    this.activeTab.set(tab);
  }

  loadAccount(): void {
    this.loading.set(true);
    this.loadError.set(false);

    this.api.getCurrentAccount().subscribe({
      next: (data) => {
        this.profile.set(data);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load company account:', error);
        this.profile.set(null);
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  async exportToPdf(): Promise<void> {
    const element = document.getElementById('account-pdf-content');
    if (!element) return;

    if (typeof (window as any).html2pdf === 'undefined') {
      await this.loadPdfScript();
    }

    const html2pdf = (window as any).html2pdf;
    if (!html2pdf) return;

    html2pdf()
      .set({
        margin: 10,
        filename: `بيانات_الحساب_${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      })
      .from(element)
      .save();
  }

  private loadPdfScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-html2pdf="true"]');
      if (existing) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src =
        'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.setAttribute('data-html2pdf', 'true');
      script.onload = () => resolve();
      script.onerror = (error) => reject(error);
      document.body.appendChild(script);
    });
  }
}
