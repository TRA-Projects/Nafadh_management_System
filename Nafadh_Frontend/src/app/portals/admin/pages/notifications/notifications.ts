import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../services/admin-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { AnnouncementDto } from '../../../../core/models/dtos';

export type NotificationFilter = 'all' | 'unread' | 'announcement' | 'alert' | 'company';
export type NotificationPriority = 'all' | 'urgent' | 'high' | 'normal';
export type PriorityLevel = 'normal' | 'important' | 'urgent';
export type MainAudienceType = 'all' | 'admins' | 'trainers' | 'companies' | 'trainees';

export interface NotificationViewModel {
  notificationId: number;
  title: string;
  message: string;
  category: 'announcement' | 'alert' | 'company' | 'evaluation' | 'system';
  priority: 'normal' | 'high' | 'urgent';
  targetScope: 'all' | 'companies' | 'trainers' | 'trainees';
  isRead: boolean;
  createdAt: string | Date;
  dateLabel: string;
  source: string;
}

export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text.toLowerCase().trim().replace(/[أإآٱ]/g, 'ا').replace(/[ة]/g, 'ه').replace(/[ى]/g, 'ي').replace(/[ًٌٍَُِّْـ]/g, '');
}

export function normalizePriority(val: any): 'urgent' | 'high' | 'normal' {
  if (val === null || val === undefined) return 'normal';
  const s = String(val).trim().toLowerCase();
  if (s === '2' || s === 'urgent' || s.includes('عاجل')) return 'urgent';
  if (s === '1' || s === 'high' || s === 'important' || s.includes('هام') || s.includes('مهم')) return 'high';
  return 'normal';
}

export function normalizeCategory(item: any): 'announcement' | 'alert' | 'company' | 'evaluation' | 'system' {
  const cat = String(item.category || item.Category || '').trim().toLowerCase();
  const scope = item.scopeType ?? item.ScopeType;
  if (cat.includes('alert') || cat.includes('تنبيه') || cat.includes('إنذار') || cat.includes('انذار')) return 'alert';
  if (cat.includes('company') || cat.includes('شرك') || scope === 1) return 'company';
  if (cat.includes('eval') || cat.includes('تقييم') || scope === 2) return 'evaluation';
  return 'announcement';
}

@Component({
  selector: 'app-admin-notifications',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css',
})
export class AdminNotifications implements OnInit {
  private readonly api = inject(AdminApi);
  private readonly auth = inject(AuthService);

  rawNotifications = signal<AnnouncementDto[]>([]);
  activeFilter = signal<NotificationFilter>('all');
  
  priorityFilter: NotificationPriority = 'all';
  priorityFilterSignal = signal<NotificationPriority>('all');
  
  searchQuery = '';
  searchQuerySignal = signal<string>('');
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  // ==========================================
  // متغيرات النافذة المنبثقة (إعلان جديد)
  // ==========================================
  showAnnounce = signal<boolean>(false);
  activeAnnounceTab: 'edit' | 'preview' = 'edit';
  posting = signal<boolean>(false);
  announceError = signal<string | null>(null);

  newAnnounceData = {
    title: '',
    priority: 'normal' as PriorityLevel,
    content: '',
    mainAudience: 'all' as MainAudienceType,
    companyScope: 'all_companies' as 'all_companies' | 'specific_companies',
    selectedCompanyIds: [] as string[],
    traineeScope: 'all_trainees' as 'all_trainees' | 'specific_trainees',
    selectedTraineeIds: [] as string[],
    trainerScope: 'all_trainers' as 'all_trainers' | 'specific_trainers',
    selectedTrainerIds: [] as string[],
    channels: { inApp: true, email: true, sms: false },
    isPinned: false
  };

  // ==========================================
  // 🌟 البيانات التي تأتي من قاعدة البيانات
  // ==========================================
  dbCompanies = signal<any[]>([]);
  dbTrainees = signal<any[]>([]);
  dbTrainers = signal<any[]>([]);
  isLoadingData = signal<boolean>(false);

  // متغيرات التصفية للشركات
  companySearch = '';
  companyFilterWorkField = '';
  companyFilterCapacity = '';

  // متغيرات التصفية للمتدربين
  traineeSearch = '';
  traineeFilterTrack = '';
  traineeFilterBatch = '';
  traineeFilterCompany = '';

  // متغيرات التصفية للمدربين
  trainerSearch = '';

  selectedNotification = signal<NotificationViewModel | null>(null);
  toastMessage = signal<string | null>(null);

  private readIds(): number[] {
    try { return JSON.parse(localStorage.getItem('admin_read_announcements') || '[]'); } catch { return []; }
  }

  viewModels = computed<NotificationViewModel[]>(() => {
    const readIds = this.readIds();
    return this.rawNotifications().map((n, idx) => {
      const item = n as any;
      const id = Number(item.announcementId ?? item.AnnouncementId ?? item.id ?? item.Id ?? (idx + 1));
      const isRead = readIds.includes(id) || Boolean(item.isRead ?? item.IsRead);
      const rawDate = item.createdAt || item.CreatedAt || item.date || item.Date || new Date().toISOString();
      const cat = normalizeCategory(item);
      const prio = normalizePriority(item.priority ?? item.Priority);
      const title = item.title || item.Title || (item.message ? item.message.slice(0, 45) + '...' : 'إعلان نظامي جديد');
      const message = item.message || item.Message || item.description || item.Description || '';
      const source = item.source || item.Source || item.createdByName || item.CreatedByName || 'الإدارة العامة لمنظومة نفاذ';
      const targetScope = item.targetScope || item.TargetScope || 'all';

      return { notificationId: id, title, message, category: cat, priority: prio, targetScope, isRead, createdAt: rawDate, dateLabel: this.timeAgo(rawDate), source };
    });
  });

  stats = computed(() => {
    const list = this.viewModels();
    return {
      total: list.length,
      unread: list.filter((i) => !i.isRead).length,
      urgent: list.filter((i) => i.priority === 'urgent' || i.priority === 'high').length,
      announcements: list.filter((i) => i.category === 'announcement').length
    };
  });

  unreadCount = computed(() => this.stats().unread);

  filteredNotifications = computed<NotificationViewModel[]>(() => {
    const tab = this.activeFilter();
    const prio = this.priorityFilterSignal();
    const query = normalizeArabic(this.searchQuerySignal().trim());

    return this.viewModels().filter((item) => {
      if (tab === 'unread' && item.isRead) return false;
      if (tab === 'announcement' && item.category !== 'announcement') return false;
      if (tab === 'alert' && item.category !== 'alert') return false;
      if (tab === 'company' && item.category !== 'company') return false;
      if (prio !== 'all' && normalizePriority(item.priority) !== prio) return false;

      if (query) {
        const normTitle = normalizeArabic(item.title);
        const normMsg = normalizeArabic(item.message);
        const normSrc = normalizeArabic(item.source);
        const normCat = normalizeArabic(this.getCategoryLabel(item.category));
        const prioText = item.priority === 'urgent' ? 'عاجل' : item.priority === 'high' ? 'هام' : 'عادي';
        const normPrio = normalizeArabic(prioText);
        return normTitle.includes(query) || normMsg.includes(query) || normSrc.includes(query) || normCat.includes(query) || normPrio.includes(query);
      }
      return true;
    });
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.api.getAnnouncements().subscribe({
      next: (data: AnnouncementDto[]) => {
        const sorted = (data ?? []).sort((a, b) => {
          const aTime = new Date(a.createdAt || (a as any).date || Date.now()).getTime();
          const bTime = new Date(b.createdAt || (b as any).date || Date.now()).getTime();
          return bTime - aTime;
        });
        this.rawNotifications.set(sorted);
        this.loading.set(false);
      },
      error: (err) => { this.error.set('تعذر تحميل الإشعارات من الخادم.'); this.loading.set(false); },
    });
  }

  refresh(): void { this.load(); this.showToast('تم تحديث قائمة الإشعارات بنجاح.'); }
  setFilter(filter: NotificationFilter): void { this.activeFilter.set(filter); }
  onSearchChange(): void { this.searchQuerySignal.set(this.searchQuery); }

  onPriorityChange(newVal?: string): void {
    if (newVal) this.priorityFilter = newVal as NotificationPriority;
    this.priorityFilterSignal.set(this.priorityFilter);
  }

  resetFilters(): void {
    this.activeFilter.set('all');
    this.priorityFilter = 'all';
    this.priorityFilterSignal.set('all');
    this.searchQuery = '';
    this.searchQuerySignal.set('');
  }

  toggleReadStatus(item: NotificationViewModel, event?: Event): void {
    event?.stopPropagation();
    let readIds = this.readIds();
    if (item.isRead) readIds = readIds.filter((id) => id !== item.notificationId);
    else if (!readIds.includes(item.notificationId)) readIds.push(item.notificationId);
    localStorage.setItem('admin_read_announcements', JSON.stringify(readIds));
    this.rawNotifications.update((list) => [...list]);
    this.showToast(item.isRead ? 'تم التحديد كغير مقروء.' : 'تم التعليم كمقروء.');
  }

  markRead(item: NotificationViewModel, event?: Event): void {
    event?.stopPropagation();
    if (item.isRead) return;
    const readIds = this.readIds();
    if (!readIds.includes(item.notificationId)) {
      readIds.push(item.notificationId);
      localStorage.setItem('admin_read_announcements', JSON.stringify(readIds));
      this.rawNotifications.update((list) => [...list]);
    }
  }

  markAllRead(): void {
    const ids = this.viewModels().map((n) => n.notificationId);
    localStorage.setItem('admin_read_announcements', JSON.stringify(ids));
    this.rawNotifications.update((list) => [...list]);
    this.showToast('تم تعليم جميع الإشعارات كمقروءة بنجاح.');
  }

  deleteNotification(id: number, event?: Event): void {
    event?.stopPropagation();
    this.rawNotifications.update((list) => list.filter((n) => Number(n.announcementId ?? (n as any).id) !== id));
    if (this.selectedNotification()?.notificationId === id) this.selectedNotification.set(null);
    this.showToast('تم حذف الإشعار بنجاح.');
  }

  openDetails(item: NotificationViewModel, event?: Event): void {
    event?.stopPropagation();
    this.markRead(item);
    this.selectedNotification.set(item);
  }
  closeDetails(): void { this.selectedNotification.set(null); }

  // =========================================================================
  // 🌟 جلب البيانات من قاعدة البيانات (الداتا بيز)
  // =========================================================================
  fetchTargetAudienceData(): void {
    this.isLoadingData.set(true);
    
    // 1. جلب الشركات
    this.api.getCompanies().subscribe({
      next: (res: any) => {
        const items = Array.isArray(res) ? res : (res?.items || res?.data || []);
        const mappedCompanies = items.map((c: any) => ({
          id: String(c.companyId || c.id || c.CompanyId || c.Id),
          name: c.companyName || c.name || c.CompanyName || c.Name || 'شركة غير مسماة',
          workField: c.workField || c.WorkField || 'غير محدد',
          capacity: c.capacity || c.Capacity || 0,
          commercialRegister: c.commercialRegister || c.CommercialRegister || 'غير متوفر'
        }));
        this.dbCompanies.set(mappedCompanies);
      },
      error: () => this.dbCompanies.set([])
    });

    // 2. جلب المتدربين
    this.api.getTrainees({ pageSize: 10000 }).subscribe({
      next: (res: any) => {
        const items = Array.isArray(res) ? res : (res?.items || res?.data || []);
        const mappedTrainees = items.map((t: any) => {
          const name = t.fullName || t.FullName || t.name || t.Name || 'اسم غير متوفر';
          const code = t.registrationNumber || t.RegistrationNumber || t.code || t.Code || 'N/A';
          
          let track = t.trackName || t.TrackName || t.track?.name || t.Track?.Name || t.specialty || t.programName || 'غير محدد';
          let companyName = t.companyName || t.CompanyName || t.company?.name || t.Company?.Name || 'غير محدد';
          let batch = t.batchName || t.BatchName || t.batch?.name || t.Batch?.Name || 'غير محدد';

          return {
            id: String(t.traineeId || t.id || t.TraineeId || t.Id),
            name: name,
            code: code,
            track: track,
            companyName: companyName,
            batch: batch
          };
        });
        this.dbTrainees.set(mappedTrainees);
      },
      error: () => this.dbTrainees.set([])
    });

    // 3. جلب المدربين
    this.api.getTrainers({ pageSize: 10000 }).subscribe({
      next: (res: any) => {
        const items = Array.isArray(res) ? res : (res?.items || res?.data || []);
        const mappedTrainers = items.map((tr: any) => ({
          id: String(tr.trainerId || tr.id || tr.TrainerId || tr.Id),
          name: tr.fullName || tr.name || tr.FullName || tr.Name || 'اسم غير متوفر',
          specialty: tr.specialty || tr.Specialty || tr.trackName || 'غير محدد'
        }));
        this.dbTrainers.set(mappedTrainers);
        this.isLoadingData.set(false);
      },
      error: () => {
        this.dbTrainers.set([]);
        this.isLoadingData.set(false);
      }
    });
  }

  // =========================================================================
  // منطق النافذة المنبثقة (إعلان جديد)
  // =========================================================================
  openAnnounceModal(): void {
    this.newAnnounceData = {
      title: '', priority: 'normal', content: '', mainAudience: 'all',
      companyScope: 'all_companies', selectedCompanyIds: [],
      traineeScope: 'all_trainees', selectedTraineeIds: [],
      trainerScope: 'all_trainers', selectedTrainerIds: [],
      channels: { inApp: true, email: true, sms: false },
      isPinned: false
    };
    this.resetCompanyFilters();
    this.resetTraineeFilters();
    this.trainerSearch = '';
    this.activeAnnounceTab = 'edit';
    this.announceError.set(null);
    
    this.fetchTargetAudienceData(); 
    
    this.showAnnounce.set(true);
  }

  closeAnnounceModal(): void {
    if (this.posting()) return;
    this.showAnnounce.set(false);
  }

  expectedReach = computed(() => {
    const fd = this.newAnnounceData;
    if (fd.mainAudience === 'all') return 18500;
    if (fd.mainAudience === 'admins') return 45;
    if (fd.mainAudience === 'trainers') return fd.trainerScope === 'all_trainers' ? this.dbTrainers().length : fd.selectedTrainerIds.length;
    if (fd.mainAudience === 'companies') {
      if (fd.companyScope === 'all_companies') return this.dbCompanies().length;
      return this.dbCompanies().filter(c => fd.selectedCompanyIds.includes(c.id)).reduce((sum, c) => sum + (c.capacity || 0), 0);
    }
    if (fd.mainAudience === 'trainees') return fd.traineeScope === 'all_trainees' ? this.dbTrainees().length : fd.selectedTraineeIds.length;
    return 0;
  });

  setAudience(aud: MainAudienceType) {
    this.newAnnounceData.mainAudience = aud;
    this.newAnnounceData.selectedCompanyIds = [];
    this.newAnnounceData.selectedTraineeIds = [];
    this.newAnnounceData.selectedTrainerIds = [];
  }

  // =========================================================================
  // 🌟 دوال التصفية الذكية والاختيار
  // =========================================================================

  // --- الشركات ---
  getFilteredCompanies() {
    return this.dbCompanies().filter(c => {
      const term = this.companySearch.toLowerCase();
      const matchesSearch = !term || 
        c.name.toLowerCase().includes(term) || 
        c.commercialRegister.toLowerCase().includes(term);

      const matchesWorkField = !this.companyFilterWorkField || c.workField === this.companyFilterWorkField;

      let matchesCapacity = true;
      if (this.companyFilterCapacity === 'high') matchesCapacity = c.capacity >= 100;
      else if (this.companyFilterCapacity === 'medium') matchesCapacity = c.capacity >= 50 && c.capacity < 100;
      else if (this.companyFilterCapacity === 'low') matchesCapacity = c.capacity < 50;

      return matchesSearch && matchesWorkField && matchesCapacity;
    });
  }
  getUniqueCompanyWorkFields() { return [...new Set(this.dbCompanies().map(c => c.workField))].filter(Boolean); }
  resetCompanyFilters() { this.companySearch = ''; this.companyFilterWorkField = ''; this.companyFilterCapacity = ''; }
  
  toggleCompany(id: string) {
    const ids = this.newAnnounceData.selectedCompanyIds;
    this.newAnnounceData.selectedCompanyIds = ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id];
  }
  isCompanySelected(id: string) { return this.newAnnounceData.selectedCompanyIds.includes(id); }
  getSelectedCompanyObjects() { return this.dbCompanies().filter(c => this.newAnnounceData.selectedCompanyIds.includes(c.id)); }
  
  selectAllCompanies(event: any) {
    const filtered = this.getFilteredCompanies();
    if (event.target.checked) {
      const newIds = new Set([...this.newAnnounceData.selectedCompanyIds, ...filtered.map(c => c.id)]);
      this.newAnnounceData.selectedCompanyIds = Array.from(newIds);
    } else {
      const filteredIds = filtered.map(c => c.id);
      this.newAnnounceData.selectedCompanyIds = this.newAnnounceData.selectedCompanyIds.filter(id => !filteredIds.includes(id));
    }
  }

  // --- المتدربين ---
  getFilteredTrainees() {
    return this.dbTrainees().filter(t => {
      const term = this.traineeSearch.toLowerCase();
      const matchesSearch = !term || 
        t.name.toLowerCase().includes(term) || 
        t.code.toLowerCase().includes(term) ||
        t.track.toLowerCase().includes(term) ||
        t.companyName.toLowerCase().includes(term);

      const matchesTrack = !this.traineeFilterTrack || t.track === this.traineeFilterTrack;
      const matchesBatch = !this.traineeFilterBatch || t.batch === this.traineeFilterBatch;
      const matchesCompany = !this.traineeFilterCompany || t.companyName === this.traineeFilterCompany;

      return matchesSearch && matchesTrack && matchesBatch && matchesCompany;
    });
  }
  toggleTrainee(id: string) {
    const ids = this.newAnnounceData.selectedTraineeIds;
    this.newAnnounceData.selectedTraineeIds = ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id];
  }
  isTraineeSelected(id: string) { return this.newAnnounceData.selectedTraineeIds.includes(id); }
  getSelectedTraineeObjects() { return this.dbTrainees().filter(t => this.newAnnounceData.selectedTraineeIds.includes(t.id)); }
  selectAllTrainees(event: any) {
    const filtered = this.getFilteredTrainees();
    if (event.target.checked) {
      const newIds = new Set([...this.newAnnounceData.selectedTraineeIds, ...filtered.map(t => t.id)]);
      this.newAnnounceData.selectedTraineeIds = Array.from(newIds);
    } else {
      const filteredIds = filtered.map(t => t.id);
      this.newAnnounceData.selectedTraineeIds = this.newAnnounceData.selectedTraineeIds.filter(id => !filteredIds.includes(id));
    }
  }
  resetTraineeFilters() { this.traineeSearch = ''; this.traineeFilterTrack = ''; this.traineeFilterBatch = ''; this.traineeFilterCompany = ''; }
  getUniqueTracks() { return [...new Set(this.dbTrainees().map(t => t.track))].filter(Boolean); }
  getUniqueBatches() { return [...new Set(this.dbTrainees().map(t => t.batch))].filter(Boolean); }
  getUniqueTraineeCompanies() { return [...new Set(this.dbTrainees().map(t => t.companyName))].filter(Boolean); }

  // --- المدربين ---
  getFilteredTrainers() {
    const list = this.dbTrainers();
    if (!this.trainerSearch) return list;
    const term = this.trainerSearch.toLowerCase();
    return list.filter(t => t.name.toLowerCase().includes(term) || t.specialty.toLowerCase().includes(term));
  }
  toggleTrainer(id: string) {
    const ids = this.newAnnounceData.selectedTrainerIds;
    this.newAnnounceData.selectedTrainerIds = ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id];
  }
  isTrainerSelected(id: string) { return this.newAnnounceData.selectedTrainerIds.includes(id); }
  getSelectedTrainerObjects() { return this.dbTrainers().filter(t => this.newAnnounceData.selectedTrainerIds.includes(t.id)); }
  selectAllTrainers(event: any) {
    const filtered = this.getFilteredTrainers();
    if (event.target.checked) {
      const newIds = new Set([...this.newAnnounceData.selectedTrainerIds, ...filtered.map(t => t.id)]);
      this.newAnnounceData.selectedTrainerIds = Array.from(newIds);
    } else {
      const filteredIds = filtered.map(t => t.id);
      this.newAnnounceData.selectedTrainerIds = this.newAnnounceData.selectedTrainerIds.filter(id => !filteredIds.includes(id));
    }
  }

  // =========================================================================
  // نشر الإعلان وتصدير البيانات
  // =========================================================================
  postAnnouncement(): void {
    if (!this.newAnnounceData.title.trim() || !this.newAnnounceData.content.trim() || this.posting()) {
      alert('يرجى تعبئة الحقول الإلزامية (العنوان، الرسالة)');
      return;
    }

    const uid = this.auth?.userId || (this.auth as any)?.currentUser?.id || 1;
    this.posting.set(true);
    this.announceError.set(null);

    const scopeVal = this.newAnnounceData.mainAudience === 'companies' ? 1 : 
                     this.newAnnounceData.mainAudience === 'trainers' ? 2 : 
                     this.newAnnounceData.mainAudience === 'trainees' ? 3 : 0;

    const payload = {
      title: this.newAnnounceData.title.trim(),
      message: this.newAnnounceData.content.trim(),
      description: this.newAnnounceData.content.trim(),
      scopeType: scopeVal,
      targetScope: this.newAnnounceData.mainAudience,
      createdByUserId: uid,
      priority: this.newAnnounceData.priority, 
      createdAt: new Date().toISOString(),
      companyIds: this.newAnnounceData.selectedCompanyIds.map(id => Number(id)),
      traineeIds: this.newAnnounceData.selectedTraineeIds.map(id => Number(id)),
      trainerIds: this.newAnnounceData.selectedTrainerIds.map(id => Number(id)),
      channels: this.newAnnounceData.channels,
      isPinned: this.newAnnounceData.isPinned
    };

    this.api.createAnnouncement(payload as any).subscribe({
      next: () => {
        this.posting.set(false);
        this.showAnnounce.set(false);
        this.showToast('تم نشر الإعلان بنجاح في قاعدة البيانات.');
        this.load();
      },
      error: (err: any) => {
        const isSuccessStatus = err?.status === 200 || err?.status === 201 || err?.status === 204;
        const isParsingError = typeof err?.message === 'string' && err.message.includes('Http failure during parsing');
        
        if (isSuccessStatus || isParsingError) {
          this.posting.set(false);
          this.showAnnounce.set(false);
          this.showToast('تم نشر الإعلان بنجاح.');
          this.load();
          return;
        }

        this.posting.set(false);
        this.announceError.set(err?.error?.message || err?.message || 'تعذر نشر الإعلان.');
      },
    });
  }

  exportAll(): void {
    const rows = this.filteredNotifications();
    if (!rows.length) { this.showToast('لا توجد إشعارات مطابقة للتصدير.'); return; }
    const header = ['رقم الإشعار', 'العنوان', 'الرسالة', 'التصنيف', 'الأهمية', 'الحالة', 'المصدر', 'التاريخ'];
    const lines = rows.map((n) => [n.notificationId, n.title, n.message, this.getCategoryLabel(n.category), n.priority === 'urgent' ? 'عاجل' : n.priority === 'high' ? 'هام' : 'عادي', n.isRead ? 'مقروء' : 'غير مقروء', n.source, n.dateLabel].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const blob = new Blob(['\uFEFF' + [header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `إشعارات_منصة_نفاذ_${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
    this.showToast('تم تصدير ملف الإشعارات بنجاح.');
  }

  getCategoryLabel(category?: string): string {
    switch (category) {
      case 'announcement': return 'إعلان نظامي';
      case 'alert': return 'تنبيه إداري';
      case 'company': return 'شؤون الشركات';
      case 'evaluation': return 'تقييمات وتدريب';
      default: return 'إشعار عام';
    }
  }

  getScopeLabel(scope?: string): string {
    switch (scope) {
      case 'companies': return 'الشركات المستضيفة';
      case 'trainers': return 'المدربين';
      case 'trainees': return 'المتدربين';
      default: return 'كافة المستخدمين';
    }
  }

  trackById(_: number, item: NotificationViewModel): number { return item.notificationId; }

  timeAgo(value?: string | Date): string {
    if (!value) return 'وقت غير محدد';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    const diff = Math.max(0, Date.now() - date.getTime());
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'منذ لحظات';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'أمس';
    if (days < 30) return `منذ ${days} يوم`;
    return date.toLocaleDateString('ar-OM');
  }

  private showToast(msg: string): void {
    this.toastMessage.set(msg);
    setTimeout(() => { this.toastMessage.set(null); }, 3500);
  }
}