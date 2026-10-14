import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { catchError, forkJoin, of } from 'rxjs';
import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyProgramSummaryDto } from '../../../../core/models/dtos';

interface SpecialtyCard {
  programId: number;
  title: string;
  description?: string;
  department: string;
  departments: string[];
  duration: number;
  capacity: number;
  used: number;
  available: number;
  percent: number;
  approved: boolean;
  color: string;
  soft: string;
}

type StatusFilter = 'all' | 'available' | 'nearFull' | 'unpublished';
type SortKey = 'default' | 'occupancy' | 'available' | 'name' | 'duration';

/** A program at or above this occupancy is flagged as nearly full. */
const NEAR_FULL_PERCENT = 90;

@Component({
  selector: 'app-company-specialties',
  templateUrl: './specialties.html',
  styleUrl: './specialties.scss',
})
export class CompanySpecialties implements OnInit {
  private readonly api = inject(CompanyApi);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly sanitizer = inject(DomSanitizer);

  readonly companyId: number = this.auth.companyId ?? 0;
  readonly loading = signal(true);
  readonly error = signal('');
  readonly cards = signal<SpecialtyCard[]>([]);
  readonly totalCapacity = signal(0);
  readonly usedCapacity = signal(0);

  // ── List controls: search / department / status / sort ──
  readonly search = signal('');
  readonly departmentFilter = signal<string | null>(null);
  readonly statusFilter = signal<StatusFilter>('all');
  readonly sortKey = signal<SortKey>('default');

  readonly statusOptions: { key: StatusFilter; label: string }[] = [
    { key: 'all', label: 'الكل' },
    { key: 'available', label: 'بها مقاعد متاحة' },
    { key: 'nearFull', label: 'قاربت على الامتلاء' },
    { key: 'unpublished', label: 'غير منشورة' },
  ];

  readonly sortOptions: { key: SortKey; label: string }[] = [
    { key: 'default', label: 'الترتيب الافتراضي' },
    { key: 'occupancy', label: 'الأعلى إشغالاً' },
    { key: 'available', label: 'الأكثر مقاعد متاحة' },
    { key: 'name', label: 'الاسم (أ – ي)' },
    { key: 'duration', label: 'الأقصر مدة' },
  ];

  /** Cards after search + department + status filters, then sorting. */
  readonly visibleCards = computed(() => {
    const term = this.search().trim().toLowerCase();
    const dept = this.departmentFilter();
    const status = this.statusFilter();

    const list = this.cards().filter((card) => {
      if (term && !`${card.title} ${card.department}`.toLowerCase().includes(term)) {
        return false;
      }
      if (dept && !(card.departments.length ? card.departments : ['غير محدد']).includes(dept)) {
        return false;
      }
      return this.matchesStatus(card, status);
    });

    switch (this.sortKey()) {
      case 'occupancy':
        return [...list].sort((a, b) => b.percent - a.percent);
      case 'available':
        return [...list].sort((a, b) => b.available - a.available);
      case 'name':
        return [...list].sort((a, b) => a.title.localeCompare(b.title, 'ar'));
      case 'duration':
        return [...list].sort((a, b) => a.duration - b.duration);
      default:
        return list;
    }
  });

  /** Chip counts always reflect search + department, so they explain the result. */
  readonly statusCounts = computed(() => {
    const term = this.search().trim().toLowerCase();
    const dept = this.departmentFilter();
    const base = this.cards().filter((card) => {
      if (term && !`${card.title} ${card.department}`.toLowerCase().includes(term)) return false;
      if (dept && !(card.departments.length ? card.departments : ['غير محدد']).includes(dept)) return false;
      return true;
    });
    const count = (s: StatusFilter) => base.filter((c) => this.matchesStatus(c, s)).length;
    return {
      all: count('all'),
      available: count('available'),
      nearFull: count('nearFull'),
      unpublished: count('unpublished'),
    } as Record<StatusFilter, number>;
  });

  readonly hasActiveFilters = computed(
    () =>
      !!this.search().trim() ||
      this.departmentFilter() !== null ||
      this.statusFilter() !== 'all' ||
      this.sortKey() !== 'default'
  );

  private readonly palettes = [
    ['#00338d', '#e7eefb'],
    ['#007cae', '#e2f2fb'],
    ['#000692', '#e9e8f9'],
    ['#efbb20', '#fbf3d9'],
    ['#1ebbf0', '#e2f7fb'],
  ];

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (!this.companyId) {
      this.error.set('لا يمكن تحديد الشركة الحالية من جلسة الدخول.');
      this.cards.set([]);
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set('');

    // Both requests are awaited together and the header totals are set in ONE
    // place. Before, two independent subscriptions wrote the same signals and
    // the final value depended on which response arrived last.
    forkJoin({
      summaries: this.api.getCompanyProgramSummaries(this.companyId).pipe(
        catchError((error) => {
          console.error('Failed to load company programs:', error);
          this.error.set('تعذر تحميل البرامج المرتبطة بالشركة.');
          return of([] as CompanyProgramSummaryDto[]);
        })
      ),
      capacity: this.api.getCompanyCapacitySummary(this.companyId).pipe(
        catchError((error) => {
          console.error('Failed to load company capacity:', error);
          return of(null);
        })
      ),
    }).subscribe(({ summaries, capacity }) => {
      const cards = summaries.map((program, index) => this.toCard(program, index));
      this.cards.set(cards);

      if (capacity) {
        // Company-level capacity (same numbers as the Dashboard).
        this.totalCapacity.set(Number(capacity.total ?? 0));
        this.usedCapacity.set(Number(capacity.used ?? 0));
      } else {
        // Fallback: sum of the program cards.
        this.totalCapacity.set(cards.reduce((sum, item) => sum + item.capacity, 0));
        this.usedCapacity.set(cards.reduce((sum, item) => sum + item.used, 0));
      }

      this.loading.set(false);
    });
  }

  approvedCount(): number {
    return this.cards().filter((x) => x.approved).length;
  }

  /** Published programs that currently have trainees from this company. */
  activePlans(): number {
    return this.cards().filter((x) => x.approved && x.used > 0).length;
  }

  occupancyPercent(): number {
    const total = this.totalCapacity();
    return total ? Math.round((this.usedCapacity() / total) * 100) : 0;
  }

 getDepartmentDistribution(): { name: string; count: number; color: string }[] {
    const counts = new Map<string, number>();

    // استخدام مصفوفة ألوان واضحة ومتنوعة لكل برنامج/قسم يتم إيجاده
    const defaultColors = ['#00338d', '#007cae', '#efbb20', '#1ebbf0', '#5b6fb8', '#16a34a'];
    let colorIndex = 0;

    for (const card of this.cards()) {
      const names = card.departments.length ? card.departments : ['غير محدد'];
      for (const department of names) {
        counts.set(department, (counts.get(department) ?? 0) + 1);
      }
    }
//
    return Array.from(counts.entries()).map(([name, count]) => {
      const assignedColor = this.departmentColors[name] || defaultColors[colorIndex % defaultColors.length];
      colorIndex++;
      return {
        name,
        count,
        color: assignedColor,
      };
    });
  }

  // ── List controls ──

  onSearch(event: Event): void {
    this.search.set((event.target as HTMLInputElement).value);
  }

  setStatus(key: StatusFilter): void {
    this.statusFilter.set(key);
  }

  onSort(event: Event): void {
    this.sortKey.set((event.target as HTMLSelectElement).value as SortKey);
  }

  /** Clicking a department in the chart legend filters the list; click again to clear. */
  toggleDepartment(name: string): void {
    this.departmentFilter.update((current) => (current === name ? null : name));
  }

  clearFilters(): void {
    this.search.set('');
    this.departmentFilter.set(null);
    this.statusFilter.set('all');
    this.sortKey.set('default');
  }

  isNearFull(card: SpecialtyCard): boolean {
    return card.capacity > 0 && card.percent >= NEAR_FULL_PERCENT;
  }

  private matchesStatus(card: SpecialtyCard, status: StatusFilter): boolean {
    switch (status) {
      case 'available':
        return card.available > 0;
      case 'nearFull':
        return this.isNearFull(card);
      case 'unpublished':
        return !card.approved;
      default:
        return true;
    }
  }

  openDetails(card: SpecialtyCard): void {
    this.router.navigate(['/company/specialties', card.programId]);
  }

  trackByProgramId(_: number, card: SpecialtyCard): number {
    return card.programId;
  }

  getDonutGradient(): SafeStyle {
    const distribution = this.getDepartmentDistribution();
    // A program can belong to several departments, so the donut total is the
    // sum of the slices (not the number of cards) or the ring would not close.
    const total = distribution.reduce((sum, item) => sum + item.count, 0);
    if (!total || !distribution.length) {
      return this.sanitizer.bypassSecurityTrustStyle('conic-gradient(#e2e8f0 0deg 360deg)');
    }

    let currentAngle = 0;
    const gradients: string[] = [];

    distribution.forEach((item) => {
      const angle = (item.count / total) * 360;
      const nextAngle = currentAngle + angle;
      gradients.push(`${item.color} ${currentAngle}deg ${nextAngle}deg`);
      currentAngle = nextAngle;
    });

    const gradientString = `conic-gradient(${gradients.join(', ')})`;
    return this.sanitizer.bypassSecurityTrustStyle(gradientString);
  }

  private hoursToWeeks(hours: number): number {
    if (!hours || hours <= 0) return 0;
    return Math.ceil(hours / 40);
  }

  private toCard(program: CompanyProgramSummaryDto, index: number): SpecialtyCard {
    const [color, soft] = this.palettes[index % this.palettes.length];
    const department = program.departments?.length
      ? program.departments.join('، ')
      : 'غير محدد';

    return {
      programId: program.programId,
      title: program.title,
      description: program.description,
      department,
      departments: program.departments ?? [],
      duration: this.hoursToWeeks(Number(program.durationHours ?? 0)),
      capacity: Number(program.allocatedCapacity ?? 0),
      used: Number(program.usedCapacity ?? 0),
      available: Number(program.remainingCapacity ?? 0),
      percent: Math.max(0, Math.min(100, Math.round(Number(program.utilizationPercentage ?? 0)))),
      approved: !!program.approvedForCompany && program.status === 'Published',
      color,
      soft,
    };
  }

  private readonly departmentColors: Record<string, string> = {
    'تقنية المعلومات': '#00338d',
    'أمن المعلومات': '#007cae',
    'الذكاء الاصطناعي': '#000692',
    'التسويق': '#efbb20',
    'التصميم الرقمي': '#1ebbf0',
    'العمليات والتحليل': '#5b6fb8',
  };
}