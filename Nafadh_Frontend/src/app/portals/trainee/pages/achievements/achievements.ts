import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TraineeApi } from '../../services/trainee-api';
import { 
  BadgeDto, 
  CertificateDto, 
  FeedbackCriterionDto, 
  TraineeBadgeDto, 
  TraineeModuleProgressDto,
  FeedbackPendingDto,
  EnrollmentDto,
  ModuleDto
} from '../../../../core/models/dtos';

@Component({
  selector: 'app-trainee-achievements',
  imports: [CommonModule, FormsModule],
  templateUrl: './achievements.html',
})
export class TraineeAchievements implements OnInit {
  traineeId = 1;
  enrollmentId = 0;
  programId = 0;
  
  // البيانات
  allBadges = signal<BadgeDto[]>([]);
  myBadges = signal<TraineeBadgeDto[]>([]);
  certificates = signal<CertificateDto[]>([]);
  moduleProgress = signal<TraineeModuleProgressDto[]>([]);
  programModules = signal<ModuleDto[]>([]); // وحدات البرنامج
  enrollment = signal<EnrollmentDto | null>(null);
  
  // حالة التقييم
  showFeedback = signal(false);
  feedbackType = signal<'TrainerRating' | 'BatchExperienceRating'>('TrainerRating');
  criteria = signal<FeedbackCriterionDto[]>([]);
  scores: Record<number, number> = {};
  comment = '';
  
  // حالة التقييمات المعلقة
  pendingFeedback = signal<FeedbackPendingDto | null>(null);
  
  // نسبة إكمال البرنامج
  completionPercentage = signal(0);
  
  // التحقق من إمكانية تحميل الشهادة (85% فأكثر)
  canDownloadCertificate = computed(() => {
    return this.completionPercentage() >= 85;
  });

  // قائمة الوحدات المعروضة (دمج البرنامج مع التقدم)
  displayModules = computed(() => {
    const progressMap = new Map<number, TraineeModuleProgressDto>();
    this.moduleProgress().forEach(p => {
      progressMap.set(p.moduleId, p);
    });

    // إذا كان لدينا وحدات برنامج، استخدمها
    if (this.programModules().length > 0) {
      return this.programModules().map(module => {
        const progress = progressMap.get(module.moduleId);
        return {
          moduleId: module.moduleId,
          title: module.title || `وحدة ${module.moduleId}`,
          status: progress?.status || 'NotStarted',
          progress: progress?.status === 'Completed' ? 100 : progress?.status === 'InProgress' ? 50 : 0
        };
      });
    }

    // وإلا استخدم وحدات التقدم فقط
    return this.moduleProgress().map(p => ({
      moduleId: p.moduleId,
      title: p.moduleTitle || `وحدة ${p.moduleId}`,
      status: p.status,
      progress: p.status === 'Completed' ? 100 : p.status === 'InProgress' ? 50 : 0
    }));
  });

  constructor(private api: TraineeApi) {}

  ngOnInit() {
    this.getLoggedInUserId();
  }

  private getLoggedInUserId() {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key);
          if (val && val.startsWith('{')) {
            const parsed = JSON.parse(val);
            const foundId = parsed.traineeId || parsed.userId || parsed.id;
            if (foundId) {
              this.traineeId = Number(foundId);
              this.loadAllData();
              return;
            }
          }
        }
      }

      const token = localStorage.getItem('auth_token') || localStorage.getItem('token') || localStorage.getItem('user_session');
      if (token && token.includes('.')) {
        const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        const id = payload.traineeId || payload.userId || payload.nameid || payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'];
        if (id) {
          this.traineeId = Number(id);
          this.loadAllData();
        }
      }
    } catch (e) {
      console.warn('تنبيه قراءة التوكن:', e);
    }
  }

  loadAllData() {
    // جلب بيانات المتدرب
    this.api.getTrainee(this.traineeId).subscribe({
      next: (t) => {
        if (t) {
          this.enrollmentId = t.enrollmentId ?? 0;
          
          // جلب بيانات التسجيل
          if (this.enrollmentId) {
            this.api.getEnrollment(this.enrollmentId).subscribe({
              next: (e) => {
                this.enrollment.set(e);
                // الحصول على programId من التسجيل
                // ملاحظة: قد تحتاج لتعديل حسب هيكل الـ DTO
                if (e.batchId) {
                  // استخدام batchId مؤقتاً، يمكن تعديله حسب الحاجة
                  this.programId = e.batchId;
                  // جلب وحدات البرنامج
                  this.loadProgramModules(e.batchId);
                }
              },
              error: () => {}
            });
          }
        }
      },
      error: () => {}
    });

    // جلب تقدم الوحدات للمتدرب
    this.api.getModuleProgress(this.traineeId).subscribe({
      next: (d) => {
        this.moduleProgress.set(d ?? []);
        this.updateCompletionPercentage();
      },
      error: () => {}
    });

    // جلب نسبة الإكمال من الـ API مباشرة
    this.api.getModuleProgressPercentage(this.traineeId).subscribe({
      next: (percentage) => {
        this.completionPercentage.set(percentage || 0);
      },
      error: () => {}
    });

    // جلب الأوسمة
    this.api.getAllBadges().subscribe({
      next: (d) => this.allBadges.set(d ?? []),
      error: () => {}
    });
    
    this.api.getMyBadges(this.traineeId).subscribe({
      next: (d) => this.myBadges.set(d ?? []),
      error: () => {}
    });
    
    // جلب الشهادات
    this.api.getCertificates(this.traineeId).subscribe({
      next: (d) => this.certificates.set(d ?? []),
      error: () => {}
    });

    // جلب التقييمات المعلقة
    this.api.getFeedbackPending(1, this.traineeId).subscribe({
      next: (d) => this.pendingFeedback.set(d ?? null),
      error: () => {}
    });
  }

  // جلب وحدات البرنامج
  loadProgramModules(programId: number) {
    this.api.getModulesByProgram(programId).subscribe({
      next: (modules) => {
        this.programModules.set(modules ?? []);
      },
      error: () => {}
    });
  }

  // تحديث نسبة الإكمال من بيانات التقدم
  updateCompletionPercentage() {
    const progress = this.moduleProgress();
    if (progress.length === 0) {
      return;
    }
    
    const completed = progress.filter(m => m.status === 'Completed').length;
    const percentage = Math.round((completed / progress.length) * 100);
    this.completionPercentage.set(percentage);
  }

  isEarned(badgeId: number): boolean {
    return this.myBadges().some((b) => b.badgeId === badgeId);
  }

  openFeedback(type: 'TrainerRating' | 'BatchExperienceRating') {
    this.feedbackType.set(type);
    this.scores = {};
    this.api.getFeedbackCriteria(type).subscribe({
      next: (d) => this.criteria.set(d ?? []),
      error: () => {}
    });
    this.showFeedback.set(true);
  }

  submitFeedback() {
    const scores = Object.entries(this.scores).map(([criterionId, score]) => ({ 
      criterionId: Number(criterionId), 
      score 
    }));
    
    const feedbackData = {
      type: this.feedbackType(),
      traineeId: this.traineeId,
      moduleId: 1,
      comment: this.comment,
      scores,
    };
    
    this.api.submitFeedback(feedbackData).subscribe({
      next: () => {
        this.showFeedback.set(false);
        this.comment = '';
        this.scores = {};
        alert('✅ تم إرسال التقييم بنجاح!');
        // تحديث حالة التقييمات المعلقة
        this.api.getFeedbackPending(1, this.traineeId).subscribe({
          next: (d) => this.pendingFeedback.set(d ?? null),
          error: () => {}
        });
      },
      error: (err) => {
        console.error('خطأ في إرسال التقييم:', err);
        alert('❌ حدث خطأ في إرسال التقييم، يرجى المحاولة مرة أخرى');
      }
    });
  }

  downloadCertificate() {
    if (!this.canDownloadCertificate()) {
      alert('⚠️ عذراً، يجب أن تصل نسبة الإكمال إلى 85% لتنزيل الشهادة');
      return;
    }
    
    const certs = this.certificates();
    if (certs.length === 0) {
      alert('⚠️ لا توجد شهادة متاحة للتحميل حالياً');
      return;
    }
    
    this.api.downloadCertificate(certs[0].certificateId).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `شهادة_إتمام_التدريب_${Date.now()}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('خطأ في تحميل الشهادة:', err);
        alert('❌ حدث خطأ في تحميل الشهادة');
      }
    });
  }

  getBarColor(percentage: number): string {
    if (percentage >= 80) return '#0d9488';
    if (percentage >= 60) return '#f59e0b';
    return '#ef4444';
  }
}