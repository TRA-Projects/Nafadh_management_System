import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { CompanyCapacityDto, CompanyProgramSummaryDto } from '../../../../core/models/dtos';

interface SpecialtyCard {
  programId: number;
  title: string;
  description?: string;
  department: string;
  duration: number;
  capacity: number;
  used: number;
  available: number;
  percent: number;
  approved: boolean;
  color: string;
  soft: string;
}

@Component({
  selector: 'app-company-specialties',
  templateUrl: './specialties.html',
  styleUrl: './specialties.scss',
})
export class CompanySpecialties implements OnInit {
  private readonly api = inject(CompanyApi);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);

  readonly companyId: number = this.auth.companyId ?? 0;
  readonly loading = signal(true);
  readonly error = signal('');
  readonly cards = signal<SpecialtyCard[]>([]);
  readonly totalCapacity = signal(0);
  readonly usedCapacity = signal(0);

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

    this.api.getCompanyProgramSummaries(this.companyId).pipe(
      catchError((error) => {
        console.error('Failed to load company programs:', error);
        this.error.set('تعذر تحميل البرامج المرتبطة بالشركة.');
        return of([] as CompanyProgramSummaryDto[]);
      })
    ).subscribe((summaries) => {
      const cards = summaries.map((program, index) => this.toCard(program, index));
      this.cards.set(cards);

      this.totalCapacity.set(cards.reduce((sum, item) => sum + item.capacity, 0));
      this.usedCapacity.set(cards.reduce((sum, item) => sum + item.used, 0));
      this.loading.set(false);
    });

    this.api.getCapacity(this.companyId).pipe(
      catchError((error) => {
        console.error('Failed to load company capacity:', error);
        return of(null as CompanyCapacityDto | null);
      })
    ).subscribe((capacity) => {
      if (capacity) {
        this.totalCapacity.set(Number(capacity.total ?? 0));
        this.usedCapacity.set(Number(capacity.used ?? 0));
      }
    });
  }

  approvedCount(): number {
    return this.cards().filter((x) => x.approved).length;
  }

  activePlans(): number {
    return this.cards().filter((x) => x.approved).length;
  }

  occupancyPercent(): number {
    const total = this.totalCapacity();
    return total ? Math.round((this.usedCapacity() / total) * 100) : 0;
  }

  getDepartmentDistribution(): { name: string; count: number; color: string }[] {
    const counts = new Map<string, number>();

    for (const card of this.cards()) {
      const department = card.department || 'غير محدد';
      counts.set(department, (counts.get(department) ?? 0) + 1);
    }

    return Array.from(counts.entries()).map(([name, count]) => ({
      name,
      count,
      color: this.departmentColors[name] || '#64748b',
    }));
  }

  openDetails(card: SpecialtyCard): void {
    this.router.navigate(['/company/specialties', card.programId]);
  }

  trackByProgramId(_: number, card: SpecialtyCard): number {
    return card.programId;
  }

  getDonutGradient(): string {
    const distribution = this.getDepartmentDistribution();
    const total = this.cards().length;
    if (!total) return '#e2e8f0';

    let currentAngle = 0;
    const gradients: string[] = [];

    distribution.forEach((item) => {
      const percentage = (item.count / total) * 100;
      const nextAngle = currentAngle + percentage;
      gradients.push(`${item.color} ${currentAngle}% ${nextAngle}%`);
      currentAngle = nextAngle;
    });

    return `conic-gradient(${gradients.join(', ')})`;
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
      duration: this.hoursToWeeks(Number(program.durationHours ?? 0)),
      capacity: Number(program.allocatedCapacity ?? 0),
      used: Number(program.usedCapacity ?? 0),
      available: Number(program.remainingCapacity ?? 0),
      percent: Math.max(0, Math.min(100, Math.round(Number(program.utilizationPercentage ?? 0)))),
      approved: !!program.approvedForCompany && !/suspended|inactive|rejected/i.test(program.status),
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
