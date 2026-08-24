import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../services/admin-api';
import { WarningDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-admin-warnings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './warnings.html',
  styleUrls: ['./warnings.css']
})
export class AdminWarnings implements OnInit {
  warnings = signal<WarningDto[]>([]);
  showIssue = signal(false);
  selectedWarning = signal<any | null>(null);
  searchTerm = '';

  // حالة التحميل والأخطاء
  isSubmitting = signal(false);
  formErrors = signal<{ [key: string]: string }>({});
  touchedFields = signal<{ [key: string]: boolean }>({});

  newWarning = { companyId: null as number | null, type: 'Performance', level: 'Medium', evidence: '' };

  constructor(private api: AdminApi) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.api.getWarnings({ scope: 'Company' } as any).subscribe((d: any) => {
      const list: WarningDto[] = Array.isArray(d) ? d : (d?.items || []);
      const companyWarnings = list.filter(w => 
        w.scope === 'Company' || 
        (w as any).scope === 0 || 
        (w as any).companyId !== null
      );
      this.warnings.set(companyWarnings);
    });
  }

  // فتح وإغلاق النافذة مع إعادة تعيين النموذج
  openIssueModal(): void {
    this.newWarning = { companyId: null, type: 'Performance', level: 'Medium', evidence: '' };
    this.formErrors.set({});
    this.touchedFields.set({});
    this.showIssue.set(true);
  }

  closeIssueModal(): void {
    if (this.isSubmitting()) return;
    this.showIssue.set(false);
  }

  // التحقق من الحقول
  validateForm(): boolean {
    const errors: { [key: string]: string } = {};

    if (!this.newWarning.companyId || this.newWarning.companyId <= 0) {
      errors['companyId'] = 'يرجى إدخال رقم شركة صحيح وموجود.';
    }

    if (!this.newWarning.type) {
      errors['type'] = 'يرجى اختيار تصنيف المخالفة.';
    }

    if (!this.newWarning.level) {
      errors['level'] = 'يرجى اختيار درجة الأهمية.';
    }

    const evidenceText = (this.newWarning.evidence || '').trim();
    if (!evidenceText) {
      errors['evidence'] = 'يرجى كتابة أسباب وملاحظات الإنذار.';
    } else if (evidenceText.length < 10) {
      errors['evidence'] = 'يجب أن تحتوي الأسباب على 10 أحرف على الأقل.';
    } else if (evidenceText.length > 1000) {
      errors['evidence'] = 'يجب ألا تتجاوز الأسباب 1000 حرف.';
    }

    this.formErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  markFieldTouched(field: string): void {
    this.touchedFields.set({ ...this.touchedFields(), [field]: true });
    this.validateForm();
  }

  issue(): void {
    // تعليم جميع الحقول كملموسة لإظهار الأخطاء عند الضغط
    this.touchedFields.set({ companyId: true, type: true, level: true, evidence: true });

    if (!this.validateForm() || this.isSubmitting()) return;

    this.isSubmitting.set(true);
    this.api.createWarning({
      scope: 'Company',
      companyId: this.newWarning.companyId!,
      type: this.newWarning.type,
      level: this.newWarning.level,
      evidence: this.newWarning.evidence,
      raisedByUserId: 1
    }).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.showIssue.set(false);
        this.load();
      },
      error: () => {
        this.isSubmitting.set(false);
      }
    });
  }

  filteredWarnings(): WarningDto[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.warnings();

    return this.warnings().filter(w => {
      const name = (w.targetName || (w as any).companyName || '').toLowerCase();
      const code = ('CW-' + w.warningId).toLowerCase();
      return name.includes(term) || code.includes(term);
    });
  }

  getCountByStatus(statusKey: string): number {
    return this.warnings().filter(w => {
      const st = String(w.status);
      if (statusKey === 'Open') return st === '0' || st === 'Open';
      if (statusKey === 'UnderReview') return st === '1' || st === 'UnderReview';
      if (statusKey === 'Resolved') return st === '2' || st === 'Resolved';
      return false;
    }).length;
  }

  getItemProp(item: any, propName: string, fallback: string = '-'): string {
    return item && item[propName] ? item[propName] : fallback;
  }

  openDetailsModal(warning: WarningDto): void {
    this.selectedWarning.set(warning);
  }

  closeDetailsModal(): void {
    this.selectedWarning.set(null);
  }

  getAvatar(name?: string): string {
    if (!name) return 'ش';
    const words = name.trim().split(' ');
    return words.length >= 2 
      ? (words[0][0] + words[1][0]).toUpperCase() 
      : name.substring(0, 2).toUpperCase();
  }

  getTypeLabel(type?: any): string {
    const val = String(type);
    if (val === '0' || val === 'Performance') return 'بيئة الأداء والتدريب';
    if (val === '1' || val === 'Attendance') return 'التزامات الحضور';
    if (val === '2' || val === 'Behavioral') return 'الضوابط السلوكية';
    if (val === '3' || val === 'Other') return 'تنظيمي آخر';
    return type ?? '-';
  }

  getLevelLabel(level?: any): string {
    const val = String(level);
    if (val === '0' || val === 'Low') return 'منخفض';
    if (val === '1' || val === 'Medium') return 'متوسط';
    if (val === '2' || val === 'High') return 'مرتفع';
    if (val === '3' || val === 'Critical') return 'حرج جداً';
    return level ?? 'متوسط';
  }

  getLevelClass(level?: any): string {
    const val = String(level);
    if (val === '0' || val === 'Low') return 'lvl-low';
    if (val === '1' || val === 'Medium') return 'lvl-medium';
    if (val === '2' || val === 'High') return 'lvl-high';
    if (val === '3' || val === 'Critical') return 'lvl-critical';
    return 'lvl-medium';
  }

  getStatusLabel(status?: any): string {
    const val = String(status);
    if (val === '0' || val === 'Open') return 'نشط';
    if (val === '1' || val === 'UnderReview') return 'قيد المراجعة';
    if (val === '2' || val === 'Resolved') return 'مكتمل';
    return status ?? 'نشط';
  }

  getStatusClass(status?: any): string {
    const val = String(status);
    if (val === '0' || val === 'Open') return 'st-open';
    if (val === '1' || val === 'UnderReview') return 'st-review';
    if (val === '2' || val === 'Resolved') return 'st-resolved';
    return 'st-open';
  }
}