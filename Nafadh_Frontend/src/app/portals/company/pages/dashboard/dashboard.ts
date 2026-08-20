import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { CompanyApi } from '../../services/company-api';
import { AuthService } from '../../../../core/auth/auth.service';
import { AnnouncementDto, ChartPointDto, TraineeListItemDto, WarningDto } from '../../../../core/models/dtos';

export interface OpportunityDetail {
  title: string;
  targetMajor: string;
  goals: string[];
  description: string;
  requirements: string[];
  deadline: string;
}

@Component({
  selector: 'app-company-dashboard',
  standalone: true,
  imports: [CommonModule, DecimalPipe, DatePipe],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class CompanyDashboard implements OnInit {
  companyId = computed(() => this.auth.companyId ?? 0);
  
  loading = signal(false);
  capacity = signal<{ total?: number; used?: number; remaining?: number } | null>(null);
  topPerformers = signal<TraineeListItemDto[]>([]);
  atRisk = signal<TraineeListItemDto[]>([]);
  warnings = signal<WarningDto[]>([]);
  announcements = signal<AnnouncementDto[]>([]);
  announcementsDismissed = signal(false);

  // حالة النافذة المنبثقة للإعلان الرسمي المحدد
  selectedOpportunity = signal<OpportunityDetail | null>(null);

  // قائمة الفرص التدريبية الافتراضية المطابقة لتصميم الإعلان الرسمي
  defaultOpportunities: OpportunityDetail[] = [
    {
      title: 'إعلان تدريب مقرون بالتوظيف',
      targetMajor: 'خريجي تخصص القانون وتقنية المعلومات',
      goals: [
        'تطوير المهارات الأساسية والتخصصية.',
        'توفير فرص تدريبية لاكتساب الخبرات العملية.',
        'تعزيز فرص التوظيف للمشاركين في سوق العمل من خلال تدريب مكثف وعملي.'
      ],
      description: 'برنامج تدريبي مكثف مقرون بالتوظيف تقدمه هيئة تنظيم الخدمات العامة لتطوير مهارات الباحثين عن عمل المؤهلين في الجانب التخصصي والجانب التنظيمي، للارتقاء بمستواهم المهني والعمل بكفاءة.',
      requirements: [
        'أن يكون المتقدم عماني الجنسية.',
        'أن يكون محمود السيرة، حسن السمعة، وألا يكون قد صدرت ضده أحكام قضائية مخلة بالشرف أو الأمانة.',
        'أن يكون مسجلاً "كباحث عن عمل" في وزارة العمل.',
        'أن يكون حاصلاً على الدرجة العلمية المطلوبة من إحدى المؤسسات التعليمية المعترف بها.',
        'ألا يتجاوز عمر المتقدم 28 عاماً من تاريخ نشر الإعلان.'
      ],
            deadline: '2026-09-20'

    },
    {
      title: 'برنامج تطوير تطبيقات الويب Full-Stack',
      targetMajor: 'خريجي علوم الحاسب الآلي وهندسة البرمجيات',
      goals: [
        'إتقان تطوير الأنظمة البرمجية المتكاملة باستخدام Angular و .NET Core.',
        'اكتساب الخبرة العملية من خلال المشاركة في مشاريع حقيقية.',
        'تهيئة المشاركين للعمل في قطاع الاتصالات والتقنية.'
      ],
      description: 'فرصة تدريبية مكثفة لتطوير المنظومات البرمجية ورفع كفاءة الكوادر الوطنية في مجالات تطوير الويب.',
      requirements: [
        'إتقان لغات HTML, CSS, JavaScript/TypeScript.',
        'معرفة أساسية بقواعد البيانات SQL Server.',
        'التفرغ التام خلال فترة التدريب (3 أشهر).'
      ],
      deadline: '2026-09-11'
    },
    {
      title: 'فرصة تدريب في تحليل البيانات والذكاء الاصطناعي',
      targetMajor: 'خريجي تقنية المعلومات والإحصاء',
      goals: [
        'معالجة وتحليل البيانات الضخمة لدعم اتخاذ القرار.',
        'بناء وتدريب نماذج الذكاء الاصطناعي.',
        'العمل المباشر مع خبراء البيانات في الشركات الكبرى.'
      ],
      description: 'تدريب عملي متقدم في مجال تحليل البيانات والذكاء الاصطناعي وتوظيفه لحل التحديات التشغيلية.',
      requirements: [
        'خلفية أكاديمية في علوم الحاسوب أو إحصاء البيانات.',
        'معرفة جيدة بلغة Python ومكتبات التحليل.',
        'معدل أكاديمي لا يقل عن 2.8 / 4.0.'
      ],
      deadline: '2026-10-23'
    },
    {
      title: 'برنامج إدارة مشاريع وتقنية المعلومات',
      targetMajor: 'خريجي نظم اطلاعات إدارية وإدارة الأعمال',
      goals: [
        'تطبيق منهجيات Agile و Scrum في بيئة العمل التقنية.',
        'إدارة الموارد والجداول الزمنية للمشاريع بفاعلية.',
        'اكتساب المهارات القيادية وإدارة فرق العمل.'
      ],
      description: 'تدريب ميداني شامل في إدارة المشاريع التقنية ومتابعة سير العمل وفق أحدث المعايير العالمية.',
      requirements: [
        'إجادة اللغة الإنجليزية تحدثاً وكتابة.',
        'مهارات تواصل وتنظيم عالية.',
        'الإلمام بأدوات إدارة المشاريع مثل Jira.'
      ],
      deadline: '2026-10-19'
    }
  ];

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

  private enrollmentIdByTrainee = new Map<number, number>();

  constructor(private api: CompanyApi, private auth: AuthService, private router: Router) {}

  ngOnInit() {
    this.refreshData();
  }

  refreshData() {
    const id = this.companyId();
    if (!id) return;

    this.loading.set(true);
    this.api.getCapacity(id).subscribe({
      next: (d) => this.capacity.set(d),
      complete: () => this.loading.set(false)
    });
    this.api.getTopPerformers(id).subscribe((d) => this.topPerformers.set(d ?? []));
    this.api.getAtRiskTrainees(id).subscribe((d) => this.atRisk.set(d ?? []));
    this.api.getCompanyWarnings(id).subscribe((d) => this.warnings.set(d ?? []));
    this.api.getPlatformAnnouncements().subscribe((d) => this.announcements.set(d ?? []));
    this.api.getAttendanceChart(id).subscribe((d) => this.attendanceWeeks.set(d?.weeks ?? []));
    this.api.getProgramDistribution(id).subscribe((d) => this.programDistribution.set(d ?? []));
    this.api.getEnrollmentsByCompany(id).subscribe((d) => {
      this.enrollmentIdByTrainee.clear();
      (d ?? []).forEach((e) => this.enrollmentIdByTrainee.set(e.traineeId, e.enrollmentId));
    });
  }

  // دالة فتح النافذة المنبثقة وعرض تفاصيل الإعلان بالتنسيق المخصص
  openOpportunityModal(item?: AnnouncementDto | null, index: number = 0) {
    const fallback = this.defaultOpportunities[index % this.defaultOpportunities.length];
    
    const rawDate = item?.createdAt || item?.date || fallback.deadline;
    const formattedDate = rawDate ? String(rawDate).split('T')[0] : fallback.deadline;

    this.selectedOpportunity.set({
      title: item?.title || fallback.title,
      targetMajor: (item as any)?.targetMajor || fallback.targetMajor,
      goals: (item as any)?.goals || fallback.goals,
      description: item?.description || fallback.description,
      requirements: (item as any)?.requirements || fallback.requirements,
      deadline: (item as any)?.deadline || formattedDate
    });
  }

  closeOpportunityModal() {
    this.selectedOpportunity.set(null);
  }

  openCompanyProfile() {
    this.router.navigate(['/company/profile']);
  }

  openWarnings() {
    this.router.navigate(['/company/trainees']);
  }

  openProgress(traineeId?: number) {
    if (!traineeId) {
      this.router.navigate(['/company/trainees']);
      return;
    }

    const enrollmentId = this.enrollmentIdByTrainee.get(traineeId);
    if (enrollmentId) {
      this.router.navigate(['/company/trainees', enrollmentId, 'progress']);
    } else {
      this.router.navigate(['/company/trainees']);
    }
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
    if (!dist.length) return 1;
    return Math.max(...dist.map(p => p.value));
  }

  programColor(index: number): string {
    const colors = ['#00529b', '#0099b8', '#0d9488', '#ca8a04', '#9333ea', '#0284c7'];
    return colors[index % colors.length];
  }

  avatarColor(name?: string): string {
    if (!name) return '#00529b';
    const colors = ['#00529b', '#0099b8', '#0d9488', '#9333ea', '#0284c7'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }

  initials(name?: string): string {
    if (!name) return '';
    return name.trim().split(/\s+/).map(n => n[0]).join('').substring(0, 2).toUpperCase();
  }

  performanceValue(trainee: TraineeListItemDto, index: number): number {
    return (trainee as any).performanceScore ?? (95 - index * 2);
  }
}