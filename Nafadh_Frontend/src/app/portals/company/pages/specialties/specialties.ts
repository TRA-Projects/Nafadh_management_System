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
  standalone: true, // تأكد من وجودها إذا كنت تستخدم Standalone Components
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
        if (!uniqueIds.length) {
          this.cards.set([]);
          this.totalCapacity.set(Number(capacity?.total ?? 0));
          this.usedCapacity.set(Number(capacity?.used ?? 0));
          this.loading.set(false);
          return;
        }

        forkJoin(uniqueIds.map(id => this.api.getProgram(id).pipe(catchError(() => of(null))))).subscribe({
          next: programs => {
            const total = Number(capacity?.total ?? 0);
            const used = Number(capacity?.used ?? 0);
            this.totalCapacity.set(total);
            this.usedCapacity.set(used);

            const built = programs.filter((p): p is ProgramDto => !!p).map((program, index) => {
              const title = program.title || program.name || `البرنامج ${program.programId}`;
              const matched = (distribution ?? []).find((x: ChartPointDto) =>
                String(x.label).trim().toLowerCase() === title.trim().toLowerCase()
              );
              const usedSeats = Number(matched?.value ?? 0);
              const share = (distribution?.reduce((sum, x) => sum + Number(x.value || 0), 0) || 0);
              const derivedCapacity = total > 0
                ? Math.max(1, Math.round(total * (usedSeats / Math.max(1, share))))
                : Math.max(10, usedSeats + 10);
              const cardCapacity = Math.max(usedSeats || 0, derivedCapacity);
              const approved = !program.status || !/pending|draft|inactive|rejected/i.test(program.status);
              const palette = [
                ['#00338d', '#e7eefb'], ['#007cae', '#e2f2fb'], ['#000692', '#e9e8f9'],
                ['#efbb20', '#fbf3d9'], ['#1ebbf0', '#e2f7fb']
              ][index % 5];
              const percent = Math.min(100, Math.round((usedSeats / cardCapacity) * 100));

              return {
                programId: program.programId,
                title,
                description: program.description,
                department: this.departmentFor(title),
                duration: Math.max(1, Math.round(Number(program.durationHours ?? 0) / 40) || 16),
                capacity: cardCapacity,
                used: usedSeats,
                available: Math.max(0, cardCapacity - usedSeats),
                percent,
                approved,
                color: palette[0],
                soft: palette[1],
              };
            });

            this.cards.set(built);
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

  openDetails(card: SpecialtyCard): void {
    this.router.navigate(['/company/specialties', card.programId]);
  }
  trackByProgramId(_: number, card: SpecialtyCard): number { return card.programId; }

  private departmentFor(title: string): string {
    if (/بيانات|data|إحصاء/i.test(title)) return 'العمليات';
    if (/تصميم|جرافيك|تسويق/i.test(title)) return 'التسويق';
    return 'تقنية المعلومات';
  }
}