import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  companies = signal<any[]>([]);
  showIssue = signal(false);
  selectedWarning = signal<any | null>(null);

  // شريط البحث
  searchTerm = '';

  // التحكم باللوحة المدمجة للفلترة
  isFilterDropdownOpen = false;
  activeFilterTab: 'PRESETS' | 'YEAR' | 'MONTH' | 'STATUS' | 'LEVEL' = 'PRESETS';

  // الفلاتر المحددة حالياً
  selectedYear: string = 'ALL';
  selectedMonth: string = 'ALL';
  selectedStatus: string = 'ALL';
  selectedLevel: string = 'ALL';

  // قائمة الأشهر
  monthsList = [
    { value: '1', name: 'يناير (01)' },
    { value: '2', name: 'فبراير (02)' },
    { value: '3', name: 'مارس (03)' },
    { value: '4', name: 'أبريل (04)' },
    { value: '5', name: 'مايو (05)' },
    { value: '6', name: 'يونيو (06)' },
    { value: '7', name: 'يوليو (07)' },
    { value: '8', name: 'أغسطس (08)' },
    { value: '9', name: 'سبتمبر (09)' },
    { value: '10', name: 'أكتوبر (10)' },
    { value: '11', name: 'نوفمبر (11)' },
    { value: '12', name: 'ديسمبر (12)' }
  ];

  // إدارة النموذج والإصدار
  correctiveActionInput = '';
  isResolving = signal(false);
  isSubmitting = signal(false);
  formErrors = signal<{ [key: string]: string }>({});
  touchedFields = signal<{ [key: string]: boolean }>({});
  newWarning = { companyId: null as number | null, type: 'Performance', level: 'Medium', evidence: '' };

  // قائمة أسباب ومخالفات البلاغ الجاهزة
  violationReasons: string[] = [
    'عدم الالتزام بالحضور',
    'التأخر المتكرر',
    'عدم الالتزام بمتطلبات التدريب',
    'ضعف الأداء التدريبي',
    'مخالفة السلوك والانضباط',
    'عدم تسليم المهام',
    'مخالفة أنظمة الجهة',
    'مخالفة أخرى'
  ];

  selectedReasons = signal<string[]>([]);
  otherReasonText = '';

  constructor(
    private api: AdminApi,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.load();
    this.loadCompanies();
  }

  goToRemediationRequests(): void {
    this.router.navigate(['/admin/remediation-requests']);
  }

  toggleReason(reason: string): void {
    const current = this.selectedReasons();
    if (current.includes(reason)) {
      this.selectedReasons.set(current.filter(r => r !== reason));
    } else {
      this.selectedReasons.set([...current, reason]);
    }
    this.updateEvidenceFromReasons();
  }

  clearAllReasons(): void {
    this.selectedReasons.set([]);
    this.otherReasonText = '';
    this.updateEvidenceFromReasons();
  }

  updateEvidenceFromReasons(): void {
    let reasons = [...this.selectedReasons()];
    if (reasons.includes('مخالفة أخرى') && this.otherReasonText.trim()) {
      reasons = reasons.map(r => r === 'مخالفة أخرى' ? 'مخالفة أخرى: ' + this.otherReasonText.trim() : r);
    }
    this.newWarning.evidence = reasons.join(' • ');
    this.touchedFields.set({ ...this.touchedFields(), evidence: true });
    this.validateForm();
  }

  toggleFilterMenu(): void {
    this.isFilterDropdownOpen = !this.isFilterDropdownOpen;
  }

  openFilterTab(tab: 'PRESETS' | 'YEAR' | 'MONTH' | 'STATUS' | 'LEVEL'): void {
    this.activeFilterTab = tab;
  }

  selectFilterOption(type: 'YEAR' | 'MONTH' | 'STATUS' | 'LEVEL', value: string): void {
    if (type === 'YEAR') {
      this.selectedYear = value;
      if (this.selectedMonth !== 'ALL' && !this.getAvailableMonthsForSelectedYear().some(m => m.value === this.selectedMonth)) {
        this.selectedMonth = 'ALL';
      }
    }
    if (type === 'MONTH') this.selectedMonth = value;
    if (type === 'STATUS') this.selectedStatus = value;
    if (type === 'LEVEL') this.selectedLevel = value;
  }

  applyPreset(preset: 'THIS_MONTH' | 'CURRENT_QUARTER' | 'THIS_YEAR'): void {
    const now = new Date();
    const currentYear = now.getFullYear().toString();
    const currentMonth = (now.getMonth() + 1).toString();

    this.resetAllFilters();

    if (preset === 'THIS_MONTH') {
      this.selectedYear = currentYear;
      this.selectedMonth = currentMonth;
    } else if (preset === 'THIS_YEAR') {
      this.selectedYear = currentYear;
    } else if (preset === 'CURRENT_QUARTER') {
      this.selectedYear = currentYear;
    }
  }

  resetAllFilters(): void {
    this.selectedYear = 'ALL';
    this.selectedMonth = 'ALL';
    this.selectedStatus = 'ALL';
    this.selectedLevel = 'ALL';
    this.searchTerm = '';
  }

  hasActiveFilters(): boolean {
    return this.selectedYear !== 'ALL' || 
           this.selectedMonth !== 'ALL' || 
           this.selectedStatus !== 'ALL' || 
           this.selectedLevel !== 'ALL' ||
           this.searchTerm.trim().length > 0;
  }

  getAvailableYears(): string[] {
    const years = new Set<string>();
    this.warnings().forEach(w => {
      if (w.issuedDate) {
        years.add(new Date(w.issuedDate).getFullYear().toString());
      }
    });
    return Array.from(years).sort().reverse();
  }

  getAvailableMonthsForSelectedYear() {
    if (this.selectedYear === 'ALL') {
      return this.monthsList;
    }

    const availableMonthValues = new Set<string>();
    this.warnings().forEach(w => {
      if (w.issuedDate) {
        const d = new Date(w.issuedDate);
        if (d.getFullYear().toString() === this.selectedYear) {
          availableMonthValues.add((d.getMonth() + 1).toString());
        }
      }
    });

    return this.monthsList.filter(m => availableMonthValues.has(m.value));
  }

  getMonthName(monthValue: string): string {
    const found = this.monthsList.find(m => m.value === monthValue);
    return found ? found.name : monthValue;
  }

  filteredWarnings(): WarningDto[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.warnings().filter(w => {
      const name = (w.targetName || (w as any).companyName || '').toLowerCase();
      const code = ('CW-' + w.warningId).toLowerCase();
      const matchesSearch = !term || name.includes(term) || code.includes(term);

      const st = String(w.status);
      let matchesStatus = true;
      if (this.selectedStatus === 'Open') matchesStatus = st === '0' || st === 'Open';
      else if (this.selectedStatus === 'UnderReview') matchesStatus = st === '1' || st === 'UnderReview';
      else if (this.selectedStatus === 'Resolved') matchesStatus = st === '2' || st === 'Resolved';
      else if (this.selectedStatus === 'Escalated') matchesStatus = st === '3' || st === 'Escalated'; // 👈 دعم حالة التصعيد

      const lvl = String(w.level);
      let matchesLevel = true;
      if (this.selectedLevel !== 'ALL') {
        matchesLevel = lvl === this.selectedLevel || this.getLevelLabel(lvl) === this.getLevelLabel(this.selectedLevel);
      }

      let matchesYear = true;
      let matchesMonth = true;
      if (w.issuedDate) {
        const d = new Date(w.issuedDate);
        if (this.selectedYear !== 'ALL') {
          matchesYear = d.getFullYear().toString() === this.selectedYear;
        }
        if (this.selectedMonth !== 'ALL') {
          matchesMonth = (d.getMonth() + 1).toString() === this.selectedMonth;
        }
      }

      return matchesSearch && matchesStatus && matchesLevel && matchesYear && matchesMonth;
    });
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

  loadCompanies(): void {
    if (this.api.getCompanies && typeof this.api.getCompanies === 'function') {
      this.api.getCompanies().subscribe((res: any) => {
        const list = Array.isArray(res) ? res : (res?.items || res?.data || []);
        this.companies.set(list);
      });
    }
  }

  openIssueModal(): void {
    this.newWarning = { companyId: null, type: 'Performance', level: 'Medium', evidence: '' };
    this.selectedReasons.set([]);
    this.otherReasonText = '';
    this.formErrors.set({});
    this.touchedFields.set({});
    this.showIssue.set(true);
  }

  closeIssueModal(): void {
    if (this.isSubmitting()) return;
    this.showIssue.set(false);
  }

  validateForm(): boolean {
    const errors: { [key: string]: string } = {};

    if (!this.newWarning.companyId || this.newWarning.companyId <= 0) {
      errors['companyId'] = 'يرجى اختيار الشركة المستضيفة من القائمة.';
    }
    if (!this.newWarning.type) {
      errors['type'] = 'يرجى اختيار تصنيف المخالفة.';
    }
    if (!this.newWarning.level) {
      errors['level'] = 'يرجى اختيار درجة الأهمية.';
    }

    if (this.selectedReasons().length === 0) {
      errors['evidence'] = 'يرجى تحديد سبب واحد على الأقل لإصدار البلاغ من الخيارات الجاهزة.';
    } else if (this.selectedReasons().includes('مخالفة أخرى') && this.selectedReasons().length === 1 && !this.otherReasonText.trim()) {
      errors['evidence'] = 'يرجى كتابة تفاصيل المخالفة الأخرى.';
    }

    this.formErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  markFieldTouched(field: string): void {
    this.touchedFields.set({ ...this.touchedFields(), [field]: true });
    this.validateForm();
  }

  issue(): void {
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

  exportToCSV(): void {
    const data = this.filteredWarnings();
    if (!data.length) {
      alert('لا توجد بيانات متاحة للتصدير');
      return;
    }

    let csvContent = '\uFEFF';
    csvContent += 'كود الإنذار,الشركة المستضيفة,نوع المخالفة,المستوى,الحالة,تاريخ الإصدار\n';

    data.forEach(w => {
      const code = `CW-${w.warningId}`;
      const company = (w.targetName || (w as any).companyName || 'شركة غير محددة').replace(/,/g, ' ');
      const type = this.getTypeLabel(w.type);
      const level = this.getLevelLabel(w.level);
      const status = this.getStatusLabel(w.status);
      const date = w.issuedDate ? new Date(w.issuedDate).toLocaleDateString('en-GB') : '-';

      csvContent += `${code},${company},${type},${level},${status},${date}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `تقارير_الإنذارات_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  resolveWarning(): void {
    const item = this.selectedWarning();
    if (!item) return;

    this.isResolving.set(true);
    const updateData = {
      status: 'Resolved',
      correctiveAction: this.correctiveActionInput || 'تم اتخاذ الإجراء التصحيحي وإغلاق الإنذار رسمياً.'
    };

    const apiAny = this.api as any;

    if (apiAny.updateWarning && typeof apiAny.updateWarning === 'function') {
      apiAny.updateWarning(item.warningId, updateData).subscribe({
        next: () => {
          this.isResolving.set(false);
          this.closeDetailsModal();
          this.load();
        },
        error: () => {
          this.isResolving.set(false);
          item.status = 'Resolved';
          item.correctiveAction = updateData.correctiveAction;
          this.closeDetailsModal();
        }
      });
    } else {
      item.status = 'Resolved';
      item.correctiveAction = updateData.correctiveAction;
      this.isResolving.set(false);
      this.closeDetailsModal();
    }
  }

  printWarningTemplate(): void {
    window.print();
  }

  // 👈 تحديث الدالة لتشمل الحالات الأربعة للباك إند
  getCountByStatus(statusKey: string): number {
    return this.warnings().filter(w => {
      const st = String(w.status);
      if (statusKey === 'Open') return st === '0' || st === 'Open';
      if (statusKey === 'UnderReview') return st === '1' || st === 'UnderReview';
      if (statusKey === 'Resolved') return st === '2' || st === 'Resolved';
      if (statusKey === 'Escalated') return st === '3' || st === 'Escalated'; // 👈 حالة التصعيد
      return false;
    }).length;
  }

  getItemProp(item: any, propName: string, fallback: string = '-'): string {
    return item && item[propName] ? item[propName] : fallback;
  }

  openDetailsModal(warning: WarningDto): void {
    this.selectedWarning.set(warning);
    this.correctiveActionInput = (warning as any).correctiveAction || '';
  }

  closeDetailsModal(): void {
    this.selectedWarning.set(null);
    this.correctiveActionInput = '';
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

  // 👈 تسمية الكروت بالعربي
  getStatusLabel(status?: any): string {
    const val = String(status);
    if (val === '0' || val === 'Open') return 'نشط';
    if (val === '1' || val === 'UnderReview') return 'قيد المراجعة';
    if (val === '2' || val === 'Resolved') return 'مكتمل';
    if (val === '3' || val === 'Escalated') return 'مُصعّد'; // 👈 الحالة الرابعة
    return status ?? 'نشط';
  }

  // 👈 كلاسات التنسيق المحدثة
  getStatusClass(status?: any): string {
    const val = String(status);
    if (val === '0' || val === 'Open') return 'st-open';
    if (val === '1' || val === 'UnderReview') return 'st-review';
    if (val === '2' || val === 'Resolved') return 'st-resolved';
    if (val === '3' || val === 'Escalated') return 'st-escalated'; // 👈 كلاس حالة التصعيد
    return 'st-open';
  }
}