import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms'; // تم إضافة FormsModule
import { AdminApi } from '../../services/admin-api';
import { TraineeProfileDto } from '../../../../core/models/dtos';
import { TRAINEE_STATUS_LABELS } from '../../../../core/models/enums';

@Component({
  selector: 'app-admin-trainee-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './trainee-profile.html',
  styleUrls: ['./trainee-profile.css']
})
export class AdminTraineeProfile implements OnInit {
  trainee = signal<TraineeProfileDto | any>(null);
  statusLabels: Record<string, string> = TRAINEE_STATUS_LABELS;

  // إدارة حالة نافذة التجميد
  isFreezeModalOpen = signal<boolean>(false);
  freezeReason = signal<string>('');

  // القيم الإحصائية
  attendanceRate = signal<number>(91);
  averageScore = signal<number>(87.4);
  warningsCount = signal<number>(1);
  absenceDays = signal<number>(3);

  // قائمة التقييمات مع الألوان
  evaluationList = signal([
    { title: 'التقييم التقني', score: 88, color: '#0d9488' },
    { title: 'التقييم السلوكي', score: 85, color: '#2563eb' },
    { title: 'تقييم المنتصف', score: 82, color: '#d97706' },
    { title: 'التقييم النهائي', score: 91, color: '#0d9488' }
  ]);

  // شبكة الحضور
  attendanceGrid = signal<Array<{ date: string; status: 'present' | 'late' | 'absent'; label: string }>>([]);

  constructor(
    private route: ActivatedRoute, 
    private api: AdminApi
  ) {}

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    
    this.api.getTrainee(id).subscribe({
      next: (t) => {
        this.trainee.set(t);
      },
      error: () => {
        this.trainee.set({
          fullName: 'خالد سعيد المطيري',
          major: 'هندسة برمجيات',
          university: 'جامعة الملك سعود',
          companyName: 'شركة التقنية المتقدمة',
          nationalId: 'T-2401',
          status: 'InTraining',
          batch: 'الدفعة 12'
        });
      }
    });

    this.generateAttendanceData();
  }

  // دوال التحكم بنقذة التجميد
  openFreezeModal() {
    this.isFreezeModalOpen.set(true);
  }

  closeFreezeModal() {
    this.isFreezeModalOpen.set(false);
    this.freezeReason.set('');
  }

  confirmFreeze() {
    if (!this.freezeReason().trim()) return;

    // استدعاء الـ API لإرسال سبب التجميد وتحديث الحالة
    console.log('تم التجميد بنجاح، السبب:', this.freezeReason());

    // إغلاق النافذة
    this.closeFreezeModal();
  }

  getInitials(name: string | undefined): string {
    if (!name) return 'خ م';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[1].charAt(0)}`;
    }
    return name.slice(0, 2);
  }

  getStatusStyle(status: string) {
    switch (status) {
      case 'Completed':
      case 'مكتمل':
        return { background: '#dcfce7', color: '#15803d' };
      case 'InTraining':
      case 'نشط':
      case 'قيد التدريب':
        return { background: '#dcfce7', color: '#16a34a' };
      default:
        return { background: '#f1f5f9', color: '#475569' };
    }
  }

  generateAttendanceData() {
    const statuses: Array<'present' | 'late' | 'absent'> = [
      'present', 'present', 'absent', 'present', 'present', 'present', 'present', 'present',
      'present', 'present', 'present', 'present', 'present', 'absent', 'present', 'present',
      'absent', 'present', 'present', 'present', 'present', 'late', 'absent', 'present',
      'absent', 'present', 'present', 'present', 'present', 'present', 'absent', 'present'
    ];

    const grid = statuses.map((status, index) => ({
      date: `اليوم ${index + 1}`,
      status: status,
      label: status === 'present' ? 'حاضر' : status === 'late' ? 'متأخر' : 'غائب'
    }));

    this.attendanceGrid.set(grid);
  }
}