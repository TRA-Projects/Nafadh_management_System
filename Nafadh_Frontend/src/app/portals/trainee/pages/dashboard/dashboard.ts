import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TraineeApi } from '../../services/trainee-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { AnnouncementDto, TaskDto, TraineeDashboardSummaryDto } from '../../../../core/models/dtos';
import { TRAINEE_STATUS_LABELS } from '../../../../core/models/enums';
import { NfdIcon } from '../../../../shared/ui/icon/icon';

@Component({
  selector: 'app-trainee-dashboard',
  imports: [CommonModule, NfdIcon, RouterLink],
  templateUrl: './dashboard.html',
})
export class TraineeDashboard implements OnInit {
  traineeId = 1;
  companyId = 1;
  batchId = 1;

  programName = signal<string>('برنامج تطوير مهارات الذكاء الاصطناعي');
  batchName = signal<string>('الدفعة الثالثة');
  programEndDate = '2026-12-31';

  summary = signal<TraineeDashboardSummaryDto | null>(null);
  tasks = signal<TaskDto[]>([]);
  announcements = signal<(AnnouncementDto & { source: string })[]>([]);

  // تحويل الحالة البرمجية إلى النص العربي الصحيح المعرف في ملف Enums
  calculatedStatus = computed(() => {
    const status = this.summary()?.status;
    if (status && TRAINEE_STATUS_LABELS[status]) {
      return TRAINEE_STATUS_LABELS[status];
    }
    const today = new Date();
    const endDate = new Date(this.programEndDate);
    return today > endDate ? 'منتهي' : 'قيد التدريب';
  });

  constructor(private api: TraineeApi, public auth: AuthService) {}

  ngOnInit() {
    this.api.getDashboardSummary(this.traineeId).subscribe((d) => this.summary.set(d));
    this.api.getTasks(this.batchId).subscribe((d) => this.tasks.set((d ?? []).slice(0, 3)));

    this.api.getPlatformAnnouncements().subscribe((d) => this.mergeAnnouncements(d, 'الهيئة'));
    this.api.getCompanyAnnouncements(this.companyId).subscribe((d) => this.mergeAnnouncements(d, 'الشركة'));
    this.api.getBatchAnnouncements(this.batchId).subscribe((d) => this.mergeAnnouncements(d, 'المدرب'));
  }

  private mergeAnnouncements(items: AnnouncementDto[], source: string) {
    this.announcements.update((list) => [...list, ...(items ?? []).map((a) => ({ ...a, source }))]);
  }
}