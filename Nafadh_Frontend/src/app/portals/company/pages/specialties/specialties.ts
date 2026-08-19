import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { ProgramDto } from '../../../../core/models/dtos';

interface SpecialtyCard {
  programId: number;
  title: string;
  department: string;
  approved: boolean;
  used: number;
  capacity: number;
  percent: number;
  available: number;
  duration: number;
  color: string;
  soft: string;
}

const PALETTE = ['#00338d', '#007cae', '#00bbc2', '#efbb20', '#1ebbf0', '#5b6fb8'];

@Component({
  selector: 'app-company-specialties',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './specialties.html',
  styleUrl: './specialties.scss',
})
export class CompanySpecialties implements OnInit {
  companyId: number = 0;

  loading = signal(false);
  error = signal('');
  cards = signal<SpecialtyCard[]>([]);

  approvedCount = computed(() => this.cards().length);

  totalCapacity = computed(() =>
    this.cards().reduce((sum, c) => sum + c.capacity, 0)
  );

  usedCapacity = computed(() =>
    this.cards().reduce((sum, c) => sum + c.used, 0)
  );

  occupancyPercent = computed(() => {
    const total = this.totalCapacity();
    if (!total) return 0;
    return Math.round((this.usedCapacity() / total) * 100);
  });

  activePlans = computed(() =>
    this.cards().filter((c) => c.approved).length
  );

  constructor(private api: CompanyApi, private auth: AuthService) {
    this.companyId = this.auth.companyId ?? 0;
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');

    this.api.getCompanyPrograms(this.companyId).subscribe({
      next: (links) => {
        if (!links.length) {
          this.cards.set([]);
          this.loading.set(false);
          return;
        }

        forkJoin({
          programs: forkJoin(links.map((l) => this.api.getProgram(l.programId))),
          capacity: this.api.getCapacity(this.companyId).pipe(catchError(() => of(null))),
          enrollments: this.api.getEnrollmentsByCompany(this.companyId).pipe(catchError(() => of([]))),
        }).subscribe({
          next: ({ programs, capacity, enrollments }) => {
            // The backend does not track a per-program seat quota yet (only
            // a single company-wide total) — split the company total evenly
            // across its linked programs as a stand-in until that field
            // exists. "used" below is real, counted from actual enrollments.
            const perProgramCapacity = programs.length
              ? Math.max(1, Math.round((capacity?.total ?? 0) / programs.length))
              : 0;

            const cards: SpecialtyCard[] = programs.map((p: ProgramDto, i: number) => {
              const used = enrollments.filter((e) => e.programTitle === p.title).length;
              const cap = perProgramCapacity;
              const percent = cap > 0 ? Math.max(0, Math.min(100, Math.round((used / cap) * 100))) : 0;
              const color = PALETTE[i % PALETTE.length];
              return {
                programId: p.programId,
                title: p.title ?? p.name ?? 'برنامج',
                department: p.category ?? '—',
                approved: p.status === 'Published',
                used,
                capacity: cap,
                percent,
                available: Math.max(0, cap - used),
                duration: p.durationHours ?? 0,
                color,
                soft: `${color}22`,
              };
            });

            this.cards.set(cards);
            this.loading.set(false);
          },
          error: () => {
            this.error.set('تعذر تحميل البيانات بنجاح.');
            this.loading.set(false);
          },
        });
      },
      error: () => {
        this.error.set('تعذر تحميل البيانات بنجاح.');
        this.loading.set(false);
      },
    });
  }

  trackByProgramId(index: number, card: SpecialtyCard): number {
    return card.programId ?? index;
  }

  // No program-detail view exists in this build yet — nothing to navigate to.
  openDetails(card: SpecialtyCard): void {
    console.log('Open details for:', card);
  }
}