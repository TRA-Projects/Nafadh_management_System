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
    this.adminApi.getCompanies().subscribe({
      next: (data) => this.companies.set(data),
      error: (err) => console.error('خطأ في جلب البيانات:', err)
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
    this.showAddModal.set(true);
  }

  closeAddModal() { 
    this.showAddModal.set(false); 
  }

  // تم إضافة هذه الدالة لإزالة خطأ الـ TypeScript وتطابقاً مع الـ HTML
  closeAllDropdowns() {
    // مكان لإغلاق القوائم المنسدلة إن وجدت مستقبلاً
  }

  statusLabel(val: any): string {
    return this.statusOptions.find(o => o.value === String(val))?.label ?? val;
  }

  submitAddCompany() {
    this.isSaving.set(true);
    this.addError.set('');

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