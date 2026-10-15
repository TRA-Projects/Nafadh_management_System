import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../services/admin-api';

export interface HostCompany {
  companyId: string | number;
  companyName: string;
  commercialRegister?: string;
  crNumber?: string;
  workField: string;
  address: string;
  capacity: number;
  programsCount?: number;
  activeTraineesCount?: number;
  contactName: string;
  email: string;
  phone: string;
  status: any; // 1=Approved, 0=Pending, 2=Rejected, 3=Suspended
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

  currentView: 'list' | 'details' = 'list';
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

  selectedCompanyToReject: HostCompany | null = null;
  selectedCompanyDetails: HostCompany | null = null;
  rejectionReasonText: string = '';
  addError = signal<string>('');

  newCompany: any = {
    companyName: '',
    commercialRegister: '',
    workField: '',
    address: 'مسقط',
    capacity: 10,
    contactName: '',
    email: '',
    phone: '',
    status: 1
  };

  touchedFields: { [key: string]: boolean } = {};

  ngOnInit(): void {
    this.loadCompaniesFromDatabase();
  }

  // دوال فحص الحالة لتعمل مع الأرقام والنصوص بدقة 100%
  isApproved(status: any): boolean {
    return status === 1 || status === '1' || status === 'Approved' || status === 'approved';
  }

  isPending(status: any): boolean {
    return status === 0 || status === '0' || status === 'PendingApproval' || status === 'pending';
  }

  isRejected(status: any): boolean {
    return status === 2 || status === '2' || status === 'Rejected' || status === 'rejected';
  }

  isSuspended(status: any): boolean {
    return status === 3 || status === '3' || status === 'Suspended' || status === 'suspended';
  }

  getStatusColor(status: any): string {
    if (this.isApproved(status)) return '#15803d';
    if (this.isPending(status)) return '#b45309';
    if (this.isRejected(status)) return '#be123c';
    if (this.isSuspended(status)) return '#475569';
    return '#334155';
  }

  getStatusBg(status: any): string {
    if (this.isApproved(status)) return '#dcfce7';
    if (this.isPending(status)) return '#fef3c7';
    if (this.isRejected(status)) return '#ffe4e6';
    if (this.isSuspended(status)) return '#f1f5f9';
    return '#f8fafc';
  }

  statusLabel(status?: any): string {
    if (this.isApproved(status)) return 'معتمدة ومفعلة';
    if (this.isPending(status)) return 'قيد المراجعة والاعتماد';
    if (this.isRejected(status)) return 'مرفوضة';
    if (this.isSuspended(status)) return 'موقوفة مؤقتاً';
    return 'غير محدد';
  }

  loadCompaniesFromDatabase(): void {
    this.isLoading.set(true);
    this.api.getCompanies().subscribe({
      next: (res: any) => {
        let rawList: any[] = [];
        if (Array.isArray(res)) rawList = res;
        else if (res && Array.isArray(res.data)) rawList = res.data;
        else if (res && Array.isArray(res.result)) rawList = res.result;

        const mapped: HostCompany[] = rawList.map((item: any) => ({
          companyId: item.companyId ?? item.CompanyId ?? item.id ?? Date.now(),
          companyName: item.companyName ?? item.CompanyName ?? 'شركة بدون اسم',
          commercialRegister: item.commercialRegister ?? item.CommercialRegister ?? item.crNumber ?? item.CrNumber ?? '—',
          crNumber: item.commercialRegister ?? item.CommercialRegister ?? item.crNumber ?? item.CrNumber ?? '—',
          workField: item.workField ?? item.WorkField ?? 'تقنية المعلومات',
          address: item.address ?? item.Address ?? item.city ?? 'مسقط',
          capacity: Number(item.capacity ?? item.Capacity ?? 10),
          contactName: item.contactName ?? item.ContactName ?? '',
          email: item.email ?? item.Email ?? '',
          phone: item.phone ?? item.Phone ?? '',
          status: item.status ?? item.Status ?? 0,
          rejectionReason: item.rejectionReason ?? item.RejectionReason ?? '',
          programsCount: Number(item.programsCount ?? item.ProgramsCount ?? 2),
          activeTraineesCount: Number(item.activeTraineesCount ?? item.ActiveTraineesCount ?? 0),
          createdAt: item.createdAt ?? item.CreatedAt ?? ''
        }));

        this.companies.set(mapped);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error('Error loading companies:', err);
        this.isLoading.set(false);
      }
    });
  }

  pendingRequestsCount = computed(() => {
    return this.companies().filter(c => this.isPending(c.status)).length;
  });

  approvedCompaniesCount = computed(() => {
    return this.companies().filter(c => this.isApproved(c.status)).length;
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
      list = list.filter(c => this.isPending(c.status));
    } else if (currentStatus !== 'الكل') {
      if (currentStatus === 'Approved') list = list.filter(c => this.isApproved(c.status));
      else if (currentStatus === 'PendingApproval') list = list.filter(c => this.isPending(c.status));
      else if (currentStatus === 'Rejected') list = list.filter(c => this.isRejected(c.status));
      else if (currentStatus === 'Suspended') list = list.filter(c => this.isSuspended(c.status));
    }

    if (query.length > 0) {
      list = list.filter(c => {
        const name = normalizeArabic(c.companyName || '');
        const field = normalizeArabic(c.workField || '');
        const contact = normalizeArabic(c.contactName || '');
        const city = normalizeArabic(c.address || '');
        const cr = (c.commercialRegister || '').toLowerCase();
        return name.includes(query) || field.includes(query) || contact.includes(query) || city.includes(query) || cr.includes(query);
      });
    }

    if (this.cityFilter !== 'ALL') {
      list = list.filter(c => normalizeArabic(c.address || '').includes(normalizeArabic(this.cityFilter)));
    }

    if (this.workFieldFilter !== 'ALL') {
      list = list.filter(c => normalizeArabic(c.workField || '').includes(normalizeArabic(this.workFieldFilter)));
    }

    if (this.capacitySortFilter === 'TOP_CAPACITY') {
      list.sort((a, b) => (Number(b.capacity) || 0) - (Number(a.capacity) || 0));
    } else if (this.capacitySortFilter === 'LOW_CAPACITY') {
      list.sort((a, b) => (Number(a.capacity) || 0) - (Number(b.capacity) || 0));
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
    this.statusFilter.set(tab === 'pending' ? 'PendingApproval' : 'الكل');
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
    return Boolean(this.searchTerm.trim().length > 0 || this.cityFilter !== 'ALL' || this.workFieldFilter !== 'ALL' || this.capacitySortFilter !== 'DEFAULT');
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
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + 4);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  openCompanyDetails(company: HostCompany): void {
    this.selectedCompanyDetails = { ...company };
    this.detailsTab = 'overview';
    this.currentView = 'details';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  closeCompanyDetails(): void {
    this.currentView = 'list';
    this.selectedCompanyDetails = null;
  }

  // ============================================================
  // تفعيل أزرار الاعتماد والإيقاف والرفض لتحديث الـ API والداتابيز
  // ============================================================
  updateCompanyStatus(company: HostCompany | null | undefined, newStatusText: 'Approved' | 'Suspended' | 'Rejected', reason: string = ''): void {
    if (!company) return;

    // تحويل الحالة إلى رقم ليتوافق مع قاعدة بيانات SQL Server
    const statusCode = newStatusText === 'Approved' ? 1 : newStatusText === 'Suspended' ? 3 : 2;

    const payload = {
      status: statusCode,
      statusText: newStatusText,
      rejectionReason: newStatusText === 'Rejected' ? reason : null
    };

    console.log('[Nafath] تحديث حالة الشركة:', company.companyId, payload);

    // تحديث فوري مباشر في الشاشة ليشعر المستخدم بالاستجابة السريعة
    this.companies.update(list =>
      list.map(c => c.companyId === company.companyId ? { ...c, status: statusCode, rejectionReason: payload.rejectionReason || undefined } : c)
    );

    if (this.selectedCompanyDetails && this.selectedCompanyDetails.companyId === company.companyId) {
      this.selectedCompanyDetails = {
        ...this.selectedCompanyDetails,
        status: statusCode,
        rejectionReason: payload.rejectionReason || undefined
      };
    }
    this.filterVersion.update(v => v + 1);

    // إرسال التحديث إلى الباك إند
    const apiCall = (this.api as any).updateCompany 
      ? (this.api as any).updateCompany(company.companyId, payload)
      : (this.api as any).updateCompanyStatus(company.companyId, payload);

    apiCall.subscribe({
      next: () => {
        console.log('✅ تم تحديث الحالة في قاعدة البيانات بنجاح.');
      },
      error: (err: any) => {
        console.warn('تم الحفظ بالواجهة المحلية:', err);
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
    const comp = this.selectedCompanyToReject || this.selectedCompanyDetails;
    if (!comp || !this.rejectionReasonText.trim()) return;

    this.updateCompanyStatus(comp, 'Rejected', this.rejectionReasonText.trim());
    this.closeRejectModal();
  }

  openAddModal(): void {
    this.newCompany = {
      companyName: '',
      commercialRegister: '',
      workField: '',
      address: 'مسقط',
      capacity: 10,
      contactName: '',
      email: '',
      phone: '',
      status: 1
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
    if (!val) return 'اسم المنشأة مطلوب.';
    return null;
  }

  commercialRegisterError(): string | null {
    const val = (this.newCompany.commercialRegister || '').trim();
    if (!val) return 'رقم السجل التجاري مطلوب.';
    return null;
  }

  workFieldError(): string | null {
    const val = (this.newCompany.workField || '').trim();
    if (!val) return 'مجال عمل الشركة مطلوب.';
    return null;
  }

  capacityError(): string | null {
    const val = Number(this.newCompany.capacity);
    if (!val || isNaN(val) || val <= 0) return 'يرجى إدخال طاقة استيعابية صحيحة.';
    return null;
  }

  contactNameError(): string | null {
    const val = (this.newCompany.contactName || '').trim();
    if (!val) return 'اسم جهة الاتصال مطلوب.';
    return null;
  }

  emailError(): string | null {
    const val = (this.newCompany.email || '').trim();
    if (!val) return 'البريد الإلكتروني مطلوب.';
    return null;
  }

  submitAddCompany(): void {
    ['companyName', 'commercialRegister', 'workField', 'capacity', 'contactName', 'email'].forEach(f => this.markTouched(f));

    if (this.companyNameError() || this.commercialRegisterError() || this.workFieldError() || this.capacityError() || this.contactNameError() || this.emailError()) {
      this.addError.set('يرجى استكمال البيانات الإلزامية.');
      return;
    }

    this.isSaving.set(true);

    const payload = {
      companyName: this.newCompany.companyName.trim(),
      commercialRegister: this.newCompany.commercialRegister.trim(),
      crNumber: this.newCompany.commercialRegister.trim(),
      workField: this.newCompany.workField.trim(),
      address: this.newCompany.address || 'مسقط',
      capacity: Number(this.newCompany.capacity) || 10,
      contactName: this.newCompany.contactName.trim(),
      email: this.newCompany.email.trim(),
      phone: (this.newCompany.phone || '').trim(),
      status: 1
    };

    this.api.createCompany(payload).subscribe({
      next: (created: any) => {
        this.loadCompaniesFromDatabase();
        this.isSaving.set(false);
        this.closeAddModal();
      },
      error: () => {
        const item: HostCompany = { companyId: Date.now(), ...payload };
        this.companies.update(list => [item, ...list]);
        this.filterVersion.update(v => v + 1);
        this.isSaving.set(false);
        this.closeAddModal();
      }
    });
  }

  exportToExcel(): void {
    const data = this.filteredCompanies();
    if (data.length === 0) return;
    let csv = '\uFEFFمعرف الشركة,اسم الشركة,السجل التجاري,القطاع,المحافظة,مسؤول التواصل,الطاقة,الحالة\n';
    data.forEach(c => {
      csv += `${c.companyId},"${c.companyName}","${c.commercialRegister || ''}","${c.workField}","${c.address}","${c.contactName}",${c.capacity},"${this.statusLabel(c.status)}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Companies_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  }
}