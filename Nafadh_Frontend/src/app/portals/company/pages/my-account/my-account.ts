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

  // ============================================================
  // Profile
  // ============================================================

  profile = signal<any>(null);

  // ============================================================
  // Active Tab
  // ============================================================

  activeTab = signal<'info' | 'permissions' | 'activities'>('info');

  // ============================================================
  // Constructor
  // ============================================================

  constructor(
    private api: CompanyApi,
    public auth: AuthService
  ) {}

  // ============================================================
  // Init
  // ============================================================

  ngOnInit(): void {

    // Use SupervisorId, not UserId.
    // The backend endpoint /CompanySupervisor/{id}
    // expects SupervisorId.
    const supervisorId = this.auth.supervisorId;

    if (!supervisorId) {
      console.error(
        'Supervisor ID not found in current session.'
      );
      return;
    }

    // Load profile from .NET API
    // API -> SQL Server
    this.api.getSupervisorProfile(supervisorId).subscribe({

      next: (profile) => {

        console.log(
          'Supervisor profile loaded from API:',
          profile
        );

        this.profile.set(profile);
      },

      error: (error) => {

        console.error(
          'Error fetching supervisor profile:',
          error
        );
      },

    });
  }

  // ============================================================
  // Change Active Tab
  // ============================================================

  setActiveTab(
    tab: 'info' | 'permissions' | 'activities'
  ): void {

    this.activeTab.set(tab);
  }

  // ============================================================
  // Export Account to PDF
  // ============================================================

  async exportToPdf(): Promise<void> {

    const element =
      document.getElementById('account-pdf-content');

    if (!element) {
      return;
    }

    if (
      typeof (window as any).html2pdf === 'undefined'
    ) {
      await this.loadPdfScript();
    }

    const html2pdf =
      (window as any).html2pdf;

    const opt = {
      margin: 10,

      filename:
        `بيانات_الحساب_${new Date()
          .toISOString()
          .slice(0, 10)}.pdf`,

      image: {
        type: 'jpeg',
        quality: 0.98
      },

      html2canvas: {
        scale: 2,
        useCORS: true
      },

      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      }
    };

    html2pdf()
      .set(opt)
      .from(element)
      .save();
  }

  // ============================================================
  // Load PDF Library
  // ============================================================

  private loadPdfScript(): Promise<void> {

    return new Promise((resolve, reject) => {

      const script =
        document.createElement('script');

      script.src =
        'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';

      script.onload = () => resolve();

      script.onerror = (error) =>
        reject(error);

      document.body.appendChild(script);
    });
  }
}