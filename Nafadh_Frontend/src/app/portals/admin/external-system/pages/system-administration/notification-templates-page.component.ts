
import {
  Component,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AdminSystemApiService } from '../../legacy/core/api/services/admin-system-api.service';
import type { NotificationTemplateListItemDto } from '../../legacy/core/api/models/admin-system.models';
import { AnnouncementApiService } from '../../legacy/core/api/services/announcement-api.service';
import type {
  AnnouncementDto,
  AnnouncementScopeType,
} from '../../legacy/core/api/services/announcement-api.service';
import { AuthService } from '../../../../../core/auth/auth.service';

type ScopeName = 'Platform' | 'Company' | 'Batch';
type PageSize = 5 | 10 | 15 | 20;
type ContentTab = 'templates' | 'announcements';

const ANNOUNCEMENT_SCOPE = {
  Platform: 'Platform',
  Company: 'Company',
  Batch: 'Batch',
} as const satisfies Record<string, ScopeName>;

const SCOPE_NUMBER: Record<ScopeName, number> = {
  Platform: 0,
  Company: 1,
  Batch: 2,
};

const SCOPE_BY_NUMBER: readonly ScopeName[] = [
  'Platform',
  'Company',
  'Batch',
];

const PAGE_SIZE_OPTIONS = [5, 10, 15, 20] as const;
const VISIBLE_PAGES = 5;

function normalizeScope(value: unknown): ScopeName | null {
  if (typeof value === 'number') {
    return SCOPE_BY_NUMBER[value] ?? null;
  }

  if (typeof value === 'string') {
    if (value in SCOPE_NUMBER) {
      return value as ScopeName;
    }

    const numeric = Number(value);

    if (Number.isInteger(numeric)) {
      return SCOPE_BY_NUMBER[numeric] ?? null;
    }
  }

  return null;
}

function pageWindow(total: number, current: number): number[] {
  let start = Math.max(0, current - Math.floor(VISIBLE_PAGES / 2));
  const end = Math.min(total, start + VISIBLE_PAGES);
  start = Math.max(0, end - VISIBLE_PAGES);

  return Array.from({ length: end - start }, (_, i) => start + i);
}

export interface NotificationTemplate {
  id: number;
  code: string;
  name: string;
  type: 'SMS' | 'Email' | 'Push';
  subject?: string;
  body: string;
  isActive: boolean;
  hasEmail: boolean;
  hasSms: boolean;
}

interface AnnouncementViewModel {
  id: number;
  message: string;
  scopeType: ScopeName | null;
  scopeId: number | null;
  date: Date | string;
  createdByUserId: number;
}

@Component({
  selector: 'app-notification-templates-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notification-templates-page.component.html',
  styleUrl: './notification-templates-page.component.css',
})
export class NotificationTemplatesPageComponent {
  private readonly api = inject(AdminSystemApiService);
  private readonly announcementApi = inject(AnnouncementApiService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly ScopeType = ANNOUNCEMENT_SCOPE;
  readonly activeTab = signal<ContentTab>('templates');

  // Notification templates
  readonly searchTerm = signal('');
  readonly selectedType = signal('');
  readonly templates = signal<NotificationTemplate[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal('');
  readonly errorRetryable = signal(false);
  readonly totalCount = signal(0);

  openMenuId: number | null = null;

  readonly pageSize = signal<PageSize>(5);
  readonly pageIndex = signal(0);
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  // Announcements
  readonly announcementSearchTerm = signal('');
  readonly announcements = signal<AnnouncementViewModel[]>([]);
  readonly announcementsLoading = signal(false);
  readonly announcementsError = signal('');

  readonly announcementPageSize = signal<PageSize>(5);
  readonly announcementPageIndex = signal(0);

  readonly announcementMessage = signal('');
  readonly announcementScopeType = signal<ScopeName>(
    ANNOUNCEMENT_SCOPE.Platform,
  );
  readonly announcementScopeId = signal<number | null>(null);

  readonly editingAnnouncementId = signal<number | null>(null);
  readonly savingAnnouncement = signal(false);
  readonly announcementFormError = signal('');
  readonly announcementSuccessMessage = signal('');

  readonly announcementScopeOptions: {
    value: ScopeName;
    label: string;
  }[] = [
    { value: ANNOUNCEMENT_SCOPE.Platform, label: 'المنصة' },
    { value: ANNOUNCEMENT_SCOPE.Company, label: 'الشركة' },
    { value: ANNOUNCEMENT_SCOPE.Batch, label: 'الدفعة' },
  ];

  // Template filters and pagination
  readonly hasActiveFilters = computed(
    () => this.searchTerm().trim() !== '' || this.selectedType() !== '',
  );

  readonly filteredTemplates = computed(() => {
    const type = this.selectedType();
    const rows = this.templates();

    if (!type) return rows;

    return rows.filter((template) => {
      if (type === 'Email') return template.hasEmail;
      if (type === 'SMS') return template.hasSms;
      if (type === 'Push') return template.type === 'Push';
      return true;
    });
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.totalCount() / this.pageSize())),
  );

  readonly safePageIndex = computed(() =>
    Math.min(this.pageIndex(), this.totalPages() - 1),
  );

  readonly canPrev = computed(() => this.safePageIndex() > 0);

  readonly canNext = computed(
    () => this.safePageIndex() < this.totalPages() - 1,
  );

  readonly pageNumbers = computed(() =>
    pageWindow(this.totalPages(), this.safePageIndex()),
  );

  readonly visiblePages = computed(() =>
    pageWindow(this.totalPages(), this.safePageIndex()),
  );

  readonly paginatedTemplates = computed(() => this.filteredTemplates());

  // Announcement filters and pagination
  readonly filteredAnnouncements = computed(() => {
    const term = this.announcementSearchTerm().trim().toLowerCase();

    if (!term) return this.announcements();

    return this.announcements().filter((announcement) =>
      announcement.message.toLowerCase().includes(term),
    );
  });

  readonly announcementTotalCount = computed(
    () => this.filteredAnnouncements().length,
  );

  readonly announcementTotalPages = computed(() =>
    Math.max(
      1,
      Math.ceil(
        this.announcementTotalCount() / this.announcementPageSize(),
      ),
    ),
  );

  readonly safeAnnouncementPageIndex = computed(() =>
    Math.min(
      this.announcementPageIndex(),
      this.announcementTotalPages() - 1,
    ),
  );

  readonly canPrevAnnouncements = computed(
    () => this.safeAnnouncementPageIndex() > 0,
  );

  readonly canNextAnnouncements = computed(
    () =>
      this.safeAnnouncementPageIndex() <
      this.announcementTotalPages() - 1,
  );

  readonly announcementPageNumbers = computed(() =>
    pageWindow(
      this.announcementTotalPages(),
      this.safeAnnouncementPageIndex(),
    ),
  );

  readonly visibleAnnouncementPages = computed(() =>
    pageWindow(
      this.announcementTotalPages(),
      this.safeAnnouncementPageIndex(),
    ),
  );

  readonly paginatedAnnouncements = computed(() => {
    const start =
      this.safeAnnouncementPageIndex() * this.announcementPageSize();

    return this.filteredAnnouncements().slice(
      start,
      start + this.announcementPageSize(),
    );
  });

  constructor() {
    this.loadTemplates();
    this.loadAnnouncements();
  }

  setActiveTab(tab: ContentTab): void {
    this.activeTab.set(tab);
    this.closeMenu();
  }

  // Templates
  loadTemplates(): void {
    this.loading.set(true);
    this.errorMessage.set('');
    this.errorRetryable.set(false);

    this.api
      .getNotificationTemplatesPage({
        pageIndex: this.pageIndex(),
        pageSize: this.pageSize(),
        q: this.searchTerm().trim(),
      })
      .subscribe({
        next: (page) => {
          const rows = page.rows ?? [];

          this.templates.set(rows.map((dto) => this.mapTemplate(dto)));
          this.totalCount.set(page.total ?? rows.length);
          this.loading.set(false);

          if (
            this.pageIndex() >= this.totalPages() &&
            this.pageIndex() > 0
          ) {
            this.pageIndex.set(this.totalPages() - 1);
            this.loadTemplates();
          }
        },
        error: (error: unknown) => {
          console.error('Failed to load notification templates:', error);
          this.errorMessage.set(
            'تعذر تحميل قوالب الإشعارات. يرجى المحاولة مرة أخرى.',
          );
          this.errorRetryable.set(true);
          this.loading.set(false);
        },
      });
  }

  private mapTemplate(
    dto: NotificationTemplateListItemDto,
  ): NotificationTemplate {
    return {
      id: dto.Id,
      code: dto.ActionCode,
      name: dto.LabelAr || dto.LabelEn || dto.ActionCode,
      type: dto.EmailEnabled ? 'Email' : 'SMS',
      body: '',
      isActive: dto.IsActive,
      hasEmail: dto.EmailEnabled,
      hasSms: dto.SmsEnabled,
    };
  }

  getEndIndex(): number {
    return Math.min(
      this.totalCount(),
      (this.safePageIndex() + 1) * this.pageSize(),
    );
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.pageIndex.set(0);
    this.closeMenu();
    this.loadTemplates();
  }

  onTypeChange(value: string): void {
    this.selectedType.set(value);
    this.pageIndex.set(0);
    this.closeMenu();
  }

  clearFilters(): void {
    const searchChanged = this.searchTerm().trim() !== '';

    this.searchTerm.set('');
    this.selectedType.set('');
    this.pageIndex.set(0);
    this.closeMenu();

    if (searchChanged) this.loadTemplates();
  }

  dismissError(): void {
    this.errorMessage.set('');
    this.errorRetryable.set(false);
  }

  onPageSizeChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);

    if (PAGE_SIZE_OPTIONS.includes(value as PageSize)) {
      this.pageSize.set(value as PageSize);
      this.pageIndex.set(0);
      this.loadTemplates();
    }
  }

  setPage(page: number): void {
    if (page >= 0 && page < this.totalPages()) {
      this.pageIndex.set(page);
      this.closeMenu();
      this.loadTemplates();
    }
  }

  nextPage(): void {
    if (this.canNext()) {
      this.pageIndex.update((page) => page + 1);
      this.closeMenu();
      this.loadTemplates();
    }
  }

  prevPage(): void {
    if (this.canPrev()) {
      this.pageIndex.update((page) => page - 1);
      this.closeMenu();
      this.loadTemplates();
    }
  }

  retryLoading(): void {
    this.loadTemplates();
  }

  toggleMenu(id: number, event: Event): void {
    event.stopPropagation();
    this.openMenuId = this.openMenuId === id ? null : id;
  }

  @HostListener('document:click')
  @HostListener('document:keydown.escape')
  closeMenu(): void {
    this.openMenuId = null;
  }

  editTemplate(template: NotificationTemplate): void {
    this.closeMenu();

    this.router.navigate(
      ['/admin/external-system/notification-templates', template.code],
      {
        state: {
          template: {
            id: template.id,
            code: template.code,
            name: template.name,
            active: template.isActive,
            email: template.hasEmail,
            sms: template.hasSms,
          },
        },
      },
    );
  }

  deleteTemplate(id: number): void {
    this.closeMenu();
    this.errorMessage.set(
      `حذف القالب رقم ${id} غير متاح حاليًا؛ لا توجد عملية حذف معرفة في خدمة الـ API.`,
    );
    this.errorRetryable.set(false);
  }

  // Announcements
  loadAnnouncements(): void {
    this.announcementsLoading.set(true);
    this.announcementsError.set('');

    this.announcementApi.getAll().subscribe({
      next: (rows: AnnouncementDto[]) => {
        const mapped = rows
          .map((dto) => this.mapAnnouncement(dto))
          .sort(
            (a, b) =>
              new Date(b.date).getTime() - new Date(a.date).getTime() ||
              b.id - a.id,
          );

        this.announcements.set(mapped);
        this.announcementsLoading.set(false);

        if (
          this.announcementPageIndex() >= this.announcementTotalPages()
        ) {
          this.announcementPageIndex.set(
            Math.max(0, this.announcementTotalPages() - 1),
          );
        }
      },
      error: (error: unknown) => {
        console.error('Failed to load announcements:', error);
        this.announcementsError.set(
          'تعذر تحميل الإعلانات. يرجى المحاولة مرة أخرى.',
        );
        this.announcementsLoading.set(false);
      },
    });
  }

  private mapAnnouncement(
    dto: AnnouncementDto,
  ): AnnouncementViewModel {
    return {
      id: dto.announcementId,
      message: dto.message,
      scopeType: normalizeScope(dto.scopeType),
      scopeId: dto.scopeId ?? null,
      date: dto.date,
      createdByUserId: dto.createdByUserId,
    };
  }

  onAnnouncementSearchChange(value: string): void {
    this.announcementSearchTerm.set(value);
    this.announcementPageIndex.set(0);
    this.closeMenu();
  }

  clearAnnouncementSearch(): void {
    this.announcementSearchTerm.set('');
    this.announcementPageIndex.set(0);
    this.closeMenu();
  }

  onAnnouncementPageSizeChange(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);

    if (PAGE_SIZE_OPTIONS.includes(value as PageSize)) {
      this.announcementPageSize.set(value as PageSize);
      this.announcementPageIndex.set(0);
    }
  }

  setAnnouncementPage(page: number): void {
    if (page >= 0 && page < this.announcementTotalPages()) {
      this.announcementPageIndex.set(page);
      this.closeMenu();
    }
  }

  nextAnnouncementPage(): void {
    if (this.canNextAnnouncements()) {
      this.announcementPageIndex.update((page) => page + 1);
      this.closeMenu();
    }
  }

  prevAnnouncementPage(): void {
    if (this.canPrevAnnouncements()) {
      this.announcementPageIndex.update((page) => page - 1);
      this.closeMenu();
    }
  }

  getAnnouncementEndIndex(): number {
    return Math.min(
      this.announcementTotalCount(),
      (this.safeAnnouncementPageIndex() + 1) *
        this.announcementPageSize(),
    );
  }

  getScopeLabel(scopeType: ScopeName | null): string {
    switch (scopeType) {
      case ANNOUNCEMENT_SCOPE.Platform:
        return 'المنصة';
      case ANNOUNCEMENT_SCOPE.Company:
        return 'الشركة';
      case ANNOUNCEMENT_SCOPE.Batch:
        return 'الدفعة';
      default:
        return 'غير محدد';
    }
  }

  resetAnnouncementForm(): void {
    this.editingAnnouncementId.set(null);
    this.announcementMessage.set('');
    this.announcementScopeType.set(ANNOUNCEMENT_SCOPE.Platform);
    this.announcementScopeId.set(null);
    this.announcementFormError.set('');
    this.announcementSuccessMessage.set('');
  }

  editAnnouncement(announcement: AnnouncementViewModel): void {
    this.editingAnnouncementId.set(announcement.id);
    this.announcementMessage.set(announcement.message);
    this.announcementScopeType.set(
      announcement.scopeType ?? ANNOUNCEMENT_SCOPE.Platform,
    );
    this.announcementScopeId.set(announcement.scopeId);
    this.announcementFormError.set('');
    this.announcementSuccessMessage.set('');
    this.closeMenu();

    // النموذج أصبح بجانب الجدول؛ لا حاجة إلى تمرير الصفحة.
    // preventScroll يحافظ على موضع العرض الحالي عند التركيز.
    document.getElementById('announcementMessage')?.focus({
      preventScroll: true,
    });
  }

  onAnnouncementScopeChange(value: ScopeName): void {
    this.announcementScopeType.set(value);

    if (value === ANNOUNCEMENT_SCOPE.Platform) {
      this.announcementScopeId.set(null);
    }
  }

  onAnnouncementScopeIdChange(value: string | number): void {
    const parsed = Number(value);

    this.announcementScopeId.set(
      Number.isFinite(parsed) && parsed > 0 ? parsed : null,
    );
  }

  private toApiScope(scope: ScopeName): AnnouncementScopeType {
    return SCOPE_NUMBER[scope] as unknown as AnnouncementScopeType;
  }

  saveAnnouncement(): void {
    const message = this.announcementMessage().trim();
    const scopeType = this.announcementScopeType();
    const scopeId = this.announcementScopeId();

    this.announcementFormError.set('');
    this.announcementSuccessMessage.set('');

    if (this.savingAnnouncement()) return;

    if (!message) {
      this.announcementFormError.set('يرجى إدخال نص الإعلان.');
      return;
    }

    if (
      scopeType !== ANNOUNCEMENT_SCOPE.Platform &&
      (!scopeId || scopeId <= 0)
    ) {
      this.announcementFormError.set('يرجى إدخال رقم الشركة أو الدفعة.');
      return;
    }

    const userId = this.authService.userId;

    if (this.editingAnnouncementId() === null && !userId) {
      this.announcementFormError.set(
        'تعذر تحديد المستخدم الحالي. يرجى تسجيل الدخول مرة أخرى.',
      );
      return;
    }

    const normalizedScopeId =
      scopeType === ANNOUNCEMENT_SCOPE.Platform ? null : scopeId;

    this.savingAnnouncement.set(true);

    if (this.editingAnnouncementId() !== null) {
      const id = this.editingAnnouncementId()!;

      this.announcementApi
        .update(id, {
          scopeType: this.toApiScope(scopeType),
          scopeId: normalizedScopeId,
          message,
        })
        .subscribe({
          next: () => {
            this.savingAnnouncement.set(false);
            this.announcementSuccessMessage.set(
              'تم تحديث الإعلان بنجاح.',
            );
            this.resetAnnouncementAfterSave();
            this.loadAnnouncements();
          },
          error: (error: unknown) => {
            console.error('Failed to update announcement:', error);
            this.savingAnnouncement.set(false);
            this.announcementFormError.set(
              'تعذر تحديث الإعلان. يرجى التحقق من البيانات والمحاولة مرة أخرى.',
            );
          },
        });

      return;
    }

    this.announcementApi
      .create({
        scopeType: this.toApiScope(scopeType),
        scopeId: normalizedScopeId,
        message,
        createdByUserId: userId!,
      })
      .subscribe({
        next: () => {
          this.savingAnnouncement.set(false);
          this.announcementSuccessMessage.set('تمت إضافة الإعلان بنجاح.');
          this.resetAnnouncementAfterSave();
          this.announcementPageIndex.set(0);
          this.loadAnnouncements();
        },
        error: (error: unknown) => {
          console.error('Failed to create announcement:', error);
          this.savingAnnouncement.set(false);
          this.announcementFormError.set(
            'تعذر إضافة الإعلان. يرجى التحقق من البيانات والمحاولة مرة أخرى.',
          );
        },
      });
  }

  private resetAnnouncementAfterSave(): void {
    this.editingAnnouncementId.set(null);
    this.announcementMessage.set('');
    this.announcementScopeType.set(ANNOUNCEMENT_SCOPE.Platform);
    this.announcementScopeId.set(null);
  }

  deleteAnnouncement(id: number): void {
    this.closeMenu();

    const confirmed = window.confirm('هل أنت متأكد من حذف هذا الإعلان؟');
    if (!confirmed) return;

    this.announcementApi.delete(id).subscribe({
      next: () => {
        this.announcementSuccessMessage.set('تم حذف الإعلان بنجاح.');
        this.loadAnnouncements();
      },
      error: (error: unknown) => {
        console.error('Failed to delete announcement:', error);
        this.announcementsError.set(
          'تعذر حذف الإعلان. يرجى المحاولة مرة أخرى.',
        );
      },
    });
  }

  retryAnnouncementsLoading(): void {
    this.loadAnnouncements();
  }
}
