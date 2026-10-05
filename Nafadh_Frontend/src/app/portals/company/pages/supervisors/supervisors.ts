import {
  Component,
  HostListener,
  OnInit
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

import {
  HttpClient
} from '@angular/common/http';


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

  status?: string;

  permissions?: string[];

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
export class CompanySupervisors implements OnInit {


  /* =======================================================
     API
  ======================================================= */

  private readonly apiUrl =
    'https://localhost:44383/api/CompanySupervisor';

  /*
   * مؤقتًا نستخدم CompanyId = 1.
   * لاحقًا نأخذه من المستخدم المسجل دخوله.
   */
  companyId = 1;

  isLoading = false;

  apiError = '';


  constructor(
    private http: HttpClient
  ) {}


  /* =======================================================
     Lifecycle
  ======================================================= */

  ngOnInit(): void {

    this.loadSupervisors();

  }


  /* =======================================================
     Load Supervisors from API
  ======================================================= */

  loadSupervisors(): void {

    this.isLoading = true;

    this.apiError = '';


    const url =
      `${this.apiUrl}/company/${this.companyId}`;


    this.http.get<Supervisor[]>(url)
      .subscribe({

        next: (data) => {

          this.supervisors =
            (data ?? []).map(

              (supervisor, index) =>

                this.mapSupervisor(
                  supervisor,
                  index
                )

            );


          this.isLoading = false;

        },


        error: (error) => {

          console.error(
            'Error loading supervisors:',
            error
          );


          this.isLoading = false;

          this.apiError =
            'تعذر تحميل بيانات المشرفين من النظام.';


          this.showToast(
            'تعذر تحميل بيانات المشرفين',
            'error'
          );

        }

      });

  }


  /* =======================================================
     Map API data to UI model
  ======================================================= */

  private mapSupervisor(
    supervisor: Supervisor,
    index: number
  ): Supervisor {

    const status =
      (supervisor.status ?? '')
        .toLowerCase();


    const isInactive =
      status === 'inactive' ||
      status === 'frozen' ||
      status === 'suspended' ||
      status === 'disabled';


    return {

      ...supervisor,

      supervisorId:
        supervisor.supervisorId ??
        supervisor.id,


      fullName:
        supervisor.fullName ||
        'مشرف بدون اسم',


      department:
        supervisor.department ||
        'القسم العام',


      position:
        supervisor.position ||
        'مشرف',


      email:
        supervisor.email ||
        '',


      phone:
        supervisor.phone ||
        '',


      status:
        supervisor.status ||
        'Active',


      permissions:
        supervisor.permissions ??
        [],


      isInactive,


      avatarColor:
        this.getAvatarColor(index),


      lastActivity:
        isInactive
          ? 'الحساب غير نشط'
          : 'نشط',


      /*
       * الـ API الحالي لا يرجع هذه الإحصائيات.
       * لذلك لا نضع بيانات وهمية.
       */
      stats: {

        assignedTrainees: 0,

        attendanceRate: '0%',

        monthlyEvaluations: 0

      }

    };

  }


  /* =======================================================
     Avatar Color
  ======================================================= */

  private getAvatarColor(index: number): string {

    const colors = [

      'navy',

      'cyan',

      'gold',

      'teal',

      'blue',

      'indigo'

    ];


    return colors[
      index % colors.length
    ];

  }


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


  departments: string[] = [];


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

  supervisors: Supervisor[] = [];


  /* =======================================================
     Trainees
  ======================================================= */

  traineesList: Trainee[] = [];


  /* =======================================================
     Distribution
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

    const validSupervisors =
      this.supervisors.filter(

        supervisor => {

          const value =
            this.getAttendanceValue(
              supervisor.stats?.attendanceRate
            );

          return value > 0;

        }

      );


    if (
      validSupervisors.length === 0
    ) {

      return 0;

    }


    const total =
      validSupervisors.reduce(

        (sum, supervisor) =>

          sum +
          this.getAttendanceValue(
            supervisor.stats?.attendanceRate
          ),

        0

      );


    return Math.round(

      total /
      validSupervisors.length

    );

  }


  get supervisorsNeedingAttention(): number {

    return this.supervisors.filter(

      supervisor => {

        const attendance =
          this.getAttendanceValue(
            supervisor.stats?.attendanceRate
          );


        return (
          attendance > 0 &&
          attendance < 80
        );

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

          supervisor.department ===
          this.selectedDept;


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

  getAttendanceValue(
    rate?: string
  ): number {

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


  getAttendanceClass(
    rate?: string
  ): string {

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

      .map(
        part =>
          part.charAt(0)
      )

      .slice(0, 2)

      .join('')
      .toUpperCase();

  }


  /* =======================================================
     Filters
  ======================================================= */

  clearFilters(): void {

    this.searchQuery = '';

    this.selectedDept = 'all';

  }


  /* =======================================================
     Refresh
  ======================================================= */

  refreshData(): void {

    this.loadSupervisors();

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

  editSupervisor(
    supervisor: Supervisor
  ): void {

    supervisor.showMenu = false;

    this.editingSupervisor =
      supervisor;


    this.newSupervisor = {

      supervisorId:
        supervisor.supervisorId,

      id:
        supervisor.id,

      fullName:
        supervisor.fullName,

      department:
        supervisor.department,

      position:
        supervisor.position,

      email:
        supervisor.email,

      phone:
        supervisor.phone,

      status:
        supervisor.status,

      permissions:
        supervisor.permissions,

      avatarColor:
        supervisor.avatarColor,

      isInactive:
        supervisor.isInactive,

      lastActivity:
        supervisor.lastActivity,

      stats:
        supervisor.stats
          ? {
              ...supervisor.stats
            }
          : undefined

    };


    this.showAddModal = true;

  }


  /* =======================================================
     Submit
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


    this.showToast(

      'إضافة المشرف من الواجهة ستحتاج UserId من نظام المستخدمين',

      'error'

    );

  }


  /* =======================================================
     Update
  ======================================================= */

  private updateSupervisor(): void {

    if (!this.editingSupervisor) {

      return;

    }


    const id =
      this.editingSupervisor.supervisorId ??
      this.editingSupervisor.id;


    if (!id) {

      return;

    }


    const body = {

      department:
        this.newSupervisor.department,

      position:
        this.newSupervisor.position

    };


    this.http.put(

      `${this.apiUrl}/${id}`,

      body

    ).subscribe({

      next: () => {

        this.closeAddModal();

        this.showToast(
          'تم تحديث بيانات المشرف بنجاح',
          'success'
        );

        this.loadSupervisors();

      },


      error: (error) => {

        console.error(
          'Update supervisor error:',
          error
        );


        this.showToast(
          'تعذر تحديث بيانات المشرف',
          'error'
        );

      }

    });

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

  toggleStatus(
    supervisor: Supervisor
  ): void {

    supervisor.showMenu = false;


    this.showToast(

      'تغيير حالة الحساب يحتاج API مخصص للحالة',

      'error'

    );

  }


  /* =======================================================
     Delete
  ======================================================= */

  deleteSupervisor(
    supervisor: Supervisor
  ): void {

    supervisor.showMenu = false;


    const confirmed =
      window.confirm(

        `هل أنت متأكد من حذف المشرف "${supervisor.fullName}"؟`

      );


    if (!confirmed) {

      return;

    }


    const id =
      supervisor.supervisorId ??
      supervisor.id;


    if (!id) {

      return;

    }


    this.http.delete(

      `${this.apiUrl}/${id}`

    ).subscribe({

      next: () => {

        this.supervisors =
          this.supervisors.filter(

            item =>

              (item.supervisorId ??
                item.id) !== id

          );


        delete this.distributionMap[id];


        this.showToast(
          'تم حذف المشرف بنجاح',
          'success'
        );

      },


      error: (error) => {

        console.error(
          'Delete supervisor error:',
          error
        );


        this.showToast(
          'تعذر حذف المشرف',
          'error'
        );

      }

    });

  }


  /* =======================================================
     Distribution Modal
  ======================================================= */

  openDistributeModal(
    supervisor: Supervisor
  ): void {

    supervisor.showMenu = false;

    this.selectedSupervisor =
      supervisor;


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
            assignedIds.includes(
              trainee.id
            )

        })

      );


    this.isDistributeModalOpen =
      true;

  }


  closeDistributeModal(): void {

    this.isDistributeModalOpen =
      false;

    this.selectedSupervisor =
      null;

  }


  /* =======================================================
     Distribution
  ======================================================= */

  get selectedAssignedCount(): number {

    return this.traineesList.filter(

      trainee =>
        trainee.assigned

    ).length;

  }


  get allTraineesSelected(): boolean {

    return (

      this.traineesList.length > 0 &&

      this.traineesList.every(

        trainee =>
          trainee.assigned

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

          assigned:
            shouldAssign

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
          trainee =>
            trainee.assigned
        )

        .map(
          trainee =>
            trainee.id
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

      clearTimeout(
        this.toastTimer
      );

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