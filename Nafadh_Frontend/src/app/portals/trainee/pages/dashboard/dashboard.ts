import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TraineeApi } from '../../services/trainee-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { AnnouncementDto, TaskDto, TraineeDashboardSummaryDto } from '../../../../core/models/dtos';
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

  // معرفات اسم البرنامج والدفعة في الفرونت إند
  programName = signal<string>('برنامج تطوير مهارات الذكاء الاصطناعي');
  batchName = signal<string>('الدفعة الثالثة');

  summary = signal<TraineeDashboardSummaryDto | null>(null);
  tasks = signal<TaskDto[]>([]);
  announcements = signal<(AnnouncementDto & { source: string })[]>([]);

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