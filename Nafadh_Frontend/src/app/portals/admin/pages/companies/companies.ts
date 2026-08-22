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
  
  // إضافة متغير للتحميل
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

  statusOptions: { value: string; label: string }[] = [
    { value: 'Approved', label: 'معتمدة' },
    { value: 'PendingApproval', label: 'قيد المراجعة' },
    { value: 'Suspended', label: 'موقوفة' },
    { value: 'Rejected', label: 'مرفوضة' }
  ];

  newCompany: any = this.emptyCompanyForm();

  constructor(private adminApi: AdminApi) {}

  ngOnInit(): void {
    this.loadCompanies();
  }

  loadCompanies() {
    this.isLoading.set(true); // تشغيل التحميل
    this.adminApi.getCompanies().subscribe({
      next: (data) => {
        this.companies.set(data);
        this.isLoading.set(false); // إيقاف التحميل عند النجاح
      },
      error: (err) => {
        console.error('خطأ في جلب البيانات:', err);
        this.isLoading.set(false); // إيقاف التحميل حتى لو حدث خطأ
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
    this.showAddModal.set(true);
  }

  closeAddModal() { 
    this.showAddModal.set(false); 
  }

  closeAllDropdowns() {}

  statusLabel(val: any): string {
    return this.statusOptions.find(o => o.value === String(val))?.label ?? val;
  }

  submitAddCompany() {
    this.addError.set('');

    if (!this.newCompany.companyName || !this.newCompany.workField || !this.newCompany.capacity || !this.newCompany.email || !this.newCompany.contactName) {
      this.addError.set('يرجى تعبئة جميع الحقول الإجبارية المعلمة بـ (*)');
      return;
    }

    if (this.newCompany.capacity <= 0) {
      this.addError.set('لا يمكن أن تكون الطاقة الاستيعابية رقماً سالباً أو صفراً');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(this.newCompany.email)) {
      this.addError.set('يرجى إدخال بريد إلكتروني صحيح (مثال: name@company.com)');
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