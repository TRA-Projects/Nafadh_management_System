import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../services/admin-api';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';

export interface HostCompany {
  companyId: string | number;
  companyName: string;
  commercialRegister?: string;
  crNumber?: string;
  workField: string;
  city?: string;
  address: string;
  capacity: number;
  programsCount?: number;
  batchesCount?: number;
  activeTraineesCount?: number;
  contactName: string;
  email: string;
  phone: string;
  status: any; // 1=Approved, 0=PendingApproval, 2=Rejected, 3=Suspended
  rejectionReason?: string;
  createdAt?: string;
  logo?: string | null;
  supervisors?: any[];
  branches?: any[];
  programs?: any[];
  departments?: any[];
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

function convertArabicDigits(str: string): string {
  if (!str) return '';
  const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return str.replace(/[٠-٩]/g, (w) => arabicDigits.indexOf(w).toString());
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
  private http = inject(HttpClient);

  private readonly companyApiUrl = 'https://localhost:7082/api/Company';

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
  defaultCompanyCapacity = signal<number>(50);

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
    city: 'مسقط',
    address: 'مسقط',
    capacity: this.defaultCompanyCapacity(),
    contactName: '',
    email: '',
    phone: '',
    logo: '',
    status: 1
  };

  touchedFields: { [key: string]: boolean } = {};

  ngOnInit(): void {
    // تنظيف أي بيانات قديمة مخزنة محلياً كانت تحجب بيانات السيرفر الحقيقية
    try {
      localStorage.removeItem('nfd_company_status_overrides');
      localStorage.removeItem('nfd_local_companies');
    } catch { }

    this.loadCompaniesFromDatabase();
    this.api.getSystemVariables().subscribe({
  next: (variables: any[]) => {
    const setting = variables.find(
      (v: any) => v.variableKey === 'DefaultCapacity'
    );

    if (setting) {
      const capacity = Number(setting.value);

      if (Number.isFinite(capacity) && capacity > 0) {
        this.defaultCompanyCapacity.set(capacity);
      }
    }
  },
  error: (err) => {
    console.error('Failed to load DefaultCapacity:', err);
  }
});
  }

  isApproved(status: any): boolean {
    return status === 1 || status === '1' || status === 'Approved' || status === 'approved';
  }

  isPending(status: any): boolean {
    return status === 0 || status === '0' || status === 'PendingApproval' || status === 'pending' || status === 'Pending';
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

  // =========================================================================
  // جلب الشركات مباشرة من الباك إند الحقيقي (بورت 7082)
  // =========================================================================
  loadCompaniesFromDatabase(): void {
    this.isLoading.set(true);

    this.http.get<any>(this.companyApiUrl).pipe(
      catchError(() => this.api.getCompanies())
    ).subscribe({
      next: (res: any) => {
        let rawList: any[] = [];
        if (Array.isArray(res)) rawList = res;
        else if (res && Array.isArray(res.data)) rawList = res.data;
        else if (res && Array.isArray(res.result)) rawList = res.result;

        const mapped: HostCompany[] = rawList.map((item: any) => {
          const compId = Number(item.companyId ?? item.CompanyId ?? item.id ?? item.Id ?? 0);
          const supervisors = item.supervisors ?? item.Supervisors ?? [];
          const branches = item.branches ?? item.Branches ?? [];
          const programs = item.programs ?? item.Programs ?? [];
          const departments = item.departments ?? item.Departments ?? [];

          const firstSup = Array.isArray(supervisors) && supervisors.length > 0 ? supervisors[0] : null;
          const firstBranch = Array.isArray(branches) && branches.length > 0 ? branches[0] : null;

          const cr = item.commercialRegister ?? item.CommercialRegister ?? item.crNumber ?? item.CrNumber ?? '—';
          const branchLoc = firstBranch ? (firstBranch.location ?? firstBranch.Location ?? null) : null;
          const cityName = item.city ?? item.City ?? item.address ?? item.Address ?? branchLoc ?? 'مسقط';
          const companyLogo = item.logo ?? item.Logo ?? null;

          const contactPerson =
            item.contactName ??
            item.ContactName ??
            item.contactPerson ??
            firstSup?.fullName ??
            firstSup?.FullName ??
            'مسؤول الشركة';

          const contactEmail =
            item.email ??
            item.Email ??
            firstSup?.email ??
            firstSup?.Email ??
            '';

          const contactPhone =
            item.phone ??
            item.Phone ??
            firstSup?.phone ??
            firstSup?.Phone ??
            '';

          return {
            companyId: compId,
            companyName: item.companyName ?? item.CompanyName ?? 'شركة بدون اسم',
            commercialRegister: cr || '—',
            crNumber: cr || '—',
            workField: item.workField ?? item.WorkField ?? 'غير محدد',
            city: cityName,
            address: item.address ?? item.Address ?? cityName,
            capacity: Number(item.capacity ?? item.Capacity ?? 0),
            contactName: contactPerson,
            email: contactEmail,
            phone: contactPhone,
            logo: companyLogo,
            status: item.status ?? item.Status ?? 0,
            rejectionReason: item.rejectionReason ?? item.RejectionReason ?? '',
            programsCount: Number(item.programsCount ?? item.ProgramsCount ?? programs.length ?? 0),
            batchesCount: Number(item.batchesCount ?? item.BatchesCount ?? 0),
            activeTraineesCount: Number(
              item.traineesCount ??
              item.TraineesCount ??
              item.activeTraineesCount ??
              item.ActiveTraineesCount ??
              0
            ),
            createdAt: item.createdAt ?? item.CreatedAt ?? item.approvalDate ?? item.ApprovalDate ?? '',
            supervisors,
            branches,
            programs,
            departments
          };
        });

        this.companies.set(mapped);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.error('❌ تعذر جلب الشركات من السيرفر:', err);
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

  rejectedCompaniesCount = computed(() => {
    return this.companies().filter(c => this.isRejected(c.status)).length;
  });

  totalCapacityCount = computed(() => {
    return this.companies().reduce((sum, c) => sum + (Number(c.capacity) || 0), 0);
  });

  uniqueCities = computed(() => {
    const set = new Set<string>();
    this.companies().forEach(c => {
      const loc = c.city || c.address;
      if (loc && loc.trim()) {
        const city = loc.split('/')[0].split('،')[0].split(',')[0].trim();
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
        const city = normalizeArabic(c.city || c.address || '');
        const cr = (c.commercialRegister || '').toLowerCase();
        const email = (c.email || '').toLowerCase();
        return (
          name.includes(query) ||
          field.includes(query) ||
          contact.includes(query) ||
          city.includes(query) ||
          cr.includes(query) ||
          email.includes(query)
        );
      });
    }

    if (this.cityFilter !== 'ALL') {
      list = list.filter(c => normalizeArabic(c.city || c.address || '').includes(normalizeArabic(this.cityFilter)));
    }

    if (this.workFieldFilter !== 'ALL') {
      list = list.filter(c => normalizeArabic(c.workField || '').includes(normalizeArabic(this.workFieldFilter)));
    }

    if (this.capacitySortFilter === 'TOP_CAPACITY') {
      list.sort((a, b) => (Number(b.capacity) || 0) - (Number(a.capacity) || 0));
    } else if (this.capacitySortFilter === 'LOW_CAPACITY') {
      list.sort((a, b) => (Number(a.capacity) || 0) - (Number(b.capacity) || 0));
    } else {
      // الترتيب الافتراضي: الشركات الجديدة قيد المراجعة أولاً، ثم الأحدث تسجيلاً (أعلى CompanyId)
      list.sort((a, b) => {
        const aPending = this.isPending(a.status) ? 1 : 0;
        const bPending = this.isPending(b.status) ? 1 : 0;
        if (aPending !== bPending) return bPending - aPending;
        return Number(b.companyId) - Number(a.companyId);
      });
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
    return Boolean(
      this.searchTerm.trim().length > 0 ||
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
    const start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);
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
  // تحديث حالة الشركة فعلياً في SQL Server (اعتماد / رفض / إيقاف)
  // ============================================================
  updateCompanyStatus(
    company: HostCompany | null | undefined,
    newStatusText: 'Approved' | 'Suspended' | 'Rejected',
    reason: string = ''
  ): void {
    if (!company) return;

    this.isSaving.set(true);

    const numericId = Number(company.companyId);
    const previousStatus = company.status;
    const previousReason = company.rejectionReason;

    // تحديث فوري في الواجهة
    this.companies.update(list =>
      list.map(c =>
        Number(c.companyId) === numericId
          ? { ...c, status: newStatusText, rejectionReason: reason || undefined }
          : c
      )
    );

    if (this.selectedCompanyDetails && Number(this.selectedCompanyDetails.companyId) === numericId) {
      this.selectedCompanyDetails = {
        ...this.selectedCompanyDetails,
        status: newStatusText,
        rejectionReason: reason || undefined
      };
    }
    this.filterVersion.update(v => v + 1);

    const statusPayload = {
      status: newStatusText,
      rejectionReason: reason || null
    };

    const fallbackPut$ =
      newStatusText === 'Approved'
        ? this.http.put(`${this.companyApiUrl}/${numericId}/approve`, {})
        : newStatusText === 'Suspended'
          ? this.http.put(`${this.companyApiUrl}/${numericId}/suspend`, {})
          : this.http.put(`${this.companyApiUrl}/${numericId}/reject`, { rejectionReason: reason });

    this.http.patch(`${this.companyApiUrl}/${numericId}/status`, statusPayload).pipe(
      catchError(() => fallbackPut$)
    ).subscribe({
      next: () => {
        this.isSaving.set(false);
        this.loadCompaniesFromDatabase();
      },
      error: (err: any) => {
        console.error('❌ تعذر تحديث حالة الشركة في قاعدة البيانات:', err);
        // التراجع عن التغيير المؤقت في حال فشل السيرفر
        this.companies.update(list =>
          list.map(c =>
            Number(c.companyId) === numericId
              ? { ...c, status: previousStatus, rejectionReason: previousReason }
              : c
          )
        );
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
      city: 'مسقط',
      address: 'مسقط',
      capacity: this.defaultCompanyCapacity(),
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

  openRegisterModal = () => this.openAddModal();
  closeRegisterModal = () => this.closeAddModal();

  markTouched(field: string): void {
    this.touchedFields[field] = true;
  }

  showError(field: string): boolean {
    return !!this.touchedFields[field];
  }

  companyNameError(): string | null {
    const val = (this.newCompany.companyName || '').trim();
    if (!val) return 'اسم المنشأة أو الشركة مطلوب.';
    if (val.length < 3) return 'يجب ألا يقل اسم الشركة عن 3 أحرف.';
    if (!/^[\u0600-\u06FFa-zA-Z0-9\s.\-&]+$/.test(val)) {
      return 'اسم الشركة يحتوي على رموز خاصة غير مقبولة.';
    }
    if (/^[0-9]+$/.test(val)) return 'اسم الشركة لا يمكن أن يتكون من أرقام فقط.';
    return null;
  }

  commercialRegisterError(): string | null {
    const val = (this.newCompany.commercialRegister || '').trim();
    if (!val) return 'رقم السجل التجاري مطلوب.';
    if (!/^(CR-)?[0-9]{5,10}$/i.test(val)) {
      return 'صيغة السجل غير صحيحة. يجب أن يتكون من 5 إلى 10 أرقام (مثال: 1049281 أو CR-1049281).';
    }
    return null;
  }

  workFieldError(): string | null {
    const val = (this.newCompany.workField || '').trim();
    if (!val) return 'مجال عمل الشركة مطلوب.';
    if (val.length < 3) return 'يرجى كتابة مجال تخصص واضح لا يقل عن 3 أحرف.';
    if (!/^[\u0600-\u06FFa-zA-Z\s/,\-]+$/.test(val)) {
      return 'مجال العمل يجب أن يحتوي على أحرف فقط دون أرقام.';
    }
    return null;
  }

  addressError(): string | null {
    const val = (this.newCompany.city || this.newCompany.address || '').trim();
    if (!val) return 'المقر أو المحافظة مطلوب.';
    if (val.length < 3) return 'يرجى إدخال اسم المحافظة أو المقر بشكل صحيح.';
    return null;
  }

  contactNameError(): string | null {
    const val = (this.newCompany.contactName || '').trim();
    if (!val) return 'اسم مسؤول الاتصال والتنسيق مطلوب.';
    if (!/^[\u0600-\u06FFa-zA-Z\s]+$/.test(val)) {
      return 'اسم المسؤول يجب أن يحتوي على أحرف فقط بدون أرقام أو رموز.';
    }
    const words = val.split(/\s+/).filter((w: string) => w.length > 1);
    if (words.length < 2) {
      return 'يرجى إدخال الاسم الثنائي على الأقل (مثال: سالم المعمري).';
    }
    return null;
  }

  emailError(): string | null {
    const val = (this.newCompany.email || '').trim();
    if (!val) return 'البريد الإلكتروني مطلوب.';
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(val)) {
      return 'صيغة البريد الإلكتروني غير صحيحة (مثال: info@company.om).';
    }
    return null;
  }

  phoneError(): string | null {
    const rawVal = (this.newCompany.phone || '').toString().trim();
    if (!rawVal) {
      return 'رقم الهاتف الرسمي مطلوب إجبارياً.';
    }

    let cleaned = convertArabicDigits(rawVal).replace(/[\s\-\(\)\.]/g, '');

    if (cleaned.startsWith('+968')) {
      cleaned = cleaned.substring(4);
    } else if (cleaned.startsWith('00968')) {
      cleaned = cleaned.substring(5);
    } else if (cleaned.startsWith('968') && cleaned.length === 11) {
      cleaned = cleaned.substring(3);
    }

    if (!/^\d+$/.test(cleaned)) {
      return 'رقم الهاتف غير صالح. يجب أن يحتوي على أرقام فقط.';
    }

    if (cleaned.length !== 8) {
      return `طول الرقم غير صحيح. يجب أن يتكون الرقم المحلي من 8 أرقام تماماً (أدخلت ${cleaned.length} من 8).`;
    }

    const prefix = cleaned.charAt(0);
    if (!['2', '7', '8', '9'].includes(prefix)) {
      return 'بداية الرقم غير صحيحة. الأرقام العمانية المعتمدة تبدأ بـ (9 أو 7 أو 8 للمتنقل) أو (2 للهاتف الثابت).';
    }

    return null;
  }

  capacityError(): string | null {
    const val = Number(this.newCompany.capacity);
    if (!val || isNaN(val) || val <= 0) {
      return 'يرجى إدخال طاقة استيعابية صحيحة أكبر من صفر.';
    }
    if (!Number.isInteger(val)) {
      return 'الطاقة الاستيعابية يجب أن تكون رقماً صحيحاً بدون فواصل.';
    }
    if (val > 500) {
      return 'الحد الأقصى للطاقة الاستيعابية هو 500 متدرب.';
    }
    return null;
  }

  isFormValid(): boolean {
    return !this.companyNameError() &&
      !this.commercialRegisterError() &&
      !this.workFieldError() &&
      !this.addressError() &&
      !this.contactNameError() &&
      !this.emailError() &&
      !this.phoneError() &&
      !this.capacityError();
  }

  onlyNumbers(event: KeyboardEvent): boolean {
    const charCode = event.which ? event.which : event.keyCode;
    if (charCode > 31 && (charCode < 48 || charCode > 57) && charCode !== 43 && charCode !== 45) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  onlyLetters(event: KeyboardEvent): boolean {
    const char = event.key;
    if (!/^[\u0600-\u06FFa-zA-Z\s]$/.test(char) && event.keyCode > 31) {
      event.preventDefault();
      return false;
    }
    return true;
  }

  // =========================================================================
  // حفظ وإرسال الشركة لقاعدة البيانات
  // =========================================================================
  submitAddCompany(): void {
    ['companyName', 'commercialRegister', 'workField', 'city', 'address', 'capacity', 'contactName', 'email', 'phone']
      .forEach(f => this.markTouched(f));

    if (!this.isFormValid()) {
      this.addError.set('يرجى تصحيح الحقول المحددة باللون الأحمر قبل الحفظ.');
      return;
    }

    this.isSaving.set(true);

    const compName = this.newCompany.companyName.trim();
    const cityVal = (this.newCompany.city || this.newCompany.address || 'مسقط').trim();
    const crVal = this.newCompany.commercialRegister.trim();
    const phoneVal = (this.newCompany.phone || '').toString().trim();
    const emailVal = this.newCompany.email.trim();
    const contactVal = (this.newCompany.contactName || '').trim();

    const cleanName = compName.replace(/\s+/g, '_');
    const autoLogo = (this.newCompany.logo && this.newCompany.logo.trim())
      ? this.newCompany.logo.trim()
      : `https://cdn.nafadh.test/logos/${cleanName}.png`;

    const payload: any = {
      companyName: compName,
      commercialRegister: crVal,
      crNumber: crVal,
      workField: this.newCompany.workField.trim(),
      city: cityVal,
      address: cityVal,
      capacity: Number(this.newCompany.capacity) || this.defaultCompanyCapacity(),
      contactName: contactVal,
      supervisorEmail: emailVal,
      supervisorPhone: phoneVal,
      email: emailVal,
      phone: phoneVal,
      logo: autoLogo,
      status: 'Approved',
      approvalDate: new Date().toISOString(),
      userId: null,
      rejectionReason: null
    };

    this.http.post(this.companyApiUrl, payload).subscribe({
      next: () => {
        this.loadCompaniesFromDatabase();
        this.isSaving.set(false);
        this.closeAddModal();
      },
      error: (err: any) => {
        console.error('❌ فشل الحفظ في السيرفر:', err);
        const errMsg = err.error?.message || err.message || 'خطأ غير معروف';
        this.addError.set(`تعذر حفظ الشركة في قاعدة البيانات: ${errMsg}`);
        this.isSaving.set(false);
      }
    });
  }

  exportToExcel(): void {
    const data = this.filteredCompanies();
    if (data.length === 0) return;
    let csv = '\uFEFFمعرف الشركة,اسم الشركة,السجل التجاري,القطاع,المحافظة,مسؤول التواصل,الطاقة,الحالة\n';
    data.forEach(c => {
      csv += `${c.companyId},"${c.companyName}","${c.commercialRegister || ''}","${c.workField}","${c.city || c.address}","${c.contactName}",${c.capacity},"${this.statusLabel(c.status)}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Companies_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  }
}

export { AdminCompanies as HostCompaniesComponent };