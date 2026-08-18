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
  // حالة الفلتر
  statusFilter = signal<string>('الكل');

  // بيانات تجريبية للشركات
  companies = signal<CompanyDto[]>([
    { companyId: 54, companyName: 'مؤسسة القمة للتكنولوجيا', workField: 'الاستشارات الإدارية', capacity: 200, status: 'Approved' },
    { companyId: 55, companyName: 'مؤسسة الاتقان للأنظمة', workField: 'الخدمات المالية', capacity: 30, status: 'Approved' },
    { companyId: 56, companyName: 'مؤسسة الثقة الرقمية', workField: 'الطاقة واللوجستيات', capacity: 80, status: 'Approved' },
    { companyId: 57, companyName: 'مجموعة المدى التقني', workField: 'الاتصالات', capacity: 80, status: 'Approved' },
    { companyId: 58, companyName: 'شركة الفا للحلول الذكية', workField: 'البناء والتشييد', capacity: 100, status: 'Approved' },
    { companyId: 59, companyName: 'مؤسسة بيتا سوفت', workField: 'الخدمات المالية', capacity: 150, status: 'Approved' },
    { companyId: 60, companyName: 'مؤسسة النخبة تكنولوجيا', workField: 'الخدمات المالية', capacity: 50, status: 'Approved' }
  ]);

  // الشركات المفلترة بناءً على الزر المحدد
  filtered = computed(() => {
    const filter = this.statusFilter();
    if (filter === 'الكل') {
      return this.companies();
    }
    return this.companies().filter(c => c.status === filter);
  });

  // ===== Add Company Modal state =====
  showAddModal = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  addError = signal<string>('');

  // المجال options — dropdown instead of free text
  workFieldOptions: string[] = [
    'تقنية المعلومات',
    'اتصالات',
    'خدمات رقمية',
    'برمجيات',
    'بنية تحتية',
    'ذكاء اصطناعي'
  ];
  workFieldDropdownOpen = signal<boolean>(false);

  // الحالة options — dropdown, defaults to قيد المراجعة for new companies
  statusOptions: { value: string; label: string }[] = [
    { value: 'Approved', label: 'معتمدة' },
    { value: 'PendingApproval', label: 'قيد المراجعة' },
    { value: 'Suspended', label: 'موقوفة' }
  ];
  statusDropdownOpen = signal<boolean>(false);

  // NOTE (2026-08-18): "المستخدم المرتبط" dropdown was removed per request.
  // NFD_Companies.userId is required + UNIQUE on the backend, so submitting
  // without it WILL fail again with "User with ID 0 not found" until this
  // is revisited (either backend makes userId optional, or the dropdown
  // is added back — see chat history for the getUsers()/allUsers() logic
  // that was removed here).

  // form model, only fields that actually exist on CompanyDto/backend
  newCompany: {
    companyName: string;
    workField: string;
    capacity: number | null;
    status: string;
    email: string;
    phone: string;
    contactName: string;
  } = this.emptyCompanyForm();

  constructor(private adminApi: AdminApi) {}

  ngOnInit(): void {
    this.adminApi.getCompanies().subscribe({
      next: (data) => {
        this.companies.set(data);
      },
      error: (err) => {
        console.error('خطأ في جلب البيانات من قاعدة البيانات:', err);
      }
    });
  }

  // اعتماد شركة
  approve(company: CompanyDto) {
    this.companies.update(list =>
      list.map(c => c.companyId === company.companyId ? { ...c, status: 'Approved' } : c)
    );
  }

  // إيقاف شركة
  suspend(company: CompanyDto) {
    this.companies.update(list =>
      list.map(c => c.companyId === company.companyId ? { ...c, status: 'Suspended' } : c)
    );
  }

  viewCompany(company: CompanyDto) {
    console.log('عرض تفاصيل:', company);
  }

  editCompany(company: CompanyDto) {
    console.log('تعديل:', company);
  }

  // ===== Add Company Modal logic =====

  private emptyCompanyForm() {
    return {
      companyName: '',
      workField: '',
      capacity: null,
      status: 'PendingApproval', // new companies always start pending
      email: '',
      phone: '',
      contactName: ''
    };
  }

  openAddModal() {
    this.newCompany = this.emptyCompanyForm();
    this.addError.set('');
    this.workFieldDropdownOpen.set(false);
    this.statusDropdownOpen.set(false);
    this.showAddModal.set(true);
  }

  closeAddModal() {
    this.showAddModal.set(false);
  }

  // ===== المجال dropdown handlers =====

  toggleWorkFieldDropdown(event: MouseEvent) {
    // stop bubbling so the form-level click handler doesn't close it immediately
    event.stopPropagation();
    this.statusDropdownOpen.set(false);
    this.workFieldDropdownOpen.update(open => !open);
  }

  selectWorkField(option: string, event: MouseEvent) {
    event.stopPropagation();
    this.newCompany.workField = option;
    this.workFieldDropdownOpen.set(false);
  }

  // ===== الحالة dropdown handlers =====

  toggleStatusDropdown(event: MouseEvent) {
    event.stopPropagation();
    this.workFieldDropdownOpen.set(false);
    this.statusDropdownOpen.update(open => !open);
  }

  selectStatus(value: string, event: MouseEvent) {
    event.stopPropagation();
    this.newCompany.status = value;
    this.statusDropdownOpen.set(false);
  }

  statusLabel(value: string): string {
    return this.statusOptions.find(o => o.value === value)?.label ?? value;
  }

  closeAllDropdowns() {
    if (this.workFieldDropdownOpen()) this.workFieldDropdownOpen.set(false);
    if (this.statusDropdownOpen()) this.statusDropdownOpen.set(false);
  }

  submitAddCompany() {
    if (!this.newCompany.companyName || !this.newCompany.workField || this.newCompany.capacity == null) {
      this.addError.set('الرجاء تعبئة الحقول المطلوبة');
      return;
    }

    this.isSaving.set(true);
    this.addError.set('');

    // only send fields that exist in CompanyDto/backend, plus contactName
    // as an optional extra — backend will ignore it if the DTO doesn't have it.
    // NOTE: userId is NOT sent — backend currently requires it (see comment
    // above on allUsers removal), so this call will fail until that's resolved.
    const dto = {
      companyName: this.newCompany.companyName,
      workField: this.newCompany.workField,
      capacity: this.newCompany.capacity,
      status: this.newCompany.status,
      email: this.newCompany.email || undefined,
      phone: this.newCompany.phone || undefined,
      contactName: this.newCompany.contactName || undefined
    };

    this.adminApi.createCompany(dto).subscribe({
      next: (created: any) => {
        // fall back to a locally-built row if backend doesn't echo full object
        const newRow: CompanyDto = created && created.companyId
          ? created
          : {
              companyId: Date.now(), // temp id until list is refreshed from backend
              companyName: dto.companyName,
              workField: dto.workField,
              capacity: dto.capacity as number,
              status: dto.status,
              email: dto.email,
              phone: dto.phone
            };

        this.companies.update(list => [newRow, ...list]);
        this.isSaving.set(false);
        this.showAddModal.set(false);
      },
      error: (err) => {
        console.error('خطأ في إضافة الشركة:', err);
        this.addError.set('حدث خطأ أثناء إضافة الشركة، حاولي مرة أخرى');
        this.isSaving.set(false);
      }
    });
  }
}