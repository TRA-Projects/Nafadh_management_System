import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { forkJoin } from 'rxjs';

import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';

import {
  AnnouncementDto,
  CompanyDashboardChartPointDto,
  CompanyDashboardDto,
  CompanyDashboardTraineeDto,
} from '../../../../core/models/dtos';

@Component({
  selector: 'app-company-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss'],
})
export class CompanyDashboard implements OnInit {
  private readonly api = inject(CompanyApi);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /**
   * Company ID comes directly from the authenticated session.
   *
   * Important:
   * There is NO fallback company ID.
   *
   * If the authenticated Company Supervisor does not have a
   * companyId, the dashboard will not request another company's data.
   */
  readonly companyId = computed<number | null>(
    () => this.auth.companyId
  );

  // ============================================================
  // Loading / Error state
  // ============================================================

  loading = signal(false);

  loadError = signal(false);

  // ============================================================
  // Company
  // ============================================================

  /**
   * Company name is now supplied directly by CompanyDashboardDto.
   *
   * The Dashboard no longer calls CompanyAccount just to obtain
   * this value.
   */
  companyName = signal('الشركة المستضيفة');

  // ============================================================
  // Dashboard data
  // ============================================================

  capacity =
    signal<CompanyDashboardDto['capacity'] | null>(null);

  totalTrainees = signal(0);

  activeTrainees = signal(0);

  averageAttendancePercent = signal(0);

  topPerformers =
    signal<CompanyDashboardTraineeDto[]>([]);

  atRisk =
    signal<CompanyDashboardTraineeDto[]>([]);

  warnings =
    signal<CompanyDashboardDto['recentWarnings']>([]);

  attendanceWeeks =
    signal<CompanyDashboardChartPointDto[]>([]);

  programDistribution =
    signal<CompanyDashboardChartPointDto[]>([]);

  // ============================================================
  // Platform announcements
  // ============================================================

  announcements =
    signal<AnnouncementDto[]>([]);

  announcementsDismissed =
    signal(false);

  selectedOpportunity =
    signal<AnnouncementDto | null>(null);

  // ============================================================
  // Animation state
  // ============================================================

  animationKey = signal(0);

  barsAnimating = signal(false);

  // ============================================================
  // Computed values
  // ============================================================

  /**
   * Capacity percentage is derived only from the backend capacity
   * object returned by CompanyDashboardDto.
   */
  capacityPercent = computed(() => {
    const cap = this.capacity();

    if (!cap || cap.total <= 0) {
      return 0;
    }

    return Math.min(
      100,
      Math.max(
        0,
        (cap.used / cap.total) * 100
      )
    );
  });

  /**
   * Average attendance is now provided directly by the backend.
   *
   * We intentionally do NOT calculate it from attendanceWeeks,
   * because chart points are presentation data and should not
   * become the source of truth for a KPI.
   */
  attendanceAverage = computed(() => {
    return Math.round(
      Math.min(
        100,
        Math.max(
          0,
          Number(this.averageAttendancePercent() || 0)
        )
      )
    );
  });

  /**
   * Average performance of the displayed top performers.
   *
   * This remains a presentation-only calculation.
   * It is NOT used to determine who is a top performer.
   */
  topPerformersAverage = computed(() => {
    const trainees = this.topPerformers();

    if (!trainees.length) {
      return 0;
    }

    return Math.round(
      trainees.reduce(
        (sum, trainee) =>
          sum +
          Number(
            trainee.performancePercent || 0
          ),
        0
      ) / trainees.length
    );
  });

  // ============================================================
  // Lifecycle
  // ============================================================

  ngOnInit(): void {
    this.refreshData();
  }

  // ============================================================
  // Dashboard loading
  // ============================================================

  refreshData(): void {
    const companyId = this.companyId();

    /**
     * Security / correctness:
     *
     * Never use:
     *     companyId || 1
     *
     * If the authenticated session does not contain a company ID,
     * stop here instead of requesting company 1.
     */
    if (companyId === null || companyId <= 0) {
      console.error(
        'Company Dashboard cannot load because no valid companyId exists in the authenticated session.'
      );

      this.resetDashboardState();

      this.loading.set(false);
      this.loadError.set(true);

      return;
    }

    this.loading.set(true);
    this.loadError.set(false);
    this.barsAnimating.set(false);

    /**
     * Dashboard data:
     *
     * 1. CompanyDashboard endpoint provides all company statistics.
     * 2. Platform announcements remain a separate platform-level
     *    resource.
     *
     * The previous CompanyAccount request has been removed.
     */
    forkJoin({
      dashboard:
        this.api.getDashboard(companyId),

      announcements:
        this.api.getPlatformAnnouncements(),
    }).subscribe({
      next: ({
        dashboard,
        announcements,
      }) => {
        this.applyDashboardData(
          dashboard,
          announcements
        );

        this.loading.set(false);

        this.animationKey.update(
          value => value + 1
        );

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

        this.resetDashboardState();

        this.loading.set(false);
        this.loadError.set(true);
        this.barsAnimating.set(false);
      },
    });
  }

  // ============================================================
  // Apply backend response
  // ============================================================

  private applyDashboardData(
    dashboard: CompanyDashboardDto,
    announcements: AnnouncementDto[]
  ): void {
    /**
     * Company identity
     *
     * The company name now comes from the same dashboard response.
     */
    this.companyName.set(
      dashboard.companyName?.trim()
        || 'الشركة المستضيفة'
    );

    // ------------------------------------------------------------
    // Capacity
    // ------------------------------------------------------------

    this.capacity.set(
      dashboard.capacity ?? null
    );

    // ------------------------------------------------------------
    // Trainee counts
    // ------------------------------------------------------------

    this.totalTrainees.set(
      Number(
        dashboard.totalTrainees || 0
      )
    );

    this.activeTrainees.set(
      Number(
        dashboard.activeTrainees || 0
      )
    );

    // ------------------------------------------------------------
    // Attendance KPI
    // ------------------------------------------------------------

    this.averageAttendancePercent.set(
      Number(
        dashboard.averageAttendancePercent || 0
      )
    );

    // ------------------------------------------------------------
    // Top performers
    //
    // Backend already determined who belongs here.
    // Do not filter or recalculate their status locally.
    // ------------------------------------------------------------

    this.topPerformers.set(
      dashboard.topPerformers ?? []
    );

    // ------------------------------------------------------------
    // At-risk trainees
    //
    // Backend is the single source of truth.
    // No local status detection.
    // No 75% fallback rule.
    // No merging with top performers.
    // No duplicate map required.
    // ------------------------------------------------------------

    this.atRisk.set(
      dashboard.atRiskTrainees ?? []
    );

    // ------------------------------------------------------------
    // Warnings
    // ------------------------------------------------------------

    this.warnings.set(
      dashboard.recentWarnings ?? []
    );

    // ------------------------------------------------------------
    // Charts
    // ------------------------------------------------------------

    this.attendanceWeeks.set(
      dashboard.attendanceWeeks ?? []
    );

    this.programDistribution.set(
      dashboard.programDistribution ?? []
    );

    // ------------------------------------------------------------
    // Platform announcements
    // ------------------------------------------------------------

    this.announcements.set(
      announcements ?? []
    );
  }

  // ============================================================
  // Reset state
  // ============================================================

  private resetDashboardState(): void {
    this.companyName.set(
      'الشركة المستضيفة'
    );

    this.capacity.set(null);

    this.topPerformers.set([]);

    this.atRisk.set([]);

    this.warnings.set([]);

    this.totalTrainees.set(0);

    this.activeTrainees.set(0);

    this.averageAttendancePercent.set(0);

    this.attendanceWeeks.set([]);

    this.programDistribution.set([]);

    this.announcements.set([]);
  }

  // ============================================================
  // Navigation
  // ============================================================

  openCompanyProfile(): void {
    this.router.navigate([
      '/company/profile',
    ]);
  }

  openTrainees(): void {
    this.router.navigate([
      '/company/trainees',
    ]);
  }

  openWarnings(): void {
    this.router.navigate([
      '/company/trainees',
    ]);
  }

  openProgress(
    enrollmentId: number
  ): void {
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

  // ============================================================
  // External links
  // ============================================================

  ensureUrl(
    url?: string
  ): string {
    if (!url?.trim()) {
      return '';
    }

    const value = url.trim();

    return /^https?:\/\//i.test(value)
      ? value
      : `https://${value}`;
  }

  openGithub(
    url?: string
  ): void {
    this.openExternalUrl(url);
  }

  openLinkedIn(
    url?: string
  ): void {
    this.openExternalUrl(url);
  }

  private openExternalUrl(
    url?: string
  ): void {
    if (!url?.trim()) {
      return;
    }

    const value = url.trim();

    const normalized =
      /^https?:\/\//i.test(value)
        ? value
        : `https://${value}`;

    window.open(
      normalized,
      '_blank',
      'noopener,noreferrer'
    );
  }

  // ============================================================
  // Announcements
  // ============================================================

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

  announcementMessage(
    item: AnnouncementDto
  ): string {
    return (
      item.message
      || item.description
      || 'لا توجد تفاصيل إضافية لهذا الإعلان.'
    );
  }

  announcementDate(
    item: AnnouncementDto
  ): string | Date | undefined {
    return item.createdAt || item.date;
  }

  // ============================================================
  // Chart helpers
  // ============================================================

  barPercent(
    value: number,
    max: number
  ): number {
    if (!max || max <= 0) {
      return 0;
    }

    return Math.min(
      100,
      Math.max(
        0,
        (value / max) * 100
      )
    );
  }

  attendanceMax(): number {
    const weeks =
      this.attendanceWeeks();

    if (!weeks.length) {
      return 100;
    }

    return Math.max(
      100,
      ...weeks.map(
        week =>
          Number(
            week.value || 0
          )
      )
    );
  }

  programMax(): number {
    const programs =
      this.programDistribution();

    if (!programs.length) {
      return 1;
    }

    return Math.max(
      1,
      ...programs.map(
        program =>
          Number(
            program.value || 0
          )
      )
    );
  }

  programColor(
    index: number
  ): string {
    const colors = [
      '#063b8c',
      '#0788a7',
      '#0ca7ad',
      '#d9a400',
      '#5036a8',
      '#159cc7',
    ];

    return colors[
      index % colors.length
    ];
  }

  // ============================================================
  // Trainee display helpers
  // ============================================================

  avatarColor(
    name?: string
  ): string {
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

    for (
      let index = 0;
      index < name.length;
      index++
    ) {
      hash =
        name.charCodeAt(index)
        + ((hash << 5) - hash);
    }

    return colors[
      Math.abs(hash) % colors.length
    ];
  }

  initials(
    name?: string
  ): string {
    if (!name?.trim()) {
      return '';
    }

    return name
      .trim()
      .split(/\s+/)
      .map(
        part =>
          part.charAt(0)
      )
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
          Number(
            trainee.performancePercent || 0
          )
        )
      )
    );
  }

  /**
   * The risk reason is now supplied by the backend.
   *
   * This method exists only as a presentation helper.
   * It does NOT calculate risk anymore.
   */
  riskReason(
    trainee: CompanyDashboardTraineeDto
  ): string {
    return (
      trainee.riskReason?.trim()
      || 'يحتاج إلى متابعة الأداء'
    );
  }

  currentAnimationKey(): number {
    return this.animationKey();
  }
}