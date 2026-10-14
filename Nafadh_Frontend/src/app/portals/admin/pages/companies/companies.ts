import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../services/admin-api';

export interface HostCompany {
  companyId: string | number;
  companyName: string;
  workField: string;
  address: string;
  capacity: number;
  programsCount?: number;
  activeTraineesCount?: number;
  crNumber?: string;
  contactName: string;
  email: string;
  phone: string;
  status: 'Approved' | 'PendingApproval' | 'Suspended' | 'Rejected';
  rejectionReason?: string;
  createdAt?: string;
}

function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '')
    .trim();
}

@Component({
  selector: 'app-admin-companies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './companies.html',
  styleUrls: ['./companies.css']
})
export class AdminCompanies implements OnInit {
  private api = inject(AdminApi);

  Math = Math;

  // نمط العرض: 'list' (الجدول الرئيسي) أو 'details' (صفحة التفاصيل ملء الشاشة)
  currentView: 'list' | 'details' = 'list';

  // تبويبات صفحة التفاصيل
  detailsTab: 'overview' | 'programs' | 'facilities' | 'supervisors' = 'overview';

  isLoading = signal<boolean>(true);
  isSaving = signal<boolean>(false);
  companies = signal<HostCompany[]>([]);
  filterVersion = signal<number>(0);

  activeTab = signal<'all' | 'pending'>('all');
  statusFilter = signal<string>('الكل');

  searchTerm: string = '';
  cityFilter: string = 'ALL';
  workFieldFilter: string = 'ALL';
  capacitySortFilter: string = 'DEFAULT';

  currentPage = signal<number>(1);
  pageSize: number = 8;

  showAddModal = signal<boolean>(false);
  showRejectModal = signal<boolean>(false);
  showDetailsModal = signal<boolean>(false);

  selectedCompanyToReject: HostCompany | null = null;
  selectedCompanyDetails: HostCompany | null = null;
  rejectionReasonText: string = '';
  addError = signal<string>('');

  newCompany: Partial<HostCompany> = {
    companyName: '',
    workField: '',
    address: 'مسقط',
    capacity: 10,
    status: 'PendingApproval',
    contactName: '',
    email: '',
    phone: '',
  };

  touchedFields: { [key: string]: boolean } = {};

  ngOnInit(): void {
    this.loadCompaniesFromDatabase();
  }

  loadCompaniesFromDatabase(): void {
    this.isLoading.set(true);
    this.api.getCompanies().subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : (res?.data || []);
        this.companies.set(data);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error('Error loading companies:', err);
        this.isLoading.set(false);
      }
    });
  }

  pendingRequestsCount = computed(() => {
    return this.companies().filter(c => 
      c.status === 'PendingApproval' || (c.status as string) === 'pending'
    ).length;
  });

  approvedCompaniesCount = computed(() => {
    return this.companies().filter(c => 
      c.status === 'Approved' || (c.status as string) === 'approved'
    ).length;
  });

  totalCapacityCount = computed(() => {
    return this.companies().reduce((sum, c) => sum + (Number(c.capacity) || 0), 0);
  });

  uniqueCities = computed(() => {
    const set = new Set<string>();
    this.companies().forEach(c => {
      if (c.address && c.address.trim()) {
        const city = c.address.split('/')[0].split('،')[0].trim();
        if (city) set.add(city);
      }
    });
    return Array.from(set);
  });

  uniqueWorkFields = computed(() => {
    const set = new Set<string>();
    this.companies().forEach(c => {
      if (c.workField && c.workField.trim()) {
        set.add(c.workField.trim());
      }
    });
    return Array.from(set);
  });

  filteredCompanies = computed(() => {
    this.filterVersion();
    const all = this.companies();
    const currentTab = this.activeTab();
    const currentStatus = this.statusFilter();
    const query = normalizeArabic(this.searchTerm);

    let list = [...all];

    if (currentTab === 'pending') {
      list = list.filter(c => 
        c.status === 'PendingApproval' || (c.status as string) === 'pending'
      );
    } else if (currentStatus !== 'الكل') {
      list = list.filter(c => {
        const s = (c.status || '').toLowerCase();
        const f = currentStatus.toLowerCase();
        return s === f || (f === 'approved' && s.includes('appr')) || (f === 'rejected' && s.includes('rej')) || (f === 'suspended' && s.includes('susp'));
      });
    }

    if (query.length > 0) {
      list = list.filter(c => {
        const name = normalizeArabic(c.companyName || '');
        const field = normalizeArabic(c.workField || '');
        const contact = normalizeArabic(c.contactName || '');
        const city = normalizeArabic(c.address || '');
        const phone = (c.phone || '').trim();
        const email = (c.email || '').toLowerCase().trim();

        return name.includes(query) ||
               field.includes(query) ||
               contact.includes(query) ||
               city.includes(query) ||
               phone.includes(query) ||
               email.includes(query);
      });
    }

    if (this.cityFilter !== 'ALL') {
      const selectedCity = normalizeArabic(this.cityFilter);
      list = list.filter(c => normalizeArabic(c.address || '').includes(selectedCity));
    }

    if (this.workFieldFilter !== 'ALL') {
      const selectedField = normalizeArabic(this.workFieldFilter);
      list = list.filter(c => normalizeArabic(c.workField || '').includes(selectedField));
    }

    if (this.capacitySortFilter === 'TOP_CAPACITY') {
      list.sort((a, b) => (Number(b.capacity) || 0) - (Number(a.capacity) || 0));
    } else if (this.capacitySortFilter === 'LOW_CAPACITY') {
      list.sort((a, b) => (Number(a.capacity) || 0) - (Number(b.capacity) || 0));
    } else if (this.capacitySortFilter === 'TOP_PROGRAMS') {
      list.sort((a, b) => (Number(b.programsCount) || 0) - (Number(a.programsCount) || 0));
    }

    return list;
  });

  pagedCompanies = computed(() => {
    const list = this.filteredCompanies();
    const start = (this.currentPage() - 1) * this.pageSize;
    return list.slice(start, start + this.pageSize);
  });

  totalPages = computed(() => {
    const total = this.filteredCompanies().length;
    return Math.max(1, Math.ceil(total / this.pageSize));
  });

  setActiveTab(tab: 'all' | 'pending'): void {
    this.activeTab.set(tab);
    if (tab === 'pending') {
      this.statusFilter.set('PendingApproval');
    } else {
      this.statusFilter.set('الكل');
    }
    this.currentPage.set(1);
    this.filterVersion.update(v => v + 1);
  }

  setFilter(status: string): void {
    this.statusFilter.set(status);
    this.currentPage.set(1);
    this.filterVersion.update(v => v + 1);
  }

  onFilterChange(): void {
    this.currentPage.set(1);
    this.filterVersion.update(v => v + 1);
  }

  isAnyFilterActive(): boolean {
    return Boolean(
      (this.searchTerm && this.searchTerm.trim().length > 0) ||
      this.cityFilter !== 'ALL' ||
      this.workFieldFilter !== 'ALL' ||
      this.capacitySortFilter !== 'DEFAULT'
    );
  }

  resetAllFilters(): void {
    this.searchTerm = '';
    this.cityFilter = 'ALL';
    this.workFieldFilter = 'ALL';
    this.capacitySortFilter = 'DEFAULT';
    this.currentPage.set(1);
    this.filterVersion.update(v => v + 1);
  }

  prevPage(): void {
    if (this.currentPage() > 1) this.currentPage.update(p => p - 1);
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) this.currentPage.update(p => p + 1);
  }

  goToPage(page: number): void {
    this.currentPage.set(page);
  }

  getPageNumbers(): number[] {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    const maxVisible = 5;

    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  statusLabel(status?: string): string {
    switch (status) {
      case 'Approved': return 'معتمدة ومفعلة';
      case 'PendingApproval': return 'قيد المراجعة والاعتماد';
      case 'Suspended': return 'موقوفة مؤقتاً';
      case 'Rejected': return 'مرفوضة';
      default: return status || 'غير محدد';
    }
  }

  closeAllDropdowns(): void {}

  // ==========================================
  // فتح وإغلاق صفحة التفاصيل ملء الشاشة
  // ==========================================
  openCompanyDetails(company: HostCompany): void {
    this.selectedCompanyDetails = company;
    this.detailsTab = 'overview';
    this.currentView = 'details'; // تحويل الواجهة لملء الشاشة فوراً
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  closeCompanyDetails(): void {
    this.currentView = 'list'; // العودة للجدول
    this.selectedCompanyDetails = null;
  }

  updateCompanyStatus(company: HostCompany | null | undefined, newStatus: 'Approved' | 'Suspended' | 'Rejected', reason: string = ''): void {
    if (!company) return;

    this.isSaving.set(true);
    const payload = {
      status: newStatus,
      rejectionReason: newStatus === 'Rejected' ? reason : null
    };

    const apiCall = (this.api as any).updateCompany 
      ? (this.api as any).updateCompany(company.companyId, payload)
      : (this.api as any).updateCompanyStatus(company.companyId, payload);

    apiCall.subscribe({
      next: () => {
        this.companies.update(list =>
          list.map(c => c.companyId === company.companyId
            ? { ...c, status: newStatus, rejectionReason: payload.rejectionReason || undefined }
            : c
          )
        );
        if (this.selectedCompanyDetails?.companyId === company.companyId) {
          this.selectedCompanyDetails = {
            ...this.selectedCompanyDetails,
            status: newStatus,
            rejectionReason: payload.rejectionReason || undefined
          };
        }
        this.filterVersion.update(v => v + 1);
        this.isSaving.set(false);
      },
      error: (err: any) => {
        console.warn('Saved locally:', err);
        this.companies.update(list =>
          list.map(c => c.companyId === company.companyId
            ? { ...c, status: newStatus, rejectionReason: payload.rejectionReason || undefined }
            : c
          )
        );
        if (this.selectedCompanyDetails?.companyId === company.companyId) {
          this.selectedCompanyDetails = {
            ...this.selectedCompanyDetails,
            status: newStatus,
            rejectionReason: payload.rejectionReason || undefined
          };
        }
        this.filterVersion.update(v => v + 1);
        this.isSaving.set(false);
      }
    });
  }

  openRejectModal(company: HostCompany): void {
    this.selectedCompanyToReject = company;
    this.rejectionReasonText = company.rejectionReason || '';
    this.showRejectModal.set(true);
  }

  closeRejectModal(): void {
    this.showRejectModal.set(false);
    this.selectedCompanyToReject = null;
    this.rejectionReasonText = '';
  }

  setQuickReason(reason: string): void {
    this.rejectionReasonText = reason;
  }

  confirmRejectCompany(): void {
    if (!this.selectedCompanyToReject || !this.rejectionReasonText.trim()) return;

    if (this.rejectionReasonText.trim().length < 8) {
      alert('يرجى كتابة سبب رفض مفصل لا يقل عن 8 أحرف لتوضيحه للشركة.');
      return;
    }

    this.updateCompanyStatus(this.selectedCompanyToReject, 'Rejected', this.rejectionReasonText.trim());
    this.closeRejectModal();
  }

  openAddModal(): void {
    this.newCompany = {
      companyName: '',
      workField: '',
      address: 'مسقط',
      capacity: 10,
      status: 'Approved',
      contactName: '',
      email: '',
      phone: ''
    };
    this.touchedFields = {};
    this.addError.set('');
    this.showAddModal.set(true);
  }

  closeAddModal(): void {
    this.showAddModal.set(false);
    this.addError.set('');
  }

  markTouched(field: string): void {
    this.touchedFields[field] = true;
  }

  showError(field: string): boolean {
    return !!this.touchedFields[field];
  }

  companyNameError(): string | null {
    const val = (this.newCompany.companyName || '').trim();
    if (!val) return 'اسم الشركة مطلوب.';
    if (val.length < 3) return 'يجب ألا يقل اسم الشركة عن 3 أحرف.';
    if (!/^[\u0600-\u06FFa-zA-Z0-9\s.\-_]+$/.test(val)) return 'اسم الشركة يحتوي على رموز غير مسموح بها.';
    return null;
  }

  workFieldError(): string | null {
    const val = (this.newCompany.workField || '').trim();
    if (!val) return 'مجال عمل الشركة مطلوب.';
    if (val.length < 2) return 'يرجى إدخال مجال تخصص صحيح.';
    return null;
  }

  capacityError(): string | null {
    const val = Number(this.newCompany.capacity);
    if (!val || isNaN(val) || val <= 0) return 'يرجى إدخال طاقة استيعابية صحيحة أكبر من صفر.';
    if (val > 1000) return 'الحد الأقصى للطاقة الاستيعابية للدفعة هو 1000 متدرب.';
    return null;
  }

  contactNameError(): string | null {
    const val = (this.newCompany.contactName || '').trim();
    if (!val) return 'اسم جهة الاتصال مطلوب.';
    if (val.length < 3) return 'يرجى كتابة الاسم الثلاثي لمسؤول الشركة.';
    return null;
  }

  emailError(): string | null {
    const val = (this.newCompany.email || '').trim();
    if (!val) return 'البريد الإلكتروني الرسمي مطلوب.';
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(val)) return 'صيغة البريد الإلكتروني غير صحيحة (مثال: name@company.om).';
    return null;
  }

  submitAddCompany(): void {
    ['companyName', 'workField', 'capacity', 'contactName', 'email'].forEach(f => this.markTouched(f));

    if (
      this.companyNameError() ||
      this.workFieldError() ||
      this.capacityError() ||
      this.contactNameError() ||
      this.emailError()
    ) {
      this.addError.set('يرجى تصحيح البيانات غير المكتملة والمحددة باللون الأحمر.');
      return;
    }

    this.isSaving.set(true);
    const newEntry: HostCompany = {
      companyId: 'COMP-' + Math.floor(1000 + Math.random() * 9000),
      companyName: this.newCompany.companyName!.trim(),
      workField: this.newCompany.workField!.trim(),
      address: this.newCompany.address || 'مسقط',
      capacity: Number(this.newCompany.capacity) || 1,
      programsCount: 0,
      contactName: this.newCompany.contactName!.trim(),
      email: this.newCompany.email!.trim(),
      phone: (this.newCompany.phone || '').trim(),
      status: (this.newCompany.status as any) || 'Approved',
      createdAt: new Date().toISOString()
    };

    this.api.createCompany(newEntry).subscribe({
      next: (created: any) => {
        const item: HostCompany = (created && created.companyId) ? (created as HostCompany) : newEntry;
        this.companies.update(list => [item, ...list]);
        this.filterVersion.update(v => v + 1);
        this.isSaving.set(false);
        this.closeAddModal();
      },
      error: (err: any) => {
        this.companies.update(list => [newEntry, ...list]);
        this.filterVersion.update(v => v + 1);
        this.isSaving.set(false);
        this.closeAddModal();
      }
    });
  }
}