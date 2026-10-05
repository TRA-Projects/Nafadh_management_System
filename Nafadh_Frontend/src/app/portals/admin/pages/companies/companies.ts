import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../services/admin-api';
import { CompanyDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-companies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './companies.html',
  styleUrls: ['./companies.css']
})
export class AdminCompanies implements OnInit {
  statusFilter = signal<string>('الكل');

  setFilter(status: string) {
    this.statusFilter.set(status);
  }

  companies = signal<CompanyDto[]>([]);
  isLoading = signal<boolean>(false);

  filtered = computed(() => {
    const filter = this.statusFilter();
    if (filter === 'الكل') {
      return this.companies();
    }
    return this.companies().filter(c => String(c.status) === String(filter));
  });

  showAddModal = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  addError = signal<string>('');

  // تتبع محاولة الإرسال (لإظهار كل الأخطاء دفعة وحدة عند الضغط على زر الإضافة)
  submitted = signal<boolean>(false);

  // تتبع الحقول التي "لمسها" المستخدم (فقدت التركيز/blur) لإظهار خطأها فوراً
  touchedFields = signal<Set<string>>(new Set());

  statusOptions: { value: string; label: string }[] = [
    { value: 'Approved', label: 'معتمدة' },
    { value: 'PendingApproval', label: 'قيد المراجعة' },
    { value: 'Suspended', label: 'موقوفة' },
    { value: 'Rejected', label: 'مرفوضة' }
  ];

  newCompany: any = this.emptyCompanyForm();

  private emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$/;
  // رقم عماني اختياري: +968 متبوع بـ 8 أرقام (أو بدون +968 مع 8 أرقام)
  private phoneRegex = /^(\+968)?\s?\d{8}$/;

  constructor(private adminApi: AdminApi) { }

  ngOnInit(): void {
    this.loadCompanies();
  }

  loadCompanies() {
    this.isLoading.set(true);
    this.adminApi.getCompanies().subscribe({
      next: (data) => {
        this.companies.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('خطأ في جلب البيانات:', err);
        this.isLoading.set(false);
      }
    });
  }

  private emptyCompanyForm() {
    return {
      companyName: '',
      workField: '',
      address: '',
      capacity: null,
      status: 'PendingApproval',
      email: '',
      phone: '',
      contactName: ''
    };
  }

  openAddModal() {
    this.newCompany = this.emptyCompanyForm();
    this.addError.set('');
    this.submitted.set(false);
    this.touchedFields.set(new Set());
    this.showAddModal.set(true);
  }

  closeAddModal() {
    this.showAddModal.set(false);
  }

  closeAllDropdowns() { }

  statusLabel(val: any): string {
    return this.statusOptions.find(o => o.value === String(val))?.label ?? val;
  }

  // يُستدعى عند خروج المستخدم من أي حقل (blur)
  markTouched(field: string) {
    this.touchedFields.update(set => {
      const newSet = new Set(set);
      newSet.add(field);
      return newSet;
    });
  }

  // يحدد هل نعرض خطأ هذا الحقل الآن (إما لُمس أو تمت محاولة إرسال النموذج)
  showError(field: string): boolean {
    return this.touchedFields().has(field) || this.submitted();
  }

  // ============ دوال التحقق الفردية لكل حقل ============

  companyNameError(): string {
    const name = this.newCompany.companyName?.trim() ?? '';
    if (!name) return 'اسم الشركة مطلوب';
    if (name.length < 3) return 'يجب أن يكون اسم الشركة 3 أحرف على الأقل';
    return '';
  }

  workFieldError(): string {
    const field = this.newCompany.workField?.trim() ?? '';
    if (!field) return 'المجال مطلوب';
    if (field.length < 3) return 'يجب أن يكون المجال 3 أحرف على الأقل';
    return '';
  }

  capacityError(): string {
    const val = this.newCompany.capacity;
    if (val === null || val === undefined || val === '') return 'الطاقة الاستيعابية مطلوبة';
    if (Number(val) <= 0) return 'يجب أن تكون أكبر من الصفر';
    if (!Number.isInteger(Number(val))) return 'يجب أن تكون قيمة صحيحة';
    return '';
  }

  contactNameError(): string {
    const name = this.newCompany.contactName?.trim() ?? '';
    if (!name) return 'اسم جهة الاتصال مطلوب';
    if (name.length < 6) return 'يجب أن يكون اسم جهة الاتصال 6 أحرف على الأقل (يفضل الاسم الثلاثي)';
    return '';
  }

  emailError(): string {
    const email = this.newCompany.email?.trim();
    if (!email) return 'البريد الإلكتروني مطلوب';
    if (!this.emailRegex.test(email)) return 'البريد الإلكتروني غير صحيح (مثال: admin@nafadh.om)';
    return '';
  }

  phoneError(): string {
    const phone = this.newCompany.phone?.trim();
    if (!phone) return ''; // اختياري
    if (!this.phoneRegex.test(phone)) return 'رقم الجوال غير صحيح (مثال: 968+ 9XXX XXXX)';
    return '';
  }

  // تجميع كل الأخطاء للتحقق من صحة النموذج ككل
  private getAllErrors(): string[] {
    return [
      this.companyNameError(),
      this.workFieldError(),
      this.capacityError(),
      this.contactNameError(),
      this.emailError(),
      this.phoneError()
    ].filter(err => err !== '');
  }

  isFormValid(): boolean {
    return this.getAllErrors().length === 0;
  }

  submitAddCompany() {
    this.submitted.set(true);
    this.addError.set('');

    if (!this.isFormValid()) {
      return;
    }

    this.isSaving.set(true);

    this.adminApi.createCompany(this.newCompany).subscribe({
      next: (res: any) => {
        this.companies.update(list => [res, ...list]);
        this.closeAddModal();
        this.isSaving.set(false);
      },
      error: (err) => {
        console.error(err);
        this.addError.set('حدث خطأ أثناء إضافة الشركة');
        this.isSaving.set(false);
      }
    });
  }

  updateCompanyStatus(company: any, newStatus: any) {
    this.adminApi.updateCompany(company.companyId, { ...company, status: newStatus }).subscribe({
      next: () => {
        this.companies.update(list =>
          list.map(c => c.companyId === company.companyId ? { ...c, status: newStatus } : c)
        );
      },
      error: (err) => {
        console.error('فشل تحديث حالة الشركة:', err);
      }
    });
  }
}