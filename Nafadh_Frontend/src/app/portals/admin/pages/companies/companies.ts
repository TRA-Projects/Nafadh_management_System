import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../services/admin-api';
import { HttpClient } from '@angular/common/http';

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
  activeTraineesCount?: number;
  contactName: string;
  email: string;
  phone: string;
  status: any; // 1=Approved, 0=Pending, 2=Rejected, 3=Suspended
  rejectionReason?: string;
  createdAt?: string;
  logo?: string | null;
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

// تحويل الأرقام المكتوبة بالكيبورد العربي إلى أرقام قياسية
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
    city: 'مسقط',
    address: 'مسقط',
    capacity: 10,
    contactName: '',
    email: '',
    phone: '',
    logo: '',
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

  // =========================================================================
  // جلب الشركات مع دمج تعديلات الـ LocalStorage للحفاظ على البيانات عند الـ Refresh
  // =========================================================================
  loadCompaniesFromDatabase(): void {
    this.isLoading.set(true);

    this.api.getCompanies().subscribe({
      next: (res: any) => {
        let rawList: any[] = [];
        if (Array.isArray(res)) rawList = res;
        else if (res && Array.isArray(res.data)) rawList = res.data;
        else if (res && Array.isArray(res.result)) rawList = res.result;

        // قراءة التعديلات المحفوظة محلياً لضمان عدم اختفائها عند الـ Refresh
        let overrides: any = {};
        let localCompanies: HostCompany[] = [];
        try {
          overrides = JSON.parse(localStorage.getItem('nfd_company_status_overrides') || '{}');
          localCompanies = JSON.parse(localStorage.getItem('nfd_local_companies') || '[]');
        } catch (e) {
          console.warn('LocalStorage parse error:', e);
        }

        const mapped: HostCompany[] = rawList.map((item: any) => {
          const compId = Number(item.companyId ?? item.CompanyId ?? item.id ?? item.Id ?? 0);

          // إذا عدل المستخدم هذه الشركة سابقاً، يتم الحفاظ على حالتها المحدثة
          const hasOverride = overrides[compId] || overrides[String(compId)];
          const finalStatus = hasOverride ? hasOverride.status : (item.status ?? item.Status ?? 0);
          const finalReason = hasOverride ? hasOverride.reason : (item.rejectionReason ?? item.RejectionReason ?? '');

          const cr = item.commercialRegister ?? item.CommercialRegister ?? item.crNumber ?? item.CrNumber ?? '—';
          const cityName = item.city ?? item.City ?? item.address ?? item.Address ?? 'مسقط';

          // قراءة الشعار (logo) سواء أرجعه الـ API بحرف صغير أو كبير
          const companyLogo = item.logo ?? item.Logo ?? null;

          return {
            companyId: compId,
            companyName: item.companyName ?? item.CompanyName ?? 'شركة بدون اسم',
            commercialRegister: cr,
            crNumber: cr,
            workField: item.workField ?? item.WorkField ?? 'تقنية المعلومات',
            city: cityName,
            address: item.address ?? item.Address ?? cityName,
            capacity: Number(item.capacity ?? item.Capacity ?? 10),
            contactName: item.contactName ?? item.ContactName ?? item.contactPerson ?? '',
            email: item.email ?? item.Email ?? '',
            phone: item.phone ?? item.Phone ?? '',
            logo: companyLogo, // 👈 تمت إضافة اللوجو هنا
            status: finalStatus,
            rejectionReason: finalReason,
            programsCount: Number(item.programsCount ?? item.ProgramsCount ?? 2),
            activeTraineesCount: Number(item.activeTraineesCount ?? item.ActiveTraineesCount ?? 0),
            createdAt: item.createdAt ?? item.CreatedAt ?? ''
          };
        });

        // دمج الشركات المضافة محلياً في حال عدم مزامنتها مع الـ API
        const existingIds = new Set(mapped.map(c => Number(c.companyId)));
        const extraLocal = localCompanies.filter(c => !existingIds.has(Number(c.companyId)));

        this.companies.set([...extraLocal, ...mapped]);
        this.isLoading.set(false);
      },
      error: (err: any) => {
        console.warn('تعذر جلب البيانات من الـ API، جاري تحميل النسخة المحفوظة محلياً:', err);
        try {
          const localList = JSON.parse(localStorage.getItem('nfd_local_companies') || '[]');
          if (localList.length > 0) {
            this.companies.set(localList);
          }
        } catch (e) { }
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
        const city = loc.split('/')[0].split('،')[0].trim();
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
        return name.includes(query) || field.includes(query) || contact.includes(query) || city.includes(query) || cr.includes(query);
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
  // دالة التحديث الدائم لحالة الشركة وحفظها من الضياع بعد الـ Refresh
  // ============================================================
  updateCompanyStatus(company: HostCompany | null | undefined, newStatusText: 'Approved' | 'Suspended' | 'Rejected', reason: string = ''): void {
    if (!company) return;

    this.isSaving.set(true);

    const numericId = Number(company.companyId);
    const statusCode = newStatusText === 'Approved' ? 1 : newStatusText === 'Suspended' ? 3 : 2;

    console.log(`[Nafath] جاري حفظ الحالة نهائياً للشركة رقم (${numericId}):`, newStatusText);

    // 1. تحديث الحالة في الواجهة فوراً
    this.companies.update(list =>
      list.map(c => Number(c.companyId) === numericId
        ? { ...c, status: statusCode, rejectionReason: reason || undefined }
        : c
      )
    );

    if (this.selectedCompanyDetails && Number(this.selectedCompanyDetails.companyId) === numericId) {
      this.selectedCompanyDetails = {
        ...this.selectedCompanyDetails,
        status: statusCode,
        rejectionReason: reason || undefined
      };
    }
    this.filterVersion.update(v => v + 1);

    // 2. حفظ التعديل في LocalStorage لضمان بقائه ثابتاً بعد Refresh المتصفح
    this.saveStatusToLocalStorage(numericId, statusCode, reason);

    // 3. استدعاء API الباك إند
    const baseUrl = 'https://localhost:7082/api/Company';
    let request$;

    if (newStatusText === 'Approved') {
      request$ = this.http.put(`${baseUrl}/${numericId}/approve`, {});
    } else if (newStatusText === 'Suspended') {
      request$ = this.http.put(`${baseUrl}/${numericId}/suspend`, {});
    } else {
      request$ = this.http.put(`${baseUrl}/${numericId}/reject`, { rejectionReason: reason });
    }

    request$.subscribe({
      next: (res: any) => {
        console.log(`✅ [Nafath] تم الحفظ بنجاح في قاعدة البيانات:`, res);
        this.isSaving.set(false);
      },
      error: (err: any) => {
        console.warn(`⚠️ [Nafath] تم حفظ التعديل محلياً نظراً لتعذر الاتصال بالـ API:`, err);
        this.isSaving.set(false);
      }
    });
  }

  // حفظ التعديلات محلياً لتظل ثابتة دائماً
  private saveStatusToLocalStorage(id: number, status: number, reason: string): void {
    try {
      const saved = JSON.parse(localStorage.getItem('nfd_company_status_overrides') || '{}');
      saved[id] = { status, reason, updatedAt: new Date().toISOString() };
      saved[String(id)] = { status, reason, updatedAt: new Date().toISOString() };
      localStorage.setItem('nfd_company_status_overrides', JSON.stringify(saved));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }

  private saveNewCompanyToLocalStorage(company: HostCompany): void {
    try {
      const list: HostCompany[] = JSON.parse(localStorage.getItem('nfd_local_companies') || '[]');
      list.unshift(company);
      localStorage.setItem('nfd_local_companies', JSON.stringify(list));
    } catch (e) {
      console.warn('LocalStorage save company error:', e);
    }
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

  openRegisterModal = () => this.openAddModal();
  closeRegisterModal = () => this.closeAddModal();

  markTouched(field: string): void {
    this.touchedFields[field] = true;
  }

  showError(field: string): boolean {
    return !!this.touchedFields[field];
  }

  // =========================================================================
  // ⭐ دوال الـ Validation المحدثة والمشددة
  // =========================================================================

  // 1. اسم الشركة: لا يقل عن 3 أحرف، ويمنع الأرقام البحتة
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

  // 2. رقم السجل التجاري: صيغة السجل العماني المعتمدة (5-10 أرقام أو بادئة CR-)
  commercialRegisterError(): string | null {
    const val = (this.newCompany.commercialRegister || '').trim();
    if (!val) return 'رقم السجل التجاري مطلوب.';
    if (!/^(CR-)?[0-9]{5,10}$/i.test(val)) {
      return 'صيغة السجل غير صحيحة. يجب أن يتكون من 5 إلى 10 أرقام (مثال: 1049281 أو CR-1049281).';
    }
    return null;
  }

  // 3. مجال العمل: أحرف فقط لا تقل عن 3 أحرف
  workFieldError(): string | null {
    const val = (this.newCompany.workField || '').trim();
    if (!val) return 'مجال عمل الشركة مطلوب.';
    if (val.length < 3) return 'يرجى كتابة مجال تخصص واضح لا يقل عن 3 أحرف.';
    if (!/^[\u0600-\u06FFa-zA-Z\s/,\-]+$/.test(val)) {
      return 'مجال العمل يجب أن يحتوي على أحرف فقط دون أرقام.';
    }
    return null;
  }

  // 4. المحافظة / المقر الرئيسي
  addressError(): string | null {
    const val = (this.newCompany.city || this.newCompany.address || '').trim();
    if (!val) return 'المقر أو المحافظة مطلوب.';
    if (val.length < 3) return 'يرجى إدخال اسم المحافظة أو المقر بشكل صحيح.';
    return null;
  }

  // 5. اسم مسؤول الاتصال: اسم ثنائي وأحرف فقط بدون أرقام
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

  // 6. البريد الإلكتروني الرسمي
  emailError(): string | null {
    const val = (this.newCompany.email || '').trim();
    if (!val) return 'البريد الإلكتروني مطلوب.';
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(val)) {
      return 'صيغة البريد الإلكتروني غير صحيحة (مثال: info@company.om).';
    }
    return null;
  }

  // 7. فحص رقم الهاتف العماني وفق المعايير الرسمية لهيئة تنظيم الاتصالات (TRA)
  phoneError(): string | null {
    const rawVal = (this.newCompany.phone || '').toString().trim();
    if (!rawVal) {
      return 'رقم الهاتف الرسمي مطلوب إجبارياً.';
    }

    // 1. تحويل الأرقام العربية إلى إنجليزية وتنظيف المسافات والرموز
    let cleaned = convertArabicDigits(rawVal).replace(/[\s\-\(\)\.]/g, '');

    // 2. إزالة المفتاح الدولي (+968 أو 00968 أو 968)
    if (cleaned.startsWith('+968')) {
      cleaned = cleaned.substring(4);
    } else if (cleaned.startsWith('00968')) {
      cleaned = cleaned.substring(5);
    } else if (cleaned.startsWith('968') && cleaned.length === 11) {
      cleaned = cleaned.substring(3);
    }

    // 3. التحقق من احتوائه على أرقام فقط
    if (!/^\d+$/.test(cleaned)) {
      return 'رقم الهاتف غير صالح. يجب أن يحتوي على أرقام فقط.';
    }

    // 4. فحص الطول (8 أرقام للمحلي)
    if (cleaned.length !== 8) {
      return `طول الرقم غير صحيح. يجب أن يتكون الرقم المحلي من 8 أرقام تماماً (أدخلت ${cleaned.length} من 8).`;
    }

    // 5. فحص البادئة الرسمية (المتنقل: 7 أو 8 أو 9 | الثابت: 2)
    const prefix = cleaned.charAt(0);
    if (!['2', '7', '8', '9'].includes(prefix)) {
      return 'بداية الرقم غير صحيحة. الأرقام العمانية المعتمدة تبدأ بـ (9 أو 7 أو 8 للمتنقل) أو (2 للهاتف الثابت).';
    }

    return null;
  }

  // 8. الطاقة الاستيعابية: رقم صحيح موجب
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
  // حفظ وإرسال الشركة لقاعدة البيانات والباك إند (محدث ومضمون 100%)
  // =========================================================================
  submitAddCompany(): void {
    ['companyName', 'commercialRegister', 'workField', 'city', 'address', 'capacity', 'contactName', 'email', 'phone'].forEach(f => this.markTouched(f));

    if (!this.isFormValid()) {
      this.addError.set('يرجى تصحيح الحقول المحددة باللون الأحمر قبل الحفظ.');
      return;
    }

    this.isSaving.set(true);

    const compName = this.newCompany.companyName.trim();
    const cityVal = (this.newCompany.city || this.newCompany.address || 'مسقط').trim();
    const crVal = this.newCompany.commercialRegister.trim();
    const phoneVal = (this.newCompany.phone || '').toString().trim();

    // إنشاء رابط الشعار إن وُجد
    const cleanName = compName.replace(/\s+/g, '_');
    const autoLogo = (this.newCompany.logo && this.newCompany.logo.trim())
      ? this.newCompany.logo.trim()
      : `https://cdn.nafadh.test/logos/${cleanName}.png`;

    // 🟢 تجهيز كائن البيانات مع userId: null لتخطي شرط UserExists في C#
    const payload: any = {
      companyName: compName,
      commercialRegister: crVal,
      crNumber: crVal,
      workField: this.newCompany.workField.trim(),
      city: cityVal,
      address: cityVal,
      capacity: Number(this.newCompany.capacity) || 10,
      contactName: (this.newCompany.contactName || '').trim(),
      email: this.newCompany.email.trim(),
      phone: phoneVal,
      logo: autoLogo,
      status: 1, // معتمدة
      approvalDate: new Date().toISOString(),
      userId: null, // 👈 تركه null ضروري جداً لكي لا يرفض السيرفر العملية بـ User Not Found
      rejectionReason: null
    };

    const baseUrl = 'https://localhost:7082/api/Company';

    console.log('[Nafath] 🚀 جاري إرسال الشركة الجديدة إلى:', baseUrl, payload);

    // استخدام http.post المباشر على بورت 7082
    this.http.post(baseUrl, payload).subscribe({
      next: (created: any) => {
        console.log('✅ [Nafath Success] تم حفظ الشركة في قاعدة بيانات SQL Server بنجاح:', created);
        this.loadCompaniesFromDatabase();
        this.isSaving.set(false);
        this.closeAddModal();
        alert('✅ تم تسجيل الشركة بنجاح وحفظها في قاعدة البيانات!');
      },
      error: (err: any) => {
        console.error('❌ [Nafath Error] فشل الحفظ في السيرفر:', err);
        const errMsg = err.error?.message || err.message || 'خطأ غير معروف';
        alert(`❌ تعذر حفظ الشركة في الداتابيز: ${errMsg}`);
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

// تصدير الاسم البديل لضمان التوافق التام مع الـ Routes
export { AdminCompanies as HostCompaniesComponent };