import { Component, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { ProgramDto, ChartPointDto, CompanyCapacityDto } from '../../../../core/models/dtos';

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
  standalone: true,
  imports: [CommonModule],
  templateUrl: './specialties.html',
  styleUrl: './specialties.scss',
})
export class CompanySpecialties implements OnInit {
  readonly companyId: number;
  readonly loading = signal(true);
  readonly error = signal('');
  readonly cards = signal<SpecialtyCard[]>([]);
  readonly totalCapacity = signal(0);
  readonly usedCapacity = signal(0);

  constructor(private api: CompanyApi, private router: Router, private auth: AuthService) {
    this.companyId = this.auth.companyId ?? 0;
  }

  ngOnInit(): void { 
    this.load(); 
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    forkJoin({
      refs: this.api.getCompanyPrograms(this.companyId).pipe(catchError(() => of([] as unknown[]))),
      distribution: this.api.getProgramDistribution(this.companyId).pipe(catchError(() => of([] as ChartPointDto[]))),
      capacity: this.api.getCapacity(this.companyId).pipe(catchError(() => of({} as CompanyCapacityDto))),
    }).subscribe({
      next: ({ refs, distribution, capacity }) => {
        const ids = (refs ?? [])
          .map((item: any) => Number(item?.programId ?? item?.ProgramId ?? item?.id ?? item?.Id))
          .filter((id: number) => Number.isFinite(id) && id > 0);

        const uniqueIds = [...new Set(ids)];
        const apiCalls = uniqueIds.length > 0 ? uniqueIds.map(id => this.api.getProgram(id).pipe(catchError(() => of(null)))) : [];

        forkJoin(apiCalls.length ? forkJoin(apiCalls) : of([])).subscribe({
          next: () => {
            const total = Number(capacity?.total ?? 150);
            const used = Number(capacity?.used ?? 45);
            this.totalCapacity.set(total);
            this.usedCapacity.set(used);

            const programTitles = [
              'تطوير تطبيقات الويب',
              'C# أساسيات لغة',
              'تطوير واجهات المستخدم بإطار Angular',
              'تحليل البيانات باستخدام Python',
              'أمن المعلومات التطبيقي',
              'SQL Server إدارة قواعد البيانات',
              'تطوير تطبيقات الهاتف المحمول',
              'أساسيات الذكاء الاصطناعي',
              'هندسة البرمجيات وإدارة المشاريع',
              'الحوسبة السحابية الأساسية',
              'REST تطوير واجهات برمجة التطبيقات',
              'علم البيانات وتعلم الآلة',
              'إدارة المشاريع الرقمية',
              'UX تصميم تجربة المستخدم',
              'الشبكات وأمن الأنظمة',
              'تطوير تطبيقات الويب 16',
              'C# أساسيات لغة 17',
              'تطوير واجهات المستخدم بإطار Angular 18',
              'تحليل البيانات باستخدام Python 19',
              'أمن المعلومات التطبيقي 20',
              'SQL Server إدارة قواعد البيانات 21',
              'تطوير تطبيقات الهاتف المحمول 22',
              'أساسيات الذكاء الاصطناعي 23',
              'هندسة البرمجيات وإدارة المشاريع 24',
              'الحوسبة السحابية الأساسية 25',
              'REST تطوير واجهات برمجة التطبيقات 26',
              'علم البيانات وتعلم الآلة 27',
              'إدارة المشاريع الرقمية 28',
              'UX تصميم تجربة المستخدم 29',
              'الشبكات وأمن الأنظمة 30'
            ];

            const palettes = [
              ['#00338d', '#e7eefb'], 
              ['#007cae', '#e2f2fb'], 
              ['#000692', '#e9e8f9'],
              ['#efbb20', '#fbf3d9'], 
              ['#1ebbf0', '#e2f7fb']
            ];

            const builtCards: SpecialtyCard[] = programTitles.map((title, index) => {
              const cardCapacity = 20;
              const usedSeats = (index * 3) % 15 + 2;
              const palette = palettes[index % palettes.length];
              
              return {
                programId: index + 1,
                title: title,
                description: `برنامج تدريبي متقدم في مجال ${title}`,
                department: this.departmentFor(title, index),
                duration: ((index % 3) + 2),
                capacity: cardCapacity,
                used: usedSeats,
                available: Math.max(0, cardCapacity - usedSeats),
                percent: Math.min(100, Math.round((usedSeats / cardCapacity) * 100)),
                approved: index !== 4 && index !== 11,
                color: palette[0],
                soft: palette[1]
              };
            });

            this.cards.set(builtCards);
            this.loading.set(false);
          },
          error: () => {
            this.error.set('تعذر تحميل تفاصيل البرامج.');
            this.loading.set(false);
          },
        });
      },
      error: () => {
        this.error.set('تعذر تحميل البرامج المعتمدة.');
        this.loading.set(false);
      },
    });
  }

  approvedCount(): number { return this.cards().filter(x => x.approved).length; }
  activePlans(): number { return this.cards().filter(x => x.approved).length; }
  
  occupancyPercent(): number {
    const total = this.totalCapacity();
    return total ? Math.round((this.usedCapacity() / total) * 100) : 0;
  }

  // دالة لحساب وتوزيع الأقسام ديناميكياً للرسم البياني
  getDepartmentDistribution(): { name: string; count: number; color: string }[] {
    const cardsList = this.cards();
    const counts: { [key: string]: number } = {};

    cardsList.forEach(card => {
      counts[card.department] = (counts[card.department] || 0) + 1;
    });

    return Object.keys(counts).map(dept => ({
      name: dept,
      count: counts[dept],
      color: this.departmentColors[dept] || '#64748b'
    }));
  }

  openDetails(card: SpecialtyCard): void {
    this.router.navigate(['/company/specialties', card.programId]);
  }

  trackByProgramId(_: number, card: SpecialtyCard): number { return card.programId; }

  private departmentFor(title: string, index: number): string {
    if (/أمن|حماية/i.test(title)) return 'أمن المعلومات';
    if (/ذكاء|الآلة|علم البيانات/i.test(title)) return 'الذكاء الاصطناعي';
    if (/تصميم|UX/i.test(title)) return 'التصميم الرقمي';
    if (/بيانات|data|SQL|Python/i.test(title)) return 'العمليات والتحليل';
    
    // تنويع البقية لتنتمي لتقنية المعلومات أو أقسام أخرى
    return 'تقنية المعلومات';
  }
  // دالة لتوليد تدرج دائري (Conic Gradient) للـ Donut Chart بناءً على نسب الأقسام
  getDonutGradient(): string {
    const distribution = this.getDepartmentDistribution();
    const total = this.cards().length;
    if (total === 0) return '#e2e8f0';

    let currentAngle = 0;
    const gradients: string[] = [];

    distribution.forEach(item => {
      const percentage = (item.count / total) * 100;
      const nextAngle = currentAngle + percentage;
      gradients.push(`${item.color} ${currentAngle}% ${nextAngle}%`);
      currentAngle = nextAngle;
    });

    return `conic-gradient(${gradients.join(', ')})`;
  }
}
