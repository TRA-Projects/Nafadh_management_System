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

  workFieldOptions: string[] = ['تقنية المعلومات', 'اتصالات', 'خدمات رقمية', 'برمجيات', 'بنية تحتية', 'ذكاء اصطناعي'];
  workFieldDropdownOpen = signal<boolean>(false);

  statusOptions: { value: string; label: string }[] = [
    { value: 'Approved', label: 'معتمدة' },
    { value: 'PendingApproval', label: 'قيد المراجعة' },
    { value: 'Suspended', label: 'موقوفة' },
    { value: 'Rejected', label: 'مرفوضة' }
  ];
  statusDropdownOpen = signal<boolean>(false);

  newCompany: any = this.emptyCompanyForm();

  constructor(private adminApi: AdminApi) {}

  ngOnInit(): void {
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

  toggleWorkFieldDropdown(event: MouseEvent) { 
    event.stopPropagation(); 
    this.workFieldDropdownOpen.update(v => !v); 
  }
  
  selectWorkField(opt: string, event: MouseEvent) { 
    event.stopPropagation(); 
    this.newCompany.workField = opt; 
    this.workFieldDropdownOpen.set(false); 
  }

  statusLabel(val: any): string {
    return this.statusOptions.find(o => o.value === String(val))?.label ?? val;
  }

  closeAllDropdowns() { 
    this.workFieldDropdownOpen.set(false); 
    this.statusDropdownOpen.set(false); 
  }

  submitAddCompany() {
    this.adminApi.createCompany(this.newCompany).subscribe({
      next: (res: any) => { 
        this.companies.update(list => [res, ...list]); 
        this.closeAddModal(); 
      },
      error: () => this.addError.set('حدث خطأ أثناء الإضافة')
    });
  }

  updateCompanyStatus(company: any, newStatus: any) {
    const updatedData = { ...company, status: newStatus };
    
    this.adminApi.updateCompany(company.companyId, updatedData).subscribe({
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