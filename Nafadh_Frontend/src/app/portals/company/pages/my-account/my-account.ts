import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyAccountDto } from '../../../../core/models/dtos';

type AccountTab = 'info' | 'permissions' | 'activities';

@Component({
  selector: 'app-my-account',
  imports: [DatePipe, FormsModule],
  templateUrl: './my-account.html',
  styleUrls: ['./my-account.scss'],
})
export class CompanyMyAccount implements OnInit {

  private readonly api = inject(CompanyApi);
  readonly auth = inject(AuthService);

  profile = signal<CompanyAccountDto | null>(null);
  loading = signal(true);
  loadError = signal(false);
  exportingPdf = signal(false);
  activeTab = signal<AccountTab>('info');
  editingAccount = signal(false);
savingAccount = signal(false);

editPhone = signal('');

  ngOnInit(): void {
    this.loadAccount();
  }

  setActiveTab(tab: AccountTab): void {
    this.activeTab.set(tab);
  }
  startEditAccount(): void {
  const account = this.profile();

  if (!account) {
    return;
  }


  this.editPhone.set(account.phone ?? '');

  this.editingAccount.set(true);
}

cancelEditAccount(): void {
  this.editingAccount.set(false);
}

saveAccount(): void {
  const phone = this.editPhone().trim();

  this.savingAccount.set(true);

  this.api.updateMyAccount({
    phone
    
  }).subscribe({
    next: () => {
      const current = this.profile();

      if (current) {
        this.profile.set({
          ...current,
          phone
        });
      }

      this.editingAccount.set(false);
      this.savingAccount.set(false);
    },

    error: (error) => {
      console.error('Failed to update phone:', error);
      this.savingAccount.set(false);
    }
  });
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

exportToPdf(): void {
  console.log('PDF BUTTON CLICKED');

  this.api.downloadMyAccountPdf().subscribe({
    next: (blob: Blob) => {
      console.log('PDF RECEIVED:', blob);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = url;
      link.download = 'حسابي.pdf';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);
    },

    error: (error) => {
      console.error('PDF EXPORT ERROR:', error);
    },
  })
}
};
