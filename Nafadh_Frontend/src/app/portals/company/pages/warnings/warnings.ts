import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core'; // 1. استيراد ChangeDetectorRef
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
  private readonly cdr = inject(ChangeDetectorRef); // 2. حقن ChangeDetectorRef

  warnings: WarningDto[] = [];
  selectedWarning: WarningDto | null = null;

  loading = false;
  errorMessage = '';

  searchText = '';
  selectedType = '';
  selectedLevel = '';
  selectedStatus = '';

  ngOnInit(): void {
    this.loadCompanyWarnings();
  }

  loadCompanyWarnings(): void {
    this.loading = true;
    this.errorMessage = '';

    this.companyApi.getCurrentAccount().subscribe({
      next: (account) => {
        if (!account?.companyId) {
          this.loading = false;
          this.errorMessage = 'تعذر تحديد الشركة المرتبطة بالحساب الحالي.';
          this.cdr.detectChanges(); // تحديث الواجهة عند الخطأ
          return;
        }

        this.companyApi.getCompanyWarnings(account.companyId).subscribe({
          next: (data) => {
            this.warnings = data ?? [];
            console.log('Company warnings:', data);
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

            this.cdr.detectChanges(); // 3. إجبار Angular على تحديث الواجهة فور وصول البيانات
          },
          error: () => {
            this.loading = false;
            this.errorMessage = 'تعذر تحميل الإنذارات. تحققي من اتصال الـ Backend ثم حاولي مجددًا.';
            this.cdr.detectChanges(); // تحديث الواجهة عند الخطأ
          }
        });
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'تعذر تحميل بيانات الحساب الحالي. يرجى تسجيل الدخول مجددًا إذا استمرت المشكلة.';
        this.cdr.detectChanges(); // تحديث الواجهة عند الخطأ
      }
    });
  }

  // باقي الدوال تبقى كما هي...
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
  }

  closeDetails(): void {
    this.selectedWarning = null;
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