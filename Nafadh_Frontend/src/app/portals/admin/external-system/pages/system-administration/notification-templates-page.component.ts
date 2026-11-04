import { CatalogPicker } from '../../../../../core/models/catalog-picker';
import { NafadhConstantsService } from '../../../../../core/services/nafadh-constants.service';

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
import { forkJoin } from 'rxjs';

import {
  NotificationTemplateApiService,
  type NotificationTemplateDto,
} from './notification-template-api.service';

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
  portalCode: string;
  type: 'Email';
  subject: string;
  body: string;
  isActive: boolean;
}

interface AnnouncementViewModel {
  id: number;
  message: string;
  scopeType: AnnouncementDto['scopeType'];
  editableScope: ScopeName | null;
  scopeId: number | null;
  date: Date | string;
  createdByUserId: number;
}

@Component({
  selector: 'app-notification-templates-page',
  standalone: true,
  imports: [CatalogPicker, CommonModule, FormsModule],
  templateUrl: './notification-templates-page.component.html',
  styleUrl: './notification-templates-page.component.css',
})
export class NotificationTemplatesPageComponent {
  readonly constants = inject(NafadhConstantsService);
  private readonly templateApi = inject(NotificationTemplateApiService);
  private readonly announcementApi = inject(AnnouncementApiService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly ScopeType = ANNOUNCEMENT_SCOPE;
  readonly activeTab = signal<ContentTab>('templates');

  // Notification templates
  readonly searchTerm = signal('');
  readonly selectedPortal = signal('');
  readonly templates = signal<NotificationTemplate[]>([]);

  readonly portalOptions = computed(() =>
    [
      ...new Set(
        this.templates()
          .map((template) => template.portalCode)
          .filter(Boolean),
      ),
    ].sort((a, b) => a.localeCompare(b)),
  );

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

  // Controls the visibility of the announcement form.
  readonly announcementFormVisible = signal(false);

  readonly announcementScopeOptions: {
    value: ScopeName;
    label: string;
  }[] = [
    { value: ANNOUNCEMENT_SCOPE.Platform, label: 'المنصة' },
    { value: ANNOUNCEMENT_SCOPE.Company, label: 'الشركة' },
    { value: ANNOUNCEMENT_SCOPE.Batch, label: 'الدفعة' },
  ];

  get scopeChoices() {
    return this.constants.supportedChoices(
      'NFD_ANN_SCOPE',
      this.announcementScopeOptions,
    );
  }

  // Template filters and pagination
  readonly hasActiveFilters = computed(
    () => this.searchTerm().trim() !== '' || this.selectedPortal() !== '',
  );

  readonly filteredTemplates = computed(() => {
    const term = this.searchTerm().trim().toLocaleLowerCase();
    const portal = this.selectedPortal();

    return this.templates().filter((template) => {
      const matchesTerm =
        !term ||
        template.name.toLocaleLowerCase().includes(term) ||
        template.code.toLocaleLowerCase().includes(term);

      const matchesPortal =
        !portal || template.portalCode === portal;

      return matchesTerm && matchesPortal;
    });
  });

  readonly totalPages = computed(() =>
    Math.max(
      1,
      Math.ceil(this.filteredTemplates().length / this.pageSize()),
    ),
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

  readonly paginatedTemplates = computed(() => {
    const start = this.safePageIndex() * this.pageSize();

    return this.filteredTemplates().slice(
      start,
      start + this.pageSize(),
    );
  });

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
        this.announcementTotalCount() /
          this.announcementPageSize(),
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
      this.safeAnnouncementPageIndex() *
      this.announcementPageSize();

    return this.filteredAnnouncements().slice(
      start,
      start + this.announcementPageSize(),
    );
  });

  constructor() {
    this.constants.ensure('NFD_ANN_SCOPE');
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

    this.templateApi.getAll().subscribe({
      next: (rows) => {
        this.templates.set(
          rows.map((dto) => this.mapTemplate(dto)),
        );

        this.totalCount.set(rows.length);
        this.pageIndex.set(0);
        this.loading.set(false);
      },

      error: (error: unknown) => {
        console.error(
          'Failed to load notification templates:',
          error,
        );

        this.errorMessage.set(
          'تعذر تحميل قوالب الإشعارات من قاعدة البيانات. يرجى المحاولة مرة أخرى.',
        );

        this.errorRetryable.set(true);
        this.loading.set(false);
      },
    });
  }

  private mapTemplate(
    dto: NotificationTemplateDto,
  ): NotificationTemplate {
    return {
      id: dto.id,
      code: dto.code,
      name: dto.name,
      portalCode: dto.portalCode,
      type: 'Email',
      subject: dto.subject ?? '',
      body: dto.body ?? '',
      isActive: dto.isActive,
    };
  }

  getEndIndex(): number {
    return Math.min(
      this.filteredTemplates().length,
      (this.safePageIndex() + 1) * this.pageSize(),
    );
  }

  onSearchChange(value: string): void {
    this.searchTerm.set(value);
    this.pageIndex.set(0);
    this.closeMenu();
  }

  onPortalChange(value: string): void {
    this.selectedPortal.set(value);
    this.pageIndex.set(0);
    this.closeMenu();
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedPortal.set('');
    this.pageIndex.set(0);
    this.closeMenu();
  }

  dismissError(): void {
    this.errorMessage.set('');
    this.errorRetryable.set(false);
  }

  onPageSizeChange(event: Event): void {
    const value = Number(
      (event.target as HTMLSelectElement).value,
    );

    if (PAGE_SIZE_OPTIONS.includes(value as PageSize)) {
      this.pageSize.set(value as PageSize);
      this.pageIndex.set(0);
    }
  }

  setPage(page: number): void {
    if (page >= 0 && page < this.totalPages()) {
      this.pageIndex.set(page);
      this.closeMenu();
    }
  }

  nextPage(): void {
    if (this.canNext()) {
      this.pageIndex.update((page) => page + 1);
      this.closeMenu();
    }
  }

  prevPage(): void {
    if (this.canPrev()) {
      this.pageIndex.update((page) => page - 1);
      this.closeMenu();
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

  createTemplate(): void {
    this.router.navigate([
      '/admin/external-system/notification-templates/new',
    ]);
  }

  editTemplate(template: NotificationTemplate): void {
    this.closeMenu();

    this.router.navigate([
      '/admin/external-system/notification-templates',
      template.id,
    ]);
  }

  deleteTemplate(id: number): void {
    this.closeMenu();

    this.errorMessage.set(
      `حذف القالب رقم ${id} غير متاح؛ لا توجد واجهة حذف في الـ Backend.`,
    );

    this.errorRetryable.set(false);
  }

  // Announcements
  loadAnnouncements(): void {
    this.announcementsLoading.set(true);
    this.announcementsError.set('');

    forkJoin({
      platform: this.announcementApi.getByScope(0),
      companies: this.announcementApi.getByScope(1),
      batches: this.announcementApi.getByScope(2),
    }).subscribe({
      next: ({ platform, companies, batches }) => {
        const uniqueAnnouncements = new Map<
          number,
          AnnouncementDto
        >();

        [...platform, ...companies, ...batches].forEach((dto) => {
          uniqueAnnouncements.set(dto.announcementId, dto);
        });

        const mapped = Array.from(uniqueAnnouncements.values())
          .map((dto) => this.mapAnnouncement(dto))
          .sort(
            (a, b) =>
              new Date(b.date).getTime() -
                new Date(a.date).getTime() ||
              b.id - a.id,
          );

        this.announcements.set(mapped);
        this.announcementsLoading.set(false);

        const lastPage = Math.max(
          0,
          this.announcementTotalPages() - 1,
        );

        this.announcementPageIndex.set(
          Math.min(this.announcementPageIndex(), lastPage),
        );

        console.log('Platform announcements:', platform.length);
        console.log('Company announcements:', companies.length);
        console.log('Batch announcements:', batches.length);
        console.log('Total unique announcements:', mapped.length);
      },

      error: (error: unknown) => {
        console.error(
          'Failed to load announcements by scope:',
          error,
        );

        this.announcementsError.set(
          'تعذر تحميل الإعلانات حسب النطاق. يرجى التحقق من استجابات الـ API.',
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
      scopeType: dto.scopeType,
      editableScope: normalizeScope(dto.scopeType),
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
    const value = Number(
      (event.target as HTMLSelectElement).value,
    );

    if (PAGE_SIZE_OPTIONS.includes(value as PageSize)) {
      this.announcementPageSize.set(value as PageSize);
      this.announcementPageIndex.set(0);
    }
  }

  setAnnouncementPage(page: number): void {
    if (
      page >= 0 &&
      page < this.announcementTotalPages()
    ) {
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

  getScopeLabel(scopeType: unknown): string {
    if (scopeType == null || String(scopeType).trim() === '') {
      return 'غير محدد';
    }

    const fallback = this.announcementScopeOptions.find(option => option.value === normalizeScope(scopeType))?.label;
    return this.constants.administrativeLabel('NFD_ANN_SCOPE', scopeType, fallback);
  }

  // Opens the form in Add mode and resets its values.
  resetAnnouncementForm(): void {
    if (this.savingAnnouncement()) return;

    this.editingAnnouncementId.set(null);
    this.announcementMessage.set('');
    this.announcementScopeType.set(
      ANNOUNCEMENT_SCOPE.Platform,
    );
    this.announcementScopeId.set(null);
    this.announcementFormError.set('');
    this.announcementSuccessMessage.set('');

    this.announcementFormVisible.set(true);

    this.scrollToAnnouncementForm();
  }

  // Closes the form without changing the announcement list.
  closeAnnouncementForm(): void {
    if (this.savingAnnouncement()) return;

    this.announcementFormVisible.set(false);
    this.editingAnnouncementId.set(null);
    this.announcementMessage.set('');
    this.announcementScopeType.set(
      ANNOUNCEMENT_SCOPE.Platform,
    );
    this.announcementScopeId.set(null);
    this.announcementFormError.set('');
    this.announcementSuccessMessage.set('');
  }

  // Opens the same form in Edit mode.
  editAnnouncement(
    announcement: AnnouncementViewModel,
  ): void {
    this.editingAnnouncementId.set(announcement.id);
    this.announcementMessage.set(announcement.message);

    this.announcementScopeType.set(
      announcement.editableScope ?? ANNOUNCEMENT_SCOPE.Platform,
    );

    this.announcementScopeId.set(announcement.scopeId);
    this.announcementFormError.set('');
    this.announcementSuccessMessage.set('');

    this.announcementFormVisible.set(true);
    this.closeMenu();

    this.scrollToAnnouncementForm();
  }

  private scrollToAnnouncementForm(): void {
    setTimeout(() => {
      document
        .getElementById('announcementFormCard')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });

      document
        .getElementById('announcementMessage')
        ?.focus({ preventScroll: true });
    });
  }

  onAnnouncementScopeChange(value: ScopeName): void {
    this.announcementScopeType.set(value);

    if (value === ANNOUNCEMENT_SCOPE.Platform) {
      this.announcementScopeId.set(null);
    }
  }

  onAnnouncementScopeIdChange(
    value: string | number,
  ): void {
    const parsed = Number(value);

    this.announcementScopeId.set(
      Number.isFinite(parsed) && parsed > 0
        ? parsed
        : null,
    );
  }

  private toApiScope(
    scope: ScopeName,
  ): AnnouncementScopeType {
    return SCOPE_NUMBER[scope] as unknown as AnnouncementScopeType;
  }

  saveAnnouncement(): void {
    const message = this.announcementMessage().trim();
    const scopeType = this.announcementScopeType();
    const scopeId = this.announcementScopeId();
    const editingId = this.editingAnnouncementId();
    const original =
      editingId === null
        ? null
        : this.announcements().find((row) => row.id === editingId);
    if (editingId !== null && !original?.editableScope) {
      this.announcementFormError.set(
        'لا يمكن تعديل هذا الإعلان من نموذج لا يدعم نطاقه الأصلي.',
      );
      return;
    }
    if (
      original?.editableScope !== scopeType &&
      !this.constants.isSelectable('NFD_ANN_SCOPE', scopeType)
    ) {
      this.announcementFormError.set('اختر نطاق إعلان مفعّلاً.');
      return;
    }

    this.announcementFormError.set('');
    this.announcementSuccessMessage.set('');

    if (this.savingAnnouncement()) return;

    if (!message) {
      this.announcementFormError.set(
        'يرجى إدخال نص الإعلان.',
      );
      return;
    }

    if (
      scopeType !== ANNOUNCEMENT_SCOPE.Platform &&
      (!scopeId ||
        !Number.isInteger(scopeId) ||
        scopeId <= 0)
    ) {
      this.announcementFormError.set(
        'يرجى إدخال رقم صحيح للشركة أو الدفعة.',
      );
      return;
    }

    const userId = this.authService.userId;

    if (editingId === null && !userId) {
      this.announcementFormError.set(
        'تعذر تحديد المستخدم الحالي. يرجى تسجيل الدخول مرة أخرى.',
      );
      return;
    }

    const dto = {
      scopeType: this.toApiScope(scopeType),
      scopeId:
        scopeType === ANNOUNCEMENT_SCOPE.Platform
          ? null
          : scopeId,
      message,
    };

    this.savingAnnouncement.set(true);

    const request$ =
      editingId !== null
        ? this.announcementApi.update(editingId, dto)
        : this.announcementApi.create({
            ...dto,
            createdByUserId: userId!,
          });

    request$.subscribe({
      next: () => {
        this.savingAnnouncement.set(false);

        this.announcementSuccessMessage.set(
          editingId !== null
            ? 'تم تحديث الإعلان بنجاح.'
            : 'تمت إضافة الإعلان بنجاح.',
        );

        this.resetAnnouncementAfterSave();

        if (editingId === null) {
          this.announcementPageIndex.set(0);
        }

        // Keep the form visible so the success message can be seen.
        this.loadAnnouncements();
      },

      error: (error: unknown) => {
        console.error(
          editingId !== null
            ? 'Failed to update announcement:'
            : 'Failed to create announcement:',
          error,
        );

        this.savingAnnouncement.set(false);

        this.announcementFormError.set(
          editingId !== null
            ? 'تعذر تحديث الإعلان. تحققي من البيانات وصلاحيات المستخدم.'
            : 'تعذرت إضافة الإعلان. تحققي من البيانات وصلاحيات المستخدم.',
        );
      },
    });
  }

  private resetAnnouncementAfterSave(): void {
    this.editingAnnouncementId.set(null);
    this.announcementMessage.set('');
    this.announcementScopeType.set(
      ANNOUNCEMENT_SCOPE.Platform,
    );
    this.announcementScopeId.set(null);
  }

  deleteAnnouncement(id: number): void {
    this.closeMenu();

    const confirmed = window.confirm(
      'هل أنت متأكد من حذف هذا الإعلان؟',
    );

    if (!confirmed) return;

    this.announcementApi.delete(id).subscribe({
      next: () => {
        this.announcementSuccessMessage.set(
          'تم حذف الإعلان بنجاح.',
        );

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
