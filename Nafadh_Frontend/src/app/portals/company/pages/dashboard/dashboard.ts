import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { AnnouncementDto, ChartPointDto, CompanyDashboardDto, CompanyDashboardTraineeDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-company-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class CompanyDashboard implements OnInit {
  companyId = computed(() => this.auth.companyId ?? 0);
  
  loading = signal(false);
  capacity = signal<{ total?: number; used?: number; remaining?: number } | null>(null);
  topPerformers = signal<CompanyDashboardTraineeDto[]>([]);
  atRisk = signal<CompanyDashboardTraineeDto[]>([]);
  warnings = signal<CompanyDashboardDto['recentWarnings']>([]);
  totalTrainees = signal(0);
  activeTrainees = signal(0);
  announcements = signal<AnnouncementDto[]>([]);
  announcementsDismissed = signal(false);

  // حساب النسبة المئوية للسعة
  capacityPercent = computed(() => {
    const cap = this.capacity();
    if (!cap || !cap.total || cap.total === 0) return 0;
    return ((cap.used ?? 0) / cap.total) * 100;
  });

  attendanceWeeks = signal<ChartPointDto[]>([]);
  programDistribution = signal<ChartPointDto[]>([]);
  attendanceAverage = computed(() => {
    const weeks = this.attendanceWeeks();
    if (!weeks.length) return 0;
    return weeks.reduce((sum, w) => sum + w.value, 0) / weeks.length;
  });

  // enrollmentId per traineeId, used to route "متابعة"/eye buttons to the
  // real progress page (which is keyed by enrollmentId, not traineeId).
  private animationKey = signal(0);

  constructor(private api: CompanyApi, private auth: AuthService, private router: Router) {}

  ngOnInit() {
    this.refreshData();
  }

  refreshData() {
    const id = this.companyId();
    if (!id) return;

    this.loading.set(true);
    this.animationKey.update((v) => v + 1);

    this.api.getDashboard(id).subscribe({
      next: (d) => {
        this.capacity.set(d?.capacity ?? null);
        this.topPerformers.set(d?.topPerformers ?? []);
        this.atRisk.set(d?.atRiskTrainees ?? []);
        this.warnings.set(d?.recentWarnings ?? []);
        this.attendanceWeeks.set(d?.attendanceWeeks ?? []);
        this.programDistribution.set(d?.programDistribution ?? []);
        this.totalTrainees.set(d?.totalTrainees ?? 0);
        this.activeTrainees.set(d?.activeTrainees ?? 0);
        this.loading.set(false);
      },
      error: () => {
        this.capacity.set(null);
        this.topPerformers.set([]);
        this.atRisk.set([]);
        this.warnings.set([]);
        this.attendanceWeeks.set([]);
        this.programDistribution.set([]);
        this.totalTrainees.set(0);
        this.activeTrainees.set(0);
        this.loading.set(false);
      }
    });

    this.api.getPlatformAnnouncements().subscribe((d) => this.announcements.set(d ?? []));
  }

  openCompanyProfile() {
    this.router.navigate(['/company/profile']);
  }

  // No dedicated warnings page exists in this build — send the supervisor
  // to the trainees list, where the affected trainee can be found.
  openWarnings() {
    this.router.navigate(['/company/trainees']);
  }

  openProgress(enrollmentId: number) {
    if (enrollmentId) {
      this.router.navigate(['/company/trainees', enrollmentId, 'progress']);
    } else {
      this.router.navigate(['/company/trainees']);
    }
  }

  openGithub(url?: string) {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  dismissAnnouncements() {
    this.announcementsDismissed.set(true);
  }

  barPercent(value: number, max: number): number {
    if (!max || max === 0) return 0;
    return (value / max) * 100;
  }

  attendanceMax(): number {
    const weeks = this.attendanceWeeks();
    if (!weeks.length) return 100;
    return Math.max(...weeks.map(w => w.value), 100);
  }

  programMax(): number {
    const dist = this.programDistribution();
    if (!dist.length) return 100;
    return Math.max(...dist.map(p => p.value), 100);
  }

  programColor(index: number): string {
    const colors = ['#00338d', '#efbb20', '#28a745', '#17a2b8', '#6c757d'];
    return colors[index % colors.length];
  }

  avatarColor(name?: string): string {
    return '#00338d';
  }

  initials(name?: string): string {
    if (!name) return '';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  performanceValue(trainee: CompanyDashboardTraineeDto): number {
    return Math.round(Math.max(0, Math.min(100, trainee.performancePercent ?? 0)));
  }

  warningTraineeId(warning: CompanyDashboardDto['recentWarnings'][number]) {
    return warning.traineeId;
  }

  currentAnimationKey() { return this.animationKey(); }
}