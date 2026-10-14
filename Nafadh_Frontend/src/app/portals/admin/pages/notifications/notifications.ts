import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../services/admin-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { AnnouncementDto } from '../../../../core/models/dtos';

export type NotificationFilter = 'all' | 'unread' | 'announcement' | 'alert' | 'company';
export type NotificationPriority = 'all' | 'urgent' | 'high' | 'normal';

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

// دالة تطبيع النصوص العربية لدعم البحث الدقيق بمختلف أشكال الهمزات والتاء
export function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/[ة]/g, 'ه')
    .replace(/[ى]/g, 'ي')
    .replace(/[ًٌٍَُِّْـ]/g, '');
}

// دالة تطبيع مستوى الأهمية للربط الدقيق مع قيم الباك إند (سواء نصوص، أرقام Enum 0,1,2، أو نصوص عربية)
export function normalizePriority(val: any): 'urgent' | 'high' | 'normal' {
  if (val === null || val === undefined) return 'normal';
  const s = String(val).trim().toLowerCase();
  if (s === '2' || s === 'urgent' || s.includes('عاجل')) return 'urgent';
  if (s === '1' || s === 'high' || s === 'important' || s.includes('هام') || s.includes('مهم')) return 'high';
  return 'normal';
}

// دالة تطبيع التصنيف
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

  // إشارات الحالة لجلب البيانات من قاعدة البيانات
  rawNotifications = signal<AnnouncementDto[]>([]);
  activeFilter = signal<NotificationFilter>('all');
  
  // فلترة مستويات الأهمية
  priorityFilter: NotificationPriority = 'all';
  priorityFilterSignal = signal<NotificationPriority>('all');
  
  searchQuery = '';
  searchQuerySignal = signal<string>('');
  loading = signal<boolean>(false);
  error = signal<string | null>(null);

  // بيانات نافذة إعلان جديد
  showAnnounce = signal<boolean>(false);
  announceTitle = '';
  announceMsg = '';
  announcePriority: 'normal' | 'high' | 'urgent' = 'normal';
  announceScope: 'all' | 'companies' | 'trainers' | 'trainees' = 'all';
  posting = signal<boolean>(false);
  announceError = signal<string | null>(null);

  // نافذة التفاصيل ورسالة التنبيه
  selectedNotification = signal<NotificationViewModel | null>(null);
  toastMessage = signal<string | null>(null);

  // استرجاع الإشعارات المقروءة المحفوظة
  private readIds(): number[] {
    try {
      return JSON.parse(localStorage.getItem('admin_read_announcements') || '[]');
    } catch {
      return [];
    }
  }

  // تحويل البيانات القادمة من قاعدة البيانات إلى واجهة العرض مباشرة
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

      return {
        notificationId: id,
        title,
        message,
        category: cat,
        priority: prio,
        targetScope,
        isRead,
        createdAt: rawDate,
        dateLabel: this.timeAgo(rawDate),
        source
      };
    });
  });

  // إحصائيات العدادات العلوية
  stats = computed(() => {
    const list = this.viewModels();
    return {
      total: list.length,
      unread: list.filter((i) => !i.isRead).length,
      urgent: list.filter((i) => i.priority === 'urgent' || i.priority === 'high').length,
      announcements: list.filter((i) => i.category === 'announcement').length
    };
  });

  // عدد غير المقروءة
  unreadCount = computed(() => this.stats().unread);

  // القائمة المفلترة وفقاً للتبويب، البحث، ومستوى الأهمية المفعل
  filteredNotifications = computed<NotificationViewModel[]>(() => {
    const tab = this.activeFilter();
    const prio = this.priorityFilterSignal();
    const rawQuery = this.searchQuerySignal().trim();
    const query = normalizeArabic(rawQuery);

    return this.viewModels().filter((item) => {
      // 1. فلتر التبويب
      if (tab === 'unread' && item.isRead) return false;
      if (tab === 'announcement' && item.category !== 'announcement') return false;
      if (tab === 'alert' && item.category !== 'alert') return false;
      if (tab === 'company' && item.category !== 'company') return false;

      // 2. فلتر مستوى الأهمية
      if (prio !== 'all') {
        const itemPrio = normalizePriority(item.priority);
        if (itemPrio !== prio) return false;
      }

      // 3. البحث الذكي بالعربية
      if (query) {
        const normTitle = normalizeArabic(item.title);
        const normMsg = normalizeArabic(item.message);
        const normSrc = normalizeArabic(item.source);
        const normCat = normalizeArabic(this.getCategoryLabel(item.category));
        const prioText = item.priority === 'urgent' ? 'عاجل' : item.priority === 'high' ? 'هام' : 'عادي';
        const normPrio = normalizeArabic(prioText);

        const matches =
          normTitle.includes(query) ||
          normMsg.includes(query) ||
          normSrc.includes(query) ||
          normCat.includes(query) ||
          normPrio.includes(query);

        if (!matches) return false;
      }

      return true;
    });
  });

  ngOnInit(): void {
    this.load();
  }

  // جلب الإعلانات من الباك إند
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
      error: (err) => {
        console.error('Failed to load admin notifications.', err);
        this.error.set('تعذر تحميل الإشعارات من الخادم.');
        this.loading.set(false);
      },
    });
  }

  refresh(): void {
    this.load();
    this.showToast('تم تحديث قائمة الإشعارات بنجاح.');
  }

  setFilter(filter: NotificationFilter): void {
    this.activeFilter.set(filter);
  }

  onSearchChange(): void {
    this.searchQuerySignal.set(this.searchQuery);
  }

  // دالة تغيير مستوى الأهمية (عاجل / هام / عادي / الكل)
  onPriorityChange(newVal?: string): void {
    if (newVal) {
      this.priorityFilter = newVal as NotificationPriority;
    }
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
    if (item.isRead) {
      readIds = readIds.filter((id) => id !== item.notificationId);
    } else {
      if (!readIds.includes(item.notificationId)) readIds.push(item.notificationId);
    }
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
    this.rawNotifications.update((list) =>
      list.filter((n) => Number(n.announcementId ?? (n as any).id) !== id)
    );
    if (this.selectedNotification()?.notificationId === id) {
      this.selectedNotification.set(null);
    }
    this.showToast('تم حذف الإشعار بنجاح.');
  }

  openDetails(item: NotificationViewModel, event?: Event): void {
    event?.stopPropagation();
    this.markRead(item);
    this.selectedNotification.set(item);
  }

  closeDetails(): void {
    this.selectedNotification.set(null);
  }

  openAnnounceModal(): void {
    this.announceTitle = '';
    this.announceMsg = '';
    this.announcePriority = 'normal';
    this.announceScope = 'all';
    this.announceError.set(null);
    this.showAnnounce.set(true);
  }

  closeAnnounceModal(): void {
    this.showAnnounce.set(false);
  }

  // =========================================================================
  // نشر إعلان جديد في قاعدة البيانات (مع حل مشكلة النشر وخطأ Text/JSON Parsing)
  // =========================================================================
  postAnnouncement(): void {
    if (!this.announceMsg.trim() || this.posting()) return;

    const uid =
      this.auth?.userId ||
      (this.auth as any)?.currentUser?.id ||
      (this.auth as any)?.user?.id ||
      Number(localStorage.getItem('userId')) ||
      1;

    this.posting.set(true);
    this.announceError.set(null);

    const titleValue = this.announceTitle.trim() || 'إعلان نظامي عام';
    const msgValue = this.announceMsg.trim();
    const scopeVal = this.announceScope === 'companies' ? 1 : this.announceScope === 'trainers' ? 2 : 0;

    // تجهيز الـ Payload بدقة ليطابق كود الـ Backend DTO
    const payload = {
      title: titleValue,
      message: msgValue,
      description: msgValue,
      scopeType: scopeVal,
      targetScope: this.announceScope,
      scopeId: null,
      createdByUserId: uid,
      priority: this.announcePriority, // إرسال الأهمية المحددة: normal / high / urgent
      createdAt: new Date().toISOString(),
    };

    this.api.createAnnouncement(payload as any).subscribe({
      next: () => {
        this.posting.set(false);
        this.showAnnounce.set(false);
        this.announceTitle = '';
        this.announceMsg = '';
        this.showToast('تم نشر الإعلان بنجاح في قاعدة البيانات.');
        this.load();
      },
      error: (err: any) => {
        console.warn('Response info:', err);
        // حل سبب مشكلة النشر في الباك إند:
        // إذا كان السيرفر أرجع كود 200/201 ولكن الباك إند أعاد نصاً عادياً وليس JSON،
        // يعتبر أنجولار ذلك Parse Error بينما هو في الواقع نجح وحفظ في الداتابيز!
        const isSuccessStatus = err?.status === 200 || err?.status === 201 || err?.status === 204;
        const isParsingError = typeof err?.message === 'string' && err.message.includes('Http failure during parsing');
        const hasTextBody = err?.error && typeof err.error.text === 'string' && err.status === 200;

        if (isSuccessStatus || isParsingError || hasTextBody) {
          this.posting.set(false);
          this.showAnnounce.set(false);
          this.announceTitle = '';
          this.announceMsg = '';
          this.showToast('تم نشر الإعلان بنجاح في قاعدة البيانات.');
          this.load();
          return;
        }

        this.posting.set(false);
        this.announceError.set(
          err?.error?.message ||
          err?.error?.title ||
          err?.message ||
          'تعذر نشر الإعلان، يرجى التحقق من الاتصال بالخادم.'
        );
      },
    });
  }

  // تصدير الإشعارات إلى CSV
  exportAll(): void {
    const rows = this.filteredNotifications();
    if (!rows.length) {
      this.showToast('لا توجد إشعارات مطابقة للتصدير.');
      return;
    }

    const header = ['رقم الإشعار', 'العنوان', 'الرسالة', 'التصنيف', 'الأهمية', 'الحالة', 'المصدر', 'التاريخ'];
    const lines = rows.map((n) =>
      [
        n.notificationId,
        n.title,
        n.message,
        this.getCategoryLabel(n.category),
        n.priority === 'urgent' ? 'عاجل' : n.priority === 'high' ? 'هام' : 'عادي',
        n.isRead ? 'مقروء' : 'غير مقروء',
        n.source,
        n.dateLabel,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );

    const blob = new Blob(['\uFEFF' + [header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `إشعارات_منصة_نفاذ_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

  trackById(_: number, item: NotificationViewModel): number {
    return item.notificationId;
  }

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
    setTimeout(() => {
      this.toastMessage.set(null);
    }, 3500);
  }
}