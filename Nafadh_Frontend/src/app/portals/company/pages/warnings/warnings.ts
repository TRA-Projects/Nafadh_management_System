import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CompanyApi } from '../../services/company-api';
import { WarningDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-company-warnings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './warnings.html',
  styleUrls: ['./warnings.scss']
})
export class WarningsComponent implements OnInit {
  private readonly companyApi = inject(CompanyApi);

  warnings: WarningDto[] = [];
  selectedWarning: WarningDto | null = null;

  loading = false;
  errorMessage = '';

  searchText = '';
  selectedType = '';
  selectedLevel = '';
  selectedStatus = '';

  companyId: number | null = null;
  companyReply = '';
  sendingReply = false;
  replyError = '';
  replySuccess = '';

  ngOnInit(): void {
    this.loadCompanyWarnings();
  }

  /**
   * جلب بيانات الشركة الحالية ثم إنذاراتها فقط.
   */
  loadCompanyWarnings(): void {
    this.loading = true;
    this.errorMessage = '';

    this.companyApi.getCurrentAccount().subscribe({
      next: (account) => {
        if (account?.companyId == null) {
          this.loading = false;
          this.errorMessage =
            'تعذر تحديد الشركة المرتبطة بالحساب الحالي.';
          return;
        }

        // حفظ رقم الشركة بعد استلام بيانات الحساب.
        this.companyId = account.companyId;

        this.companyApi.getCompanyWarnings(this.companyId).subscribe({
          next: (data) => {
            this.warnings = data ?? [];

            console.log('Company warnings:', this.warnings);
            console.log('Warnings count:', this.warnings.length);

            this.loading = false;

            if (this.selectedWarning) {
              this.selectedWarning =
                this.warnings.find(
                  warning =>
                    warning.warningId ===
                    this.selectedWarning?.warningId
                ) ?? null;
            }
          },
          error: () => {
            this.loading = false;
            this.errorMessage =
              'تعذر تحميل الإنذارات. تحققي من اتصال Backend ثم حاولي مجددًا.';
          }
        });
      },
      error: () => {
        this.loading = false;
        this.errorMessage =
          'تعذر تحميل بيانات الحساب الحالي. يرجى تسجيل الدخول مجددًا إذا استمرت المشكلة.';
      }
    });
  }

  /**
   * إرسال رد الشركة على الإنذار المحدد.
   */
  sendReply(): void {
    const reply = this.companyReply.trim();

    this.replyError = '';
    this.replySuccess = '';

    if (!this.selectedWarning) {
      this.replyError = 'يرجى اختيار إنذار أولًا.';
      return;
    }

    if (this.companyId === null) {
      this.replyError = 'تعذر تحديد الشركة الحالية.';
      return;
    }

    if (!reply) {
      this.replyError = 'يرجى كتابة الرد قبل الإرسال.';
      return;
    }

    if (reply.length > 500) {
      this.replyError = 'الرد يجب ألا يتجاوز 500 حرف.';
      return;
    }

    const warningId = this.selectedWarning.warningId;

    this.sendingReply = true;

    this.companyApi
      .replyToCompanyWarning(warningId, this.companyId, reply)
      .subscribe({
        next: () => {
          // تحديث الرد في تفاصيل الإنذار والقائمة محليًا.
          this.warnings = this.warnings.map(warning =>
            warning.warningId === warningId
              ? { ...warning, companyReply: reply }
              : warning
          );

          this.selectedWarning = {
            ...this.selectedWarning!,
            companyReply: reply
          };

          this.companyReply = '';
          this.replySuccess = 'تم إرسال الرد وحفظه بنجاح.';
          this.sendingReply = false;
        },
        error: (error) => {
          console.error('Failed to send company warning reply:', error);
          this.replyError =
            'تعذر إرسال الرد. يرجى المحاولة مرة أخرى.';
          this.sendingReply = false;
        }
      });
  }

  get filteredWarnings(): WarningDto[] {
    const query = this.searchText.trim().toLowerCase();

    return this.warnings.filter((warning) => {
      const matchesSearch =
        !query ||
        String(warning.warningId).includes(query) ||
        (warning.targetName ?? '').toLowerCase().includes(query) ||
        (warning.raisedByName ?? '').toLowerCase().includes(query) ||
        (warning.evidence ?? '').toLowerCase().includes(query) ||
        this.typeLabel(warning.type).toLowerCase().includes(query);

      const matchesType =
        !this.selectedType || warning.type === this.selectedType;

      const matchesLevel =
        !this.selectedLevel || warning.level === this.selectedLevel;

      const matchesStatus =
        !this.selectedStatus || warning.status === this.selectedStatus;

      return (
        matchesSearch &&
        matchesType &&
        matchesLevel &&
        matchesStatus
      );
    });
  }

  get openCount(): number {
    return this.warnings.filter(w => w.status === 'Open').length;
  }

  get reviewCount(): number {
    return this.warnings.filter(w => w.status === 'UnderReview').length;
  }

  get resolvedCount(): number {
    return this.warnings.filter(w => w.status === 'Resolved').length;
  }

  get criticalCount(): number {
    return this.warnings.filter(w => w.level === 'Critical').length;
  }

  selectWarning(warning: WarningDto): void {
    this.selectedWarning = warning;
    this.companyReply = '';
    this.replyError = '';
    this.replySuccess = '';
  }

  closeDetails(): void {
    this.selectedWarning = null;
    this.companyReply = '';
    this.replyError = '';
    this.replySuccess = '';
  }

  resetFilters(): void {
    this.searchText = '';
    this.selectedType = '';
    this.selectedLevel = '';
    this.selectedStatus = '';
  }

  typeLabel(type: string): string {
    const labels: Record<string, string> = {
      Attendance: 'حضور وانضباط',
      Performance: 'الأداء',
      Behavioral: 'السلوك',
      Other: 'أخرى'
    };

    return labels[type] ?? type;
  }

  levelLabel(level: string): string {
    const labels: Record<string, string> = {
      Low: 'منخفض',
      Medium: 'متوسط',
      High: 'مرتفع',
      Critical: 'حرج'
    };

    return labels[level] ?? level;
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      Open: 'مفتوح',
      UnderReview: 'قيد المراجعة',
      Resolved: 'تم الحل',
      Escalated: 'تم التصعيد'
    };

    return labels[status] ?? status;
  }

  levelClass(level: string): string {
    const classes: Record<string, string> = {
      Low: 'level-low',
      Medium: 'level-medium',
      High: 'level-high',
      Critical: 'level-critical'
    };

    return classes[level] ?? '';
  }

  statusClass(status: string): string {
    const classes: Record<string, string> = {
      Open: 'status-open',
      UnderReview: 'status-review',
      Resolved: 'status-resolved',
      Escalated: 'status-escalated'
    };

    return classes[status] ?? '';
  }

  trackByWarningId(index: number, warning: WarningDto): number {
    return warning.warningId;
  }
}

export const warningsModuleCheck = true;