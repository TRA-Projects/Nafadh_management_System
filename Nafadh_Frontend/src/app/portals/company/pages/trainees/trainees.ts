
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

type TraineeStatus =
  | 'active'
  | 'risk'
  | 'completed'
  | 'transferred'
  | 'suspended';

type SocialPlatform = 'github' | 'linkedin';

interface Trainee {
  enrollmentId?: number;

  id: number;
  name: string;
  cohort: string;
  program: string;
  dept: string;
  proj: string;
  sup: string;
  att: number;
  perf: number;
  status: TraineeStatus;
  start: string;
  end: string;
  pend: number;
  abs: number;
  late: number;
  githubUrl?: string;
  linkedinUrl?: string;
}

type Modal = 'add' | 'profile' | 'assign' | 'status' | null;

@Component({
  selector: 'app-company-trainees',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './trainees.html',
  styleUrl: './trainees.scss'
})
export class CompanyTrainees {
  constructor(private router: Router) { }

  openTraineeDetails(t: Trainee): void {
    this.router.navigate([
      '/company/trainees',
      t.id,
      'progress'
    ]);
  }
  // بيانات المتدربين التجريبية
  trainees: Trainee[] = [
    {
      id: 1,
      name: 'أحمد محمد الزهراني',
      cohort: 'الدفعة 2026-أ',
      program: 'تطوير تطبيقات الويب',
      dept: 'تقنية المعلومات',
      proj: 'بوابة الطلبات الداخلية',
      sup: 'خالد بن عبدالله المعمري',
      att: 98,
      perf: 92,
      status: 'active',
      start: '2026-01-04',
      end: '2026-06-30',
      pend: 0,
      abs: 0,
      late: 1,
      githubUrl: 'https://github.com/AhmedSoliman',
      linkedinUrl: 'https://www.linkedin.com/in/ahmed-al-balushi-1193aaa/'
    },
    {
      id: 2,
      name: 'فاطمة بنت خميس العبرية',
      cohort: 'الدفعة 2026-أ',
      program: 'تطوير تطبيقات الويب',
      dept: 'تطوير الأعمال',
      proj: 'لوحة متابعة المبيعات',
      sup: 'سعاد بنت محمد الشامسية',
      att: 96,
      perf: 90,
      status: 'active',
      start: '2026-01-04',
      end: '2026-06-30',
      pend: 0,
      abs: 1,
      late: 0,
      githubUrl: 'https://github.com/codewithfatima',
      linkedinUrl: 'https://www.linkedin.com/in/fatima-al-abri-15383a91/'
    },
    {
      id: 3,
      name: 'يوسف بن سالم الحارثي',
      cohort: 'الدفعة 2026-ب',
      program: 'تحليل البيانات',
      dept: 'العمليات',
      proj: 'تقرير تحليلي للفروع',
      sup: 'خالد بن عبدالله المعمري',
      att: 93,
      perf: 84,
      status: 'active',
      start: '2026-02-01',
      end: '2026-07-31',
      pend: 1,
      abs: 2,
      late: 2,
      githubUrl: '',
      linkedinUrl: ''
    },
    {
      id: 4,
      name: 'مريم بنت راشد السيابية',
      cohort: 'الدفعة 2026-ب',
      program: 'تحليل البيانات',
      dept: 'الموارد البشرية',
      proj: 'لوحة مؤشرات الموظفين',
      sup: 'سعاد بنت محمد الشامسية',
      att: 89,
      perf: 81,
      status: 'active',
      start: '2026-02-01',
      end: '2026-07-31',
      pend: 1,
      abs: 2,
      late: 1,
      githubUrl: '',
      linkedinUrl: ''
    },
    {
      id: 5,
      name: 'خالد بن عبدالله العامري',
      cohort: 'الدفعة 2026-ج',
      program: 'الأمن السيبراني',
      dept: 'تقنية المعلومات',
      proj: 'التدقيق الأمني للأنظمة',
      sup: 'طارق بن جمعة السالمي',
      att: 95,
      perf: 88,
      status: 'active',
      start: '2026-03-15',
      end: '2026-09-15',
      pend: 0,
      abs: 1,
      late: 0,
      githubUrl: '',
      linkedinUrl: ''
    },
    {
      id: 6,
      name: 'نورة بنت حمد الهنائية',
      cohort: 'الدفعة 2026-ج',
      program: 'الأمن السيبراني',
      dept: 'العمليات',
      proj: 'سياسات الحماية والامتثال',
      sup: 'طارق بن جمعة السالمي',
      att: 91,
      perf: 79,
      status: 'active',
      start: '2026-03-15',
      end: '2026-09-15',
      pend: 1,
      abs: 2,
      late: 2,
      githubUrl: '',
      linkedinUrl: ''
    },
    {
      id: 7,
      name: 'سعيد بن محمد البوسعيدي',
      cohort: 'الدفعة 2026-أ',
      program: 'تطوير تطبيقات الويب',
      dept: 'تقنية المعلومات',
      proj: 'تطبيق الجوال الداخلي',
      sup: 'خالد بن عبدالله المعمري',
      att: 84,
      perf: 70,
      status: 'risk',
      start: '2026-01-04',
      end: '2026-06-30',
      pend: 2,
      abs: 3,
      late: 6,
      githubUrl: '',
      linkedinUrl: ''
    },
    {
      id: 8,
      name: 'رقية بنت علي الشحية',
      cohort: 'الدفعة 2026-ب',
      program: 'تحليل البيانات',
      dept: 'المبيعات',
      proj: 'تحليل سلوك العملاء',
      sup: 'سعاد بنت محمد الشامسية',
      att: 97,
      perf: 94,
      status: 'active',
      start: '2026-02-01',
      end: '2026-07-31',
      pend: 0,
      abs: 0,
      late: 0,
      githubUrl: '',
      linkedinUrl: ''
    },
    {
      id: 9,
      name: 'عمر بن ناصر الفارسي',
      cohort: 'الدفعة 2026-أ',
      program: 'تطوير تطبيقات الويب',
      dept: 'تقنية المعلومات',
      proj: 'بوابة الموظفين',
      sup: 'خالد بن عبدالله المعمري',
      att: 88,
      perf: 76,
      status: 'risk',
      start: '2026-01-04',
      end: '2026-06-30',
      pend: 1,
      abs: 2,
      late: 3,
      githubUrl: '',
      linkedinUrl: ''
    },
    {
      id: 10,
      name: 'شيماء بنت سيف البطاشية',
      cohort: 'الدفعة 2026-ج',
      program: 'الأمن السيبراني',
      dept: 'تقنية المعلومات',
      proj: 'اختبار اختراق تجريبي',
      sup: 'طارق بن جمعة السالمي',
      att: 90,
      perf: 85,
      status: 'active',
      start: '2026-03-15',
      end: '2026-09-15',
      pend: 1,
      abs: 1,
      late: 1,
      githubUrl: '',
      linkedinUrl: ''
    },
    {
      id: 11,
      name: 'طارق بن سيف الرواحي',
      cohort: 'الدفعة 2026-ب',
      program: 'تحليل البيانات',
      dept: 'التسويق',
      proj: 'تحليل الحملات التسويقية',
      sup: 'ليلى بنت ناصر الكيومية',
      att: 78,
      perf: 62,
      status: 'risk',
      start: '2026-02-01',
      end: '2026-07-31',
      pend: 2,
      abs: 4,
      late: 2,
      githubUrl: '',
      linkedinUrl: ''
    },
    {
      id: 12,
      name: 'أمل بنت سلطان الزدجالية',
      cohort: 'الدفعة 2026-أ',
      program: 'تطوير تطبيقات الويب',
      dept: 'الموارد البشرية',
      proj: 'منصة التدريب الداخلي',
      sup: 'سعاد بنت محمد الشامسية',
      att: 99,
      perf: 95,
      status: 'active',
      start: '2026-01-04',
      end: '2026-06-30',
      pend: 0,
      abs: 0,
      late: 0,
      githubUrl: '',
      linkedinUrl: ''
    },
    {
      id: 13,
      name: 'سالم بن حمد الخروصي',
      cohort: 'الدفعة 2026-ب',
      program: 'تحليل البيانات',
      dept: '—',
      proj: '—',
      sup: '—',
      att: 0,
      perf: 0,
      status: 'transferred',
      start: '2026-02-01',
      end: '2026-04-10',
      pend: 0,
      abs: 0,
      late: 0,
      githubUrl: '',
      linkedinUrl: ''
    },
    {
      id: 14,
      name: 'بدر بن سليمان الحبسي',
      cohort: 'الدفعة 2026-أ',
      program: 'تطوير تطبيقات الويب',
      dept: '—',
      proj: '—',
      sup: '—',
      att: 0,
      perf: 0,
      status: 'suspended',
      start: '2026-01-04',
      end: '2026-03-20',
      pend: 0,
      abs: 7,
      late: 0,
      githubUrl: '',
      linkedinUrl: ''
    }
  ];
  openGithub(t: Trainee): void {
    const url = t.githubUrl?.trim() || 'https://github.com/';
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  openLinkedin(t: Trainee): void {
    const url = t.linkedinUrl?.trim() || 'https://www.linkedin.com/';
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // البحث والتصفية
  search = '';
  cohort = '';
  program = '';
  status = '';
  supervisor = '';

  // البحث حسب التاريخ
  fromDate = '';
  toDate = '';

  // النوافذ المنبثقة
  modal: Modal = null;
  selected: Trainee | null = null;
  draft: Partial<Trainee> = {};

  readonly statuses: { value: TraineeStatus; label: string }[] = [
    { value: 'active', label: 'نشط' },
    { value: 'risk', label: 'متعثر' },
    { value: 'completed', label: 'مكتمل' },
    { value: 'transferred', label: 'منقول' },
    { value: 'suspended', label: 'موقوف' }
  ];

  // قوائم الفلاتر
  get cohorts(): string[] {
    return [...new Set(this.trainees.map(t => t.cohort))];
  }

  get programs(): string[] {
    return [...new Set(this.trainees.map(t => t.program))];
  }

  get supervisors(): string[] {
    return [
      ...new Set(
        this.trainees
          .map(t => t.sup)
          .filter(s => s !== '—')
      )
    ];
  }

  // تصفية المتدربين
  get filteredTrainees(): Trainee[] {
    const q = this.search.trim().toLowerCase();

    return this.trainees.filter(t => {
      const matchesSearch =
        !q ||
        [t.name, t.proj, t.sup, String(t.id)]
          .some(value => value.toLowerCase().includes(q));

      const matchesCohort =
        !this.cohort || t.cohort === this.cohort;

      const matchesProgram =
        !this.program || t.program === this.program;

      const matchesStatus =
        !this.status || t.status === this.status;

      const matchesSupervisor =
        !this.supervisor || t.sup === this.supervisor;

      const matchesFromDate =
        !this.fromDate ||
        (!!t.start && t.start !== '—' && t.start >= this.fromDate);

      const matchesToDate =
        !this.toDate ||
        (!!t.start && t.start !== '—' && t.start <= this.toDate);

      return (
        matchesSearch &&
        matchesCohort &&
        matchesProgram &&
        matchesStatus &&
        matchesSupervisor &&
        matchesFromDate &&
        matchesToDate
      );
    });
  }

  // اسم الحالة بالعربي
  statusLabel(s: TraineeStatus): string {
    return this.statuses.find(x => x.value === s)?.label || s;
  }

  // الأحرف الأولى من الاسم
  initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join('');
  }

  // مسح جميع الفلاتر
  clearFilters(): void {
    this.search = '';
    this.cohort = '';
    this.program = '';
    this.status = '';
    this.supervisor = '';
    this.fromDate = '';
    this.toDate = '';
  }

  // فتح نافذة إضافة متدرب
  openAdd(): void {
    this.selected = null;

    this.draft = {
      name: '',
      cohort: this.cohorts[0] || '',
      program: this.programs[0] || '',
      dept: '',
      proj: '',
      sup: '—',
      start: this.todayLocal(),
      end: '',
      githubUrl: '',
      linkedinUrl: ''
    };

    this.modal = 'add';
  }

  // تاريخ اليوم بصيغة YYYY-MM-DD
  private todayLocal(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  // عرض الملف المختصر
  openProfile(t: Trainee): void {
    this.selected = t;
    this.modal = 'profile';
  }

  // تعيين المشرف
  openAssign(t: Trainee): void {
    this.selected = t;
    this.draft = { ...t };
    this.modal = 'assign';
  }

  // تغيير الحالة
  openStatus(t: Trainee): void {
    this.selected = t;
    this.draft = { status: t.status };
    this.modal = 'status';
  }

  // التحقق من رابط الحساب
  private isValidSocialUrl(
    url: string,
    platform: SocialPlatform
  ): boolean {
    try {
      const parsed = new URL(url.trim());

      const allowedHosts: Record<SocialPlatform, string[]> = {
        github: ['github.com', 'www.github.com'],
        linkedin: [
          'linkedin.com',
          'www.linkedin.com',
          'uk.linkedin.com'
        ]
      };

      return (
        parsed.protocol === 'https:' &&
        allowedHosts[platform].includes(parsed.hostname.toLowerCase()) &&
        parsed.username === '' &&
        parsed.password === ''
      );
    } catch {
      return false;
    }
  }

  // فتح الحساب في تبويب جديد
  openSocialLink(
    url: string | undefined,
    platform: SocialPlatform
  ): void {
    if (!url?.trim()) {
      alert('رابط الحساب غير متوفر لهذا المتدرب.');
      return;
    }

    if (!this.isValidSocialUrl(url, platform)) {
      alert('الرابط غير صالح. يرجى إدخال رابط HTTPS صحيح للمنصة.');
      return;
    }

    window.open(url.trim(), '_blank', 'noopener,noreferrer');
  }

  // حفظ روابط الحسابات داخل بيانات المتدرب الحالية
  saveProfileLinks(): void {
    if (!this.selected) {
      return;
    }

    const github = this.selected.githubUrl?.trim() || '';
    const linkedin = this.selected.linkedinUrl?.trim() || '';

    if (github && !this.isValidSocialUrl(github, 'github')) {
      alert('رابط GitHub غير صحيح. استخدمي رابطًا يبدأ بـ https://github.com/');
      return;
    }

    if (linkedin && !this.isValidSocialUrl(linkedin, 'linkedin')) {
      alert('رابط LinkedIn غير صحيح.');
      return;
    }

    this.selected.githubUrl = github;
    this.selected.linkedinUrl = linkedin;

    alert('تم حفظ الروابط في بيانات الصفحة الحالية.');
  }

  // إغلاق النافذة
  closeModal(): void {
    this.modal = null;
    this.selected = null;
    this.draft = {};
  }

  // حفظ الإضافة أو التعديل
  save(): void {
    if (this.modal === 'add') {
      if (!this.draft.name?.trim()) {
        alert('يرجى إدخال اسم المتدرب.');
        return;
      }

      const github = this.draft.githubUrl?.trim() || '';
      const linkedin = this.draft.linkedinUrl?.trim() || '';

      if (github && !this.isValidSocialUrl(github, 'github')) {
        alert('يرجى إدخال رابط GitHub صحيح.');
        return;
      }

      if (linkedin && !this.isValidSocialUrl(linkedin, 'linkedin')) {
        alert('يرجى إدخال رابط LinkedIn صحيح.');
        return;
      }

      const newTrainee: Trainee = {
        id: Math.max(0, ...this.trainees.map(t => t.id)) + 1,
        name: this.draft.name.trim(),
        cohort: this.draft.cohort || '',
        program: this.draft.program || '',
        dept: this.draft.dept || '—',
        proj: this.draft.proj || '—',
        sup: this.draft.sup || '—',
        att: 0,
        perf: 0,
        status: 'active',
        start: this.draft.start || '',
        end: this.draft.end || '—',
        pend: 0,
        abs: 0,
        late: 0,
        githubUrl: github,
        linkedinUrl: linkedin
      };

      this.trainees = [...this.trainees, newTrainee];

    } else if (this.selected && this.modal === 'assign') {
      Object.assign(this.selected, {
        sup: this.draft.sup || '—',
        dept: this.draft.dept || '—',
        start: this.draft.start || '—',
        end: this.draft.end || '—'
      });

    } else if (
      this.selected &&
      this.modal === 'status' &&
      this.draft.status
    ) {
      this.selected.status = this.draft.status;
    }

    this.closeModal();
  }

  // تصدير النتائج الحالية بصيغة CSV المناسبة لبرنامج Excel
  exportExcel(): void {
    const headers = [
      'الرقم',
      'الاسم',
      'الدفعة',
      'البرنامج',
      'القسم',
      'المشروع',
      'المشرف',
      'الحضور',
      'الأداء',
      'الحالة',
      'المباشرة',
      'النهاية',
      'GitHub',
      'LinkedIn'
    ];

    const rows = this.filteredTrainees.map(t => [
      t.id,
      t.name,
      t.cohort,
      t.program,
      t.dept,
      t.proj,
      t.sup,
      t.att,
      t.perf,
      this.statusLabel(t.status),
      t.start,
      t.end,
      t.githubUrl || '',
      t.linkedinUrl || ''
    ]);

    const csv = '\uFEFF' +
      [headers, ...rows]
        .map(row =>
          row
            .map(value =>
              '"' + String(value ?? '').replace(/"/g, '""') + '"'
            )
            .join(',')
        )
        .join('\r\n');

    const blob = new Blob(
      [csv],
      { type: 'text/csv;charset=utf-8;' }
    );

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'trainees.csv';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }
}
