import { NafadhConstantsService } from '../../../../core/services/nafadh-constants.service';
import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';

import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyAccountDto } from '../../../../core/models/dtos';

type AccountTab = 'info' | 'permissions' | 'activities';

@Component({
  selector: 'app-my-account',
  imports: [DatePipe, FormsModule, CommonModule],
  templateUrl: './my-account.html',
  styleUrls: ['./my-account.scss'],
})
export class CompanyMyAccount implements OnInit {
  readonly constants = inject(NafadhConstantsService);

  private readonly api = inject(CompanyApi);
  readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  profile = signal<CompanyAccountDto | null>(null);
  loading = signal(true);
  loadError = signal(false);
  exportingPdf = signal(false);
  pdfExportError = signal<string | null>(null);
  activeTab = signal<AccountTab>('info');
  editingAccount = signal(false);
  savingAccount = signal(false);
  accountSaveError = signal<string | null>(null);

  editPhone = signal('');
  
  // مصفوفة تخزين الأنشطة المحلية (مثل تقييمات المدربين)
  localActivities = signal<any[]>([]);

  ngOnInit(): void {
    this.loadAccount();
    this.loadLocalActivities();

    // الاستماع لبارامترات الرابط لفتح تبويب الأنشطة تلقائياً
    this.route.queryParams.subscribe(params => {
      const tab = params['tab'];
      if (tab === 'activity-log' || tab === 'activities') {
        this.activeTab.set('activities');
      }
    });
  }

  setActiveTab(tab: AccountTab): void {
    this.activeTab.set(tab);
  }

  loadLocalActivities(): void {
    const saved = localStorage.getItem('company_supervisor_activities');
    if (saved) {
      try {
        this.localActivities.set(JSON.parse(saved));
      } catch (e) {
        this.localActivities.set([]);
      }
    }
  }

  // حفظ التغييرات في localStorage بعد الحذف أو المسح
  private saveLocalActivitiesToStorage(activities: any[]): void {
    localStorage.setItem('company_supervisor_activities', JSON.stringify(activities));
  }

  // مسح التقييمات المحلية بالكامل
  clearLocalActivities(): void {
    this.localActivities.set([]);
    localStorage.removeItem('company_supervisor_activities');
  }

  // حذف نشاط محلي فردي حسب الـ Index
  removeLocalActivity(index: number): void {
    this.localActivities.update((acts: any[]) => {
      const updated = acts.filter((_, i) => i !== index);
      this.saveLocalActivitiesToStorage(updated);
      return updated;
    });
  }

  // إزالة نشاط الخادم من الواجهة محلياً
  removeServerActivity(activity: any): void {
    const currentProfile = this.profile();
    if (currentProfile && currentProfile.recentActivities) {
      currentProfile.recentActivities = currentProfile.recentActivities.filter((a: any) => a !== activity);
      this.profile.set({ ...currentProfile });
    }
  }

  startEditAccount(): void {
    const account = this.profile();
    if (!account) {
      return;
    }
    this.editPhone.set(account.phone ?? '');
    this.accountSaveError.set(null);
    this.editingAccount.set(true);
  }

  cancelEditAccount(): void {
    this.editingAccount.set(false);
    this.accountSaveError.set(null);
  }

  saveAccount(): void {
    if (this.savingAccount()) return;
    const phone = this.editPhone().trim().replace(/[٠-٩۰-۹]/g, digit => {
      const code = digit.charCodeAt(0);
      return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
    }).replace(/[\s()-]/g, '');
    this.accountSaveError.set(null);
    if (!/^\+?[0-9]{8,15}$/.test(phone)) {
      this.accountSaveError.set('أدخل رقم هاتف صحيحًا من 8 إلى 15 رقمًا، دون حروف.');
      return;
    }
    this.savingAccount.set(true);

    this.api.updateMyAccount({ phone }).subscribe({
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
      error: (error: unknown) => {
        console.error('Failed to update phone:', error);
        this.accountSaveError.set('تعذر حفظ رقم الهاتف. تحققي من صحة الرقم والصلاحيات ثم حاولي مجددًا.');
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
    if (this.exportingPdf()) return;
    this.pdfExportError.set(null);
    this.exportingPdf.set(true);

    this.api.downloadMyAccountPdf().pipe(
      finalize(() => this.exportingPdf.set(false))
    ).subscribe({
      next: (blob: Blob) => {
        // A JSON error response or an empty document must not be downloaded as PDF.
        if (!blob || blob.size === 0 || !blob.type.toLowerCase().includes('pdf')) {
          this.pdfExportError.set('تعذر إنشاء ملف PDF. يرجى المحاولة مرة أخرى.');
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'حسابي.pdf';
        document.body.appendChild(link);
        link.click();
        link.remove();
        // Give the browser time to consume the object URL before releasing it.
        setTimeout(() => URL.revokeObjectURL(url), 1500);
      },
      error: (error: unknown) => {
        console.error('Company account PDF export failed:', error);
        this.pdfExportError.set('فشل تنزيل ملف PDF. تأكدي من صلاحية الوصول وحاولي مجددًا.');
      },
    });
  }

}