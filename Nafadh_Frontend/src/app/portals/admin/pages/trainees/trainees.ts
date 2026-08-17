import { Component, OnInit, signal, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../services/admin-api';
import { TRAINEE_STATUS_LABELS } from '../../../../core/models/enums';

@Component({
  selector: 'app-admin-trainees',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './trainees.html',
  styleUrls: ['./trainees.css'],
  encapsulation: ViewEncapsulation.None // لفك عزل التنسيق وتمكين fixed من تغطية الشاشة بالكامل
})
export class AdminTrainees implements OnInit {
  trainees = signal<any[]>([]);
  statusFilter = signal<string>('الكل');

  // إدارة حالة النوافذ بـ Signals
  showImportModal = signal<boolean>(false);
  showRegisterModal = signal<boolean>(false);

  statusLabels: Record<string, string> = {
    ...TRAINEE_STATUS_LABELS,
    'Late': 'تأخر متكرر',
    'Completed': 'مكتمل',
    'InTraining': 'قيد التدريب',
    'NotAssigned': 'لم يوزّع بعد'
  };

  constructor(private api: AdminApi) {}

  ngOnInit() {
    this.api.getTrainees().subscribe((r) => this.trainees.set(r.items ?? []));
  }

  filtered() {
    const f = this.statusFilter();
    if (f === 'الكل') return this.trainees();
    return this.trainees().filter((t) => t.status === f);
  }

  labelFor(s: string): string {
    return this.statusLabels[s] ?? s;
  }

  getProgressValue(t: any): number {
    if (t.status === 'Completed' || t.status === 'مكتمل') {
      return 100;
    }
    return t.progress ?? 0;
  }

  getStatusStyle(status: string) {
    switch (status) {
      case 'Completed':
      case 'مكتمل':
        return { background: '#dcfce7', color: '#15803d' };
      case 'InTraining':
      case 'قيد التدريب':
        return { background: '#e0f2fe', color: '#0369a1' };
      case 'Late':
      case 'تأخر متكرر':
        return { background: '#fef3c7', color: '#b45309' };
      case 'NotAssigned':
      case 'لم يوزّع بعد':
      default:
        return { background: '#f1f5f9', color: '#475569' };
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.showImportModal.set(false);
    }
  }

  submitNewTrainee() {
    this.showRegisterModal.set(false);
  }
}