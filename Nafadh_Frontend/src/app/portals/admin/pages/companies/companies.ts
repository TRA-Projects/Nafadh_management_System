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
  
  // متغير لتتبع محاولة حفظ النموذج وإظهار أخطاء التحقق تحت الحقول
  submitted = signal<boolean>(false);

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
    this.submitted.set(false); // إعادة تعيين حالة الإرسال عند فتح النافذة
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
    this.submitted.set(true); // تفعيل حالة محاولة الإرسال لتظهر الأخطاء تحت الحقول
    this.addError.set('');

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    // التحقق من صحة الحقول الإجبارية
    const isFormInvalid = !this.newCompany.companyName || 
                          !this.newCompany.workField || 
                          !this.newCompany.capacity || 
                          this.newCompany.capacity <= 0 || 
                          !this.newCompany.email || 
                          !emailRegex.test(this.newCompany.email) || 
                          !this.newCompany.contactName;

    if (isFormInvalid) {
      return; // إيقاف الإرسال إذا كان هناك خطأ، وستظهر الرسائل تحت الحقول تلقائياً
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