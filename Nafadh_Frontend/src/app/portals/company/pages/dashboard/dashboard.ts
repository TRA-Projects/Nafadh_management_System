import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';
import {
  AnnouncementDto,
  ChartPointDto,
  CompanyAccountDto,
  CompanyDashboardDto,
  CompanyDashboardTraineeDto,
} from '../../../../core/models/dtos';

@Component({
  selector: 'app-company-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class CompanyDashboard implements OnInit {
  readonly companyId = computed(() => this.auth.companyId ?? 0);

  loading = signal(false);
  loadError = signal(false);

  companyName = signal('الشركة المستضيفة');

  capacity = signal<CompanyDashboardDto['capacity'] | null>(null);
  topPerformers = signal<CompanyDashboardTraineeDto[]>([]);
  atRisk = signal<CompanyDashboardTraineeDto[]>([]);
  warnings = signal<CompanyDashboardDto['recentWarnings']>([]);

  totalTrainees = signal(0);
  activeTrainees = signal(0);

  announcements = signal<AnnouncementDto[]>([]);
  announcementsDismissed = signal(false);
  selectedOpportunity = signal<AnnouncementDto | null>(null);

  attendanceWeeks = signal<ChartPointDto[]>([]);
  programDistribution = signal<ChartPointDto[]>([]);

  animationKey = signal(0);
  barsAnimating = signal(false);

  capacityPercent = computed(() => {
    const cap = this.capacity();

    if (!cap || cap.total <= 0) {
      return 0;
    }

    return Math.min(100, Math.max(0, (cap.used / cap.total) * 100));
  });

  attendanceAverage = computed(() => {
    const weeks = this.attendanceWeeks();

    if (!weeks.length) {
      return 0;
    }

    return weeks.reduce(
      (sum, week) => sum + Number(week.value || 0),
      0
    ) / weeks.length;
  });

  topPerformersAverage = computed(() => {
    const trainees = this.topPerformers();

    if (!trainees.length) {
      return 0;
    }

    return Math.round(
      trainees.reduce(
        (sum, trainee) =>
          sum + Number(trainee.performancePercent || 0),
        0
      ) / trainees.length
    );
  });

  constructor(
    private api: CompanyApi,
    private auth: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.refreshData();
  }

  refreshData(): void {
    const companyId = this.companyId();

    if (!companyId) {
      this.loadError.set(true);
      return;
    }

    this.loading.set(true);
    this.loadError.set(false);
    this.barsAnimating.set(false);

    forkJoin({
      dashboard: this.api.getDashboard(companyId),
      announcements: this.api.getPlatformAnnouncements(),
      account: this.api.getCurrentAccount().pipe(
        catchError((error) => {
          console.warn(
            'Company account name could not be loaded:',
            error
          );
          return of(null as CompanyAccountDto | null);
        })
      ),
    }).subscribe({
      next: ({ dashboard, announcements, account }) => {
        this.capacity.set(dashboard?.capacity ?? null);
        this.topPerformers.set(dashboard?.topPerformers ?? []);
        this.atRisk.set(dashboard?.atRiskTrainees ?? []);
        this.warnings.set(dashboard?.recentWarnings ?? []);

        this.totalTrainees.set(dashboard?.totalTrainees ?? 0);
        this.activeTrainees.set(dashboard?.activeTrainees ?? 0);

        this.attendanceWeeks.set(dashboard?.attendanceWeeks ?? []);
        this.programDistribution.set(
          dashboard?.programDistribution ?? []
        );

        this.announcements.set(announcements ?? []);

        if (account?.companyName?.trim()) {
          this.companyName.set(account.companyName);
        }

        this.loading.set(false);
        this.animationKey.update((value) => value + 1);

        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            this.barsAnimating.set(true);
          });
        });
      },

      error: (error) => {
        console.error(
          'Company Dashboard refresh failed:',
          error
        );

        this.loading.set(false);
        this.loadError.set(true);
        this.barsAnimating.set(false);

        this.capacity.set(null);
        this.topPerformers.set([]);
        this.atRisk.set([]);
        this.warnings.set([]);

        this.totalTrainees.set(0);
        this.activeTrainees.set(0);

        this.attendanceWeeks.set([]);
        this.programDistribution.set([]);
        this.announcements.set([]);
      },
    });
  }

  openCompanyProfile(): void {
    this.router.navigate(['/company/profile']);
  }

  openTrainees(): void {
    this.router.navigate(['/company/trainees']);
  }

  openWarnings(): void {
    this.router.navigate(['/company/trainees']);
  }

  openProgress(enrollmentId: number): void {
    if (enrollmentId > 0) {
      this.router.navigate([
        '/company/trainees',
        enrollmentId,
        'progress',
      ]);
      return;
    }

    this.openTrainees();
  }

  openGithub(url?: string): void {
    if (!url) {
      return;
    }

    window.open(
      url,
      '_blank',
      'noopener,noreferrer'
    );
  }

  openOpportunityModal(
    item: AnnouncementDto | null
  ): void {
    if (!item) {
      return;
    }

    this.selectedOpportunity.set(item);
  }

  closeOpportunityModal(): void {
    this.selectedOpportunity.set(null);
  }

  dismissAnnouncements(): void {
    this.announcementsDismissed.set(true);
  }

  announcementMessage(item: AnnouncementDto): string {
    return (
      item.message ||
      item.description ||
      'لا توجد تفاصيل إضافية لهذا الإعلان.'
    );
  }

  announcementDate(
    item: AnnouncementDto
  ): string | Date | undefined {
    return item.createdAt || item.date;
  }

  barPercent(value: number, max: number): number {
    if (!max || max <= 0) {
      return 0;
    }

    return Math.min(
      100,
      Math.max(0, (value / max) * 100)
    );
  }

  attendanceMax(): number {
    const weeks = this.attendanceWeeks();

    if (!weeks.length) {
      return 100;
    }

    return Math.max(
      100,
      ...weeks.map(
        (week) => Number(week.value || 0)
      )
    );
  }

  programMax(): number {
    const programs = this.programDistribution();

    if (!programs.length) {
      return 1;
    }

    return Math.max(
      1,
      ...programs.map(
        (program) => Number(program.value || 0)
      )
    );
  }

  programColor(index: number): string {
    const colors = [
      '#063b8c',
      '#0788a7',
      '#0ca7ad',
      '#d9a400',
      '#5036a8',
      '#159cc7',
    ];

    return colors[index % colors.length];
  }

  avatarColor(name?: string): string {
    if (!name) {
      return '#063b8c';
    }

    const colors = [
      '#063b8c',
      '#0788a7',
      '#0ca7ad',
      '#5036a8',
      '#334155',
    ];

    let hash = 0;

    for (let index = 0; index < name.length; index++) {
      hash =
        name.charCodeAt(index) +
        ((hash << 5) - hash);
    }

    return colors[
      Math.abs(hash) % colors.length
    ];
  }

  initials(name?: string): string {
    if (!name?.trim()) {
      return '';
    }

    return name
      .trim()
      .split(/\s+/)
      .map((part) => part.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  performanceValue(
    trainee: CompanyDashboardTraineeDto
  ): number {
    return Math.round(
      Math.min(
        100,
        Math.max(
          0,
          Number(trainee.performancePercent || 0)
        )
      )
    );
  }

  riskReason(
    trainee: CompanyDashboardTraineeDto
  ): string {
    const attendance = Number(
      trainee.attendancePercent || 0
    );

    const performance = Number(
      trainee.performancePercent || 0
    );

    if (attendance < 75) {
      return `انخفاض الحضور (${Math.round(attendance)}%)`;
    }

    if (performance < 60) {
      return `انخفاض مستوى الأداء (${Math.round(performance)}%)`;
    }

    return 'يحتاج إلى متابعة الأداء';
  }

  currentAnimationKey(): number {
    return this.animationKey();
  }
}