
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

const PAGE_SIZE_OPTIONS = [5, 10, 15, 20] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

@Component({
  selector: 'app-notification-templates-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notification-templates-page.component.html',
  styleUrl: './notification-templates-page.component.css',
})
export class NotificationTemplatesPageComponent {
  private readonly api = inject(AdminSystemApiService);
  private readonly router = inject(Router);

  readonly searchTerm = signal('');
  readonly selectedType = signal('');

  readonly templates = signal<NotificationTemplate[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  readonly totalCount = signal(0);
  openMenuId: number | null = null;

  readonly pageSize = signal<PageSize>(5);
  readonly pageIndex = signal(0);
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  readonly filteredTemplates = computed(() => {
    const type = this.selectedType();
    const templates = this.templates();

    if (!type) {
      return templates;
    }

    return templates.filter((template) => {
      if (type === 'Email') {
        return template.hasEmail;
      }

      if (type === 'SMS') {
        return template.hasSms;
      }

      if (type === 'Push') {
        return template.type === 'Push';
      }

      return true;
    });
  });

  readonly totalPages = computed(() =>
    Math.max(
      1,
      Math.ceil(this.totalCount() / this.pageSize()),
    ),
  );

  readonly safePageIndex = computed(() =>
    Math.min(this.pageIndex(), this.totalPages() - 1),
  );

  readonly canPrev = computed(
    () => this.safePageIndex() > 0,
  );

  readonly canNext = computed(
    () => this.safePageIndex() < this.totalPages() - 1,
  );

  readonly pageNumbers = computed(() =>
    Array.from(
      { length: this.totalPages() },
      (_, index) => index,
    ),
  );

  readonly paginatedTemplates = computed(
    () => this.filteredTemplates(),
  );

  constructor() {
    this.loadTemplates();
  }

  loadTemplates(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.api
      .getNotificationTemplatesPage({
        pageIndex: this.pageIndex(),
        pageSize: this.pageSize(),
        q: this.searchTerm().trim(),
      })
      .subscribe({
        next: (page) => {
          const rows = page.rows ?? [];

          this.templates.set(
            rows.map((dto) => this.mapTemplate(dto)),
          );

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
          console.error(
            'Failed to load notification templates:',
            error,
          );

          this.errorMessage.set(
            'تعذر تحميل قوالب الإشعارات. يرجى المحاولة مرة أخرى.',
          );

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

  onPageSizeChange(event: Event): void {
    const value = Number(
      (event.target as HTMLSelectElement).value,
    );

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
  closeMenu(): void {
    this.openMenuId = null;
  }

  editTemplate(template: NotificationTemplate): void {
    this.closeMenu();

    this.router.navigate(
      [
        '/admin/external-system/notification-templates',
        template.code,
      ],
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
  }
}
