import {
  Component,
  HostListener
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  RouterLink
} from '@angular/router';


/* =========================================================
   Interfaces
========================================================= */

export interface SupervisorStats {

  assignedTrainees: number;

  attendanceRate: string;

  monthlyEvaluations: number;
}


export interface Supervisor {

  supervisorId?: number;

  id?: number;

  fullName: string;

  department?: string;

  position?: string;

  email?: string;

  phone?: string;

  stats?: SupervisorStats;

  avatarColor?: string;

  isInactive?: boolean;

  showMenu?: boolean;

  lastActivity?: string;
}


export interface Trainee {

  id: number;

  name: string;

  track: string;

  batch: string;

  initials: string;

  color: string;

  assigned: boolean;
}


export interface Toast {

  visible: boolean;

  message: string;

  type: 'success' | 'error';
}


/* =========================================================
   Component
========================================================= */

@Component({

  selector: 'app-company-supervisors',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],

  templateUrl: './supervisors.html',

  styleUrl: './supervisors.scss'

})
export class CompanySupervisors {


  /* =======================================================
     Modals
  ======================================================= */

  showAddModal = false;

  isDistributeModalOpen = false;

  selectedSupervisor: Supervisor | null = null;

  editingSupervisor: Supervisor | null = null;


  /* =======================================================
     Search / Filters
  ======================================================= */

  searchQuery = '';

  selectedDept = 'all';


  departments: string[] = [

    'الأمن السيبراني',

    'تقنية المعلومات',

    'الموارد البشرية',

    'التسويق',

    'العمليات'

  ];


  /* =======================================================
     New / Edit Supervisor
  ======================================================= */

  newSupervisor: Supervisor = {

    fullName: '',

    department: '',

    position: '',

    email: '',

    phone: '',

    isInactive: false

  };


  /* =======================================================
     Supervisors Data
  ======================================================= */

  supervisors: Supervisor[] = [

    {
      supervisorId: 1,

      fullName: 'طارق بن جمعة السالمي',

      department: 'الأمن السيبراني',

      position: 'مشرف تقني',

      email: 't.alsalmi@ufuq-tech.om',

      phone: '+968 90000001',

      avatarColor: 'navy',

      lastActivity: 'نشط الآن',

      stats: {
        assignedTrainees: 3,
        attendanceRate: '92.0%',
        monthlyEvaluations: 6
      }

    },


    {
      supervisorId: 2,

      fullName: 'سعاد بنت محمد الشامسية',

      department: 'الموارد البشرية',

      position: 'مشرفة التدريب',

      email: 's.alshamsiya@ufuq-tech.om',

      phone: '+968 90000002',

      avatarColor: 'cyan',

      lastActivity: 'منذ 5 دقائق',

      stats: {
        assignedTrainees: 4,
        attendanceRate: '95.3%',
        monthlyEvaluations: 8
      }

    },


    {
      supervisorId: 3,

      fullName: 'خالد بن عبدالله المعمري',

      department: 'تقنية المعلومات',

      position: 'رئيس قسم',

      email: 'k.almaamari@ufuq-tech.om',

      phone: '+968 90000003',

      avatarColor: 'navy',

      lastActivity: 'منذ 12 دقيقة',

      stats: {
        assignedTrainees: 3,
        attendanceRate: '90.8%',
        monthlyEvaluations: 6
      }

    },


    {
      supervisorId: 4,

      fullName: 'ليلى بنت ناصر الكيومية',

      department: 'التسويق',

      position: 'مشرفة التسويق',

      email: 'l.alkiyumiya@ufuq-tech.om',

      phone: '+968 90000004',

      avatarColor: 'cyan',

      lastActivity: 'منذ ساعة',

      stats: {
        assignedTrainees: 1,
        attendanceRate: '78.0%',
        monthlyEvaluations: 2
      }

    },


    {
      supervisorId: 5,

      fullName: 'ياسر بن حمد السالمي',

      department: 'العمليات',

      position: 'مشرف عمليات',

      email: 'y.alsalmi@ufuq-tech.om',

      phone: '+968 90000005',

      avatarColor: 'gold',

      lastActivity: 'منذ يوم',

      stats: {
        assignedTrainees: 0,
        attendanceRate: '0%',
        monthlyEvaluations: 0
      }

    }

  ];


  /* =======================================================
     Trainees
  ======================================================= */

  traineesList: Trainee[] = [

    {
      id: 1,
      name: 'يوسف بن سالم الحارثي',
      track: 'تحليل البيانات',
      batch: '2026-ب',
      initials: 'يس',
      color: 'cyan',
      assigned: false
    },

    {
      id: 2,
      name: 'مريم بنت راشد السياابية',
      track: 'تحليل البيانات',
      batch: '2026-ب',
      initials: 'مر',
      color: 'teal',
      assigned: false
    },

    {
      id: 3,
      name: 'خالد بن عبدالله العامري',
      track: 'الأمن السيبراني',
      batch: '2026-ج',
      initials: 'خع',
      color: 'navy',
      assigned: false
    },

    {
      id: 4,
      name: 'نورة بنت حمد الهنائية',
      track: 'الأمن السيبراني',
      batch: '2026-ج',
      initials: 'نح',
      color: 'blue',
      assigned: false
    },

    {
      id: 5,
      name: 'رقية بنت علي الشحية',
      track: 'تحليل البيانات',
      batch: '2026-ب',
      initials: 'رع',
      color: 'cyan',
      assigned: false
    },

    {
      id: 6,
      name: 'شيماء بنت سيف البطاشية',
      track: 'الأمن السيبراني',
      batch: '2026-ج',
      initials: 'شس',
      color: 'navy',
      assigned: false
    },

    {
      id: 7,
      name: 'أمل بنت سلطان الزدجالية',
      track: 'تطوير تطبيقات الويب',
      batch: '2026-أ',
      initials: 'أس',
      color: 'indigo',
      assigned: false
    }

  ];


  /* =======================================================
     توزيع المتدربين لكل مشرف
  ======================================================= */

  distributionMap: Record<number, number[]> = {};


  /* =======================================================
     Toast
  ======================================================= */

  toast: Toast = {

    visible: false,

    message: '',

    type: 'success'

  };


  private toastTimer?: ReturnType<typeof setTimeout>;


  /* =======================================================
     Statistics
  ======================================================= */

  get totalAssignedTrainees(): number {

    return this.supervisors.reduce(

      (total, supervisor) =>

        total +
        (supervisor.stats?.assignedTrainees ?? 0),

      0

    );

  }


  get averageAttendance(): number {

    const validSupervisors = this.supervisors.filter(

      supervisor => {

        const value =
          this.getAttendanceValue(
            supervisor.stats?.attendanceRate
          );

        return value > 0;

      }

    );


    if (validSupervisors.length === 0) {

      return 0;

    }


    const total = validSupervisors.reduce(

      (sum, supervisor) =>

        sum +
        this.getAttendanceValue(
          supervisor.stats?.attendanceRate
        ),

      0

    );


    return Math.round(

      total / validSupervisors.length

    );

  }


  get supervisorsNeedingAttention(): number {

    return this.supervisors.filter(

      supervisor => {

        const attendance =
          this.getAttendanceValue(
            supervisor.stats?.attendanceRate
          );

        return attendance > 0 && attendance < 80;

      }

    ).length;

  }


  /* =======================================================
     Filtered Supervisors
  ======================================================= */

  get filteredSupervisors(): Supervisor[] {

    const query =
      this.searchQuery
        .trim()
        .toLowerCase();


    return this.supervisors.filter(

      supervisor => {

        const searchableText = [

          supervisor.fullName,

          supervisor.email,

          supervisor.department,

          supervisor.position,

          supervisor.phone

        ]

          .filter(Boolean)

          .join(' ')

          .toLowerCase();


        const matchesSearch =

          !query ||

          searchableText.includes(query);


        const matchesDepartment =

          this.selectedDept === 'all' ||

          supervisor.department === this.selectedDept;


        return (

          matchesSearch &&

          matchesDepartment

        );

      }

    );

  }


  /* =======================================================
     Attendance
  ======================================================= */

  getAttendanceValue(rate?: string): number {

    if (!rate) {

      return 0;

    }


    const value =
      parseFloat(rate);


    if (isNaN(value)) {

      return 0;

    }


    return Math.min(

      Math.max(value, 0),

      100

    );

  }


  getAttendanceClass(rate?: string): string {

    const value =
      this.getAttendanceValue(rate);


    if (value >= 90) {

      return 'excellent';

    }


    if (value >= 80) {

      return 'warning';

    }


    return 'danger';

  }


  /* =======================================================
     Initials
  ======================================================= */

  initials(name: string): string {

    if (!name) {

      return '';

    }


    const parts =

      name
        .trim()
        .split(/\s+/)
        .filter(Boolean);


    return parts

      .map(part => part.charAt(0))

      .slice(0, 2)

      .join('')

      .toUpperCase();

  }


  /* =======================================================
     Search / Filters
  ======================================================= */

  clearFilters(): void {

    this.searchQuery = '';

    this.selectedDept = 'all';

  }


  /* =======================================================
     Refresh
  ======================================================= */

  refreshData(): void {

    this.showToast(

      'تم تحديث بيانات المشرفين بنجاح',

      'success'

    );

  }


  /* =======================================================
     Add Modal
  ======================================================= */

  openAddModal(): void {

    this.editingSupervisor = null;


    this.newSupervisor = {

      fullName: '',

      department: '',

      position: '',

      email: '',

      phone: '',

      isInactive: false

    };


    this.showAddModal = true;

  }


  closeAddModal(): void {

    this.showAddModal = false;

    this.editingSupervisor = null;

  }


  /* =======================================================
     Edit Supervisor
  ======================================================= */

  editSupervisor(supervisor: Supervisor): void {

    supervisor.showMenu = false;

    this.editingSupervisor = supervisor;


    this.newSupervisor = {

      supervisorId: supervisor.supervisorId,

      id: supervisor.id,

      fullName: supervisor.fullName,

      department: supervisor.department,

      position: supervisor.position,

      email: supervisor.email,

      phone: supervisor.phone,

      avatarColor: supervisor.avatarColor,

      isInactive: supervisor.isInactive,

      lastActivity: supervisor.lastActivity,

      stats: supervisor.stats
        ? {
            ...supervisor.stats
          }
        : undefined

    };


    this.showAddModal = true;

  }


  /* =======================================================
     Submit Add / Edit
  ======================================================= */

  submitSupervisor(): void {

    const fullName =
      this.newSupervisor.fullName
        ?.trim();


    if (!fullName) {

      this.showToast(

        'يرجى إدخال اسم المشرف',

        'error'

      );

      return;

    }


    if (this.editingSupervisor) {

      this.updateSupervisor();

      return;

    }


    this.addSupervisor();

  }


  /* =======================================================
     Add
  ======================================================= */

  private addSupervisor(): void {

    const supervisor: Supervisor = {

      supervisorId:
        this.getNextSupervisorId(),

      fullName:
        this.newSupervisor.fullName.trim(),

      department:
        this.newSupervisor.department ||
        'القسم العام',

      position:
        this.newSupervisor.position ||
        'مشرف',

      email:
        this.newSupervisor.email ||
        'name@company.om',

      phone:
        this.newSupervisor.phone || '',

      avatarColor:
        this.getRandomAvatarColor(),

      isInactive: false,

      lastActivity:
        'تمت الإضافة الآن',

      stats: {

        assignedTrainees: 0,

        attendanceRate: '0%',

        monthlyEvaluations: 0

      }

    };


    this.supervisors.unshift(supervisor);


    this.closeAddModal();


    this.showToast(

      'تمت إضافة المشرف بنجاح',

      'success'

    );

  }


  /* =======================================================
     Update
  ======================================================= */

  private updateSupervisor(): void {

    if (!this.editingSupervisor) {

      return;

    }


    this.editingSupervisor.fullName =
      this.newSupervisor.fullName?.trim() || '';


    this.editingSupervisor.department =
      this.newSupervisor.department ||
      'القسم العام';


    this.editingSupervisor.position =
      this.newSupervisor.position ||
      'مشرف';


    this.editingSupervisor.email =
      this.newSupervisor.email ||
      'name@company.om';


    this.editingSupervisor.phone =
      this.newSupervisor.phone || '';


    this.editingSupervisor.isInactive =
      !!this.newSupervisor.isInactive;


    this.closeAddModal();


    this.showToast(

      'تم تحديث بيانات المشرف بنجاح',

      'success'

    );

  }


  /* =======================================================
     Next ID
  ======================================================= */

  private getNextSupervisorId(): number {

    return (

      this.supervisors.reduce(

        (max, supervisor) =>

          Math.max(

            max,

            supervisor.supervisorId ??
            supervisor.id ??
            0

          ),

        0

      ) + 1

    );

  }


  /* =======================================================
     Avatar Color
  ======================================================= */

  private getRandomAvatarColor(): string {

    const colors = [

      'navy',

      'cyan',

      'gold',

      'teal',

      'blue',

      'indigo'

    ];


    return colors[

      Math.floor(

        Math.random() * colors.length

      )

    ];

  }


  /* =======================================================
     Dropdown
  ======================================================= */

  toggleDropdown(

    supervisor: Supervisor,

    event: Event

  ): void {

    event.stopPropagation();


    const currentState =
      supervisor.showMenu;


    this.supervisors.forEach(

      item => {

        item.showMenu = false;

      }

    );


    supervisor.showMenu =
      !currentState;

  }


  @HostListener('document:click')

  closeAllMenus(): void {

    this.supervisors.forEach(

      supervisor => {

        supervisor.showMenu = false;

      }

    );

  }


  /* =======================================================
     Status
  ======================================================= */

  toggleStatus(supervisor: Supervisor): void {

    supervisor.isInactive =
      !supervisor.isInactive;


    supervisor.showMenu = false;


    this.showToast(

      supervisor.isInactive

        ? 'تم تجميد حساب المشرف'

        : 'تم تنشيط حساب المشرف',

      'success'

    );

  }


  /* =======================================================
     Delete
  ======================================================= */

  deleteSupervisor(supervisor: Supervisor): void {

    supervisor.showMenu = false;


    const confirmed = window.confirm(

      `هل أنت متأكد من حذف المشرف "${supervisor.fullName}"؟`

    );


    if (!confirmed) {

      return;

    }


    const id =

      supervisor.supervisorId ??
      supervisor.id;


    this.supervisors =

      this.supervisors.filter(

        item =>

          (item.supervisorId ?? item.id) !== id

      );


    if (id) {

      delete this.distributionMap[id];

    }


    this.showToast(

      'تم حذف المشرف بنجاح',

      'success'

    );

  }


  /* =======================================================
     Distribution Modal
  ======================================================= */

  openDistributeModal(
    supervisor: Supervisor
  ): void {

    supervisor.showMenu = false;

    this.selectedSupervisor = supervisor;


    const supervisorId =

      supervisor.supervisorId ??
      supervisor.id;


    if (!supervisorId) {

      return;

    }


    const assignedIds =

      this.distributionMap[supervisorId] ??
      [];


    this.traineesList =

      this.traineesList.map(

        trainee => ({

          ...trainee,

          assigned:
            assignedIds.includes(trainee.id)

        })

      );


    this.isDistributeModalOpen = true;

  }


  closeDistributeModal(): void {

    this.isDistributeModalOpen = false;

    this.selectedSupervisor = null;

  }


  /* =======================================================
     Distribution
  ======================================================= */

  get selectedAssignedCount(): number {

    return this.traineesList.filter(

      trainee => trainee.assigned

    ).length;

  }


  get allTraineesSelected(): boolean {

    return (

      this.traineesList.length > 0 &&

      this.traineesList.every(

        trainee => trainee.assigned

      )

    );

  }


  toggleAllTrainees(): void {

    const shouldAssign =
      !this.allTraineesSelected;


    this.traineesList =

      this.traineesList.map(

        trainee => ({

          ...trainee,

          assigned: shouldAssign

        })

      );

  }


  saveDistribution(): void {

    if (!this.selectedSupervisor) {

      return;

    }


    const supervisorId =

      this.selectedSupervisor.supervisorId ??
      this.selectedSupervisor.id;


    if (!supervisorId) {

      return;

    }


    const assignedIds =

      this.traineesList

        .filter(
          trainee => trainee.assigned
        )

        .map(
          trainee => trainee.id
        );


    this.distributionMap[supervisorId] =

      assignedIds;


    if (this.selectedSupervisor.stats) {

      this.selectedSupervisor.stats.assignedTrainees =

        assignedIds.length;

    }


    const supervisorName =
      this.selectedSupervisor.fullName;


    this.closeDistributeModal();


    this.showToast(

      `تم حفظ توزيع المتدربين على ${supervisorName}`,

      'success'

    );

  }


  /* =======================================================
     Toast
  ======================================================= */

  showToast(

    message: string,

    type: 'success' | 'error' = 'success'

  ): void {

    if (this.toastTimer) {

      clearTimeout(this.toastTimer);

    }


    this.toast = {

      visible: true,

      message,

      type

    };


    this.toastTimer =

      setTimeout(() => {

        this.hideToast();

      }, 3500);

  }


  hideToast(): void {

    this.toast.visible = false;

  }

}
