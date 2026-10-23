
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
  private readonly router = inject(Router);

  searchTerm = signal('');
  selectedType = signal('');

  openMenuId: number | null = null;

  readonly pageSize = signal<PageSize>(5);
  readonly pageIndex = signal(0);
  readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  readonly templates = signal<NotificationTemplate[]>([
    {
      id: 1,
      name: 'دعوة للتقديم',
      code: 'ASK_TO_APPLY',
      type: 'Email',
      subject: 'دعوة للتقديم على البرنامج',
      body: 'عزيزي المتقدم، نود دعوتك للتقديم.',
      isActive: true,
      hasEmail: true,
      hasSms: true,
    },
    {
      id: 2,
      name: 'تم تقديم الطلب',
      code: 'JOB_APPLIED',
      type: 'SMS',
      body: 'تم استلام طلبك بنجاح.',
      isActive: true,
      hasEmail: true,
      hasSms: true,
    },
    {
      id: 3,
      name: 'تحديث حالة الطلب',
      code: 'APPLICATION_STATUS_UPDATED',
      type: 'Push',
      body: 'تم تحديث حالة طلبك.',
      isActive: true,
      hasEmail: true,
      hasSms: true,
    },
    {
      id: 4,
      name: 'جدولة مقابلة',
      code: 'INTERVIEW_SCHEDULED',
      type: 'Email',
      subject: 'موعد المقابلة الشخصية',
      body: 'تم تحديد موعد المقابلة.',
      isActive: true,
      hasEmail: true,
      hasSms: true,
    },
    {
      id: 5,
      name: 'تقديم عرض',
      code: 'OFFER_SUBMITTED',
      type: 'Email',
      subject: 'عرض انضمام',
      body: 'يسعدنا تقديم عرض للانضمام.',
      isActive: true,
      hasEmail: true,
      hasSms: true,
    },
  ]);

  readonly filteredTemplates = computed(() => {
    const search = this.searchTerm().trim().toLowerCase();
    const type = this.selectedType();

    return this.templates().filter((template) => {
      const matchesSearch =
        template.name.toLowerCase().includes(search) ||
        template.code.toLowerCase().includes(search);

      const matchesType = !type || template.type === type;

      return matchesSearch && matchesType;
    });
  });

  readonly totalCount = computed(
    () => this.filteredTemplates().length,
  );

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

  readonly paginatedTemplates = computed(() => {
    const start = this.safePageIndex() * this.pageSize();

    return this.filteredTemplates().slice(
      start,
      start + this.pageSize(),
    );
  });

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

    if (
      PAGE_SIZE_OPTIONS.includes(value as PageSize)
    ) {
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

  openAddModal(): void {
    // يُضاف منطق إنشاء القالب عند تجهيز نموذج الإضافة.
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
        template.id,
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
    this.templates.update((items) =>
      items.filter((template) => template.id !== id),
    );

    this.closeMenu();

    // منع بقاء مؤشر الصفحة خارج نطاق الصفحات بعد الحذف.
    if (this.pageIndex() >= this.totalPages()) {
      this.pageIndex.set(this.totalPages() - 1);
    }
  }
}