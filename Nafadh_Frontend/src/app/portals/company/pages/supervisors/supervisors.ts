import {
  Component,
  HostListener,
  OnInit,
  ChangeDetectorRef,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { CompanyApi } from '../../services/company-api';


// =========================================================
// Interfaces
// =========================================================

interface SupervisorStats {
  monthlyEvaluations: number;
  attendanceRate: number;
  assignedTrainees: number;
}

interface Supervisor {
  supervisorId: number;
  id: number;

  fullName: string;
  phone: string;
  email: string;

  department: string;
  position: string;

  status: string;

  companyId?: number;
  userId?: number;

  permissions?: string[];

  avatarColor?: string;

  isInactive?: boolean;

  showMenu?: boolean;

  lastActivity?: string;

  stats?: SupervisorStats;
}

interface Trainee {
  id: number;
  name: string;
  email?: string;

  assigned: boolean;

  color: string;
  initials: string;

  track: string;
  batch: string;
}

interface Toast {
  visible: boolean;
  type: 'success' | 'error' | 'info';
  message: string;
}


// =========================================================
// Component
// =========================================================

@Component({
  selector: 'app-company-supervisors',
  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './supervisors.html',
  styleUrls: ['./supervisors.scss']
})
export class CompanySupervisors implements OnInit {

  // =========================================================
  // API
  // =========================================================

  private readonly companyApi =
    inject(CompanyApi);

  private readonly cdr =
    inject(ChangeDetectorRef);


  // =========================================================
  // Company
  // =========================================================

  companyId = 1;


  // =========================================================
  // Loading
  // =========================================================

  loading = false;

  errorMessage = '';


  // =========================================================
  // Supervisors
  // =========================================================

  supervisors: Supervisor[] = [];


  // =========================================================
  // Departments
  // =========================================================

  departments: string[] = [
    'تقنية المعلومات',
    'الموارد البشرية',
    'التسويق',
    'المالية',
    'التدريب والتطوير',
    'الجودة',
    'الشؤون الإدارية'
  ];

  selectedDept = 'all';


  // =========================================================
  // Search
  // =========================================================

  searchQuery = '';


  // =========================================================
  // Statistics
  // =========================================================

  totalAssignedTrainees = 0;

  averageAttendance = 0;

  supervisorsNeedingAttention = 0;


  // =========================================================
  // Add / Edit Modal
  // =========================================================

  showAddModal = false;

  editingSupervisor = false;


  // =========================================================
  // Supervisor Profile Modal
  // =========================================================

  showProfileModal = false;

  selectedProfileSupervisor: Supervisor | null = null;


  // =========================================================
  // Selected Supervisor
  // =========================================================

  selectedSupervisor: Supervisor | null = null;


  // =========================================================
  // New Supervisor Form
  // =========================================================

  newSupervisor = {
    fullName: '',
    department: '',
    position: '',
    email: '',
    phone: '',
    isInactive: false
  };


  // =========================================================
  // Distribution
  // =========================================================

  isDistributeModalOpen = false;

  traineesList: Trainee[] = [];

  distributionMap: {
    [supervisorId: number]: number[]
  } = {};


  // =========================================================
  // Toast
  // =========================================================

  toast: Toast = {
    visible: false,
    type: 'info',
    message: ''
  };


  // =========================================================
  // ألوان الصور
  // =========================================================

  private readonly avatarColors = [
    'navy',
    'cyan',
    'gold',
    'red',
    'purple',
    'green',
    'orange',
    'pink'
  ];


  // =========================================================
  // Init
  // =========================================================

  ngOnInit(): void {
    this.loadSupervisors();
  }


  // =========================================================
  // تحميل المشرفين من API
  // =========================================================

  loadSupervisors(): void {

    this.loading = true;
    this.errorMessage = '';

    this.companyApi
      .getSupervisors(this.companyId)
      .subscribe({

        next: (data: any[]) => {

          const fakeStats: SupervisorStats[] = [

            {
              monthlyEvaluations: 4,
              attendanceRate: 94,
              assignedTrainees: 6
            },

            {
              monthlyEvaluations: 3,
              attendanceRate: 88,
              assignedTrainees: 5
            },

            {
              monthlyEvaluations: 6,
              attendanceRate: 96,
              assignedTrainees: 8
            },

            {
              monthlyEvaluations: 2,
              attendanceRate: 72,
              assignedTrainees: 4
            },

            {
              monthlyEvaluations: 5,
              attendanceRate: 91,
              assignedTrainees: 7
            },

            {
              monthlyEvaluations: 3,
              attendanceRate: 79,
              assignedTrainees: 5
            },

            {
              monthlyEvaluations: 7,
              attendanceRate: 97,
              assignedTrainees: 9
            },

            {
              monthlyEvaluations: 4,
              attendanceRate: 85,
              assignedTrainees: 6
            }

          ];


          this.supervisors =
            data.map(
              (
                item: any,
                index: number
              ) => {

                const supervisorId =
                  Number(
                    item.supervisorId ??
                    item.id ??
                    index + 1
                  );


                const status =
                  item.status ??
                  'Active';


                const stats =
                  item.stats ??
                  fakeStats[
                    index %
                    fakeStats.length
                  ];


                return {

                  supervisorId,

                  id: supervisorId,

                  fullName:
                    item.fullName ??
                    item.name ??
                    'مشرف',

                  phone:
                    item.phone ??
                    '',

                  email:
                    item.email ??
                    '',

                  department:
                    item.department ??
                    'القسم العام',

                  position:
                    item.position ??
                    'مشرف',

                  status,

                  companyId:
                    item.companyId ??
                    this.companyId,

                  userId:
                    item.userId,

                  permissions:
                    item.permissions ??
                    [],

                  avatarColor:
                    this.avatarColors[
                      index %
                      this.avatarColors.length
                    ],

                  isInactive:
                    status === 'Inactive' ||
                    status === 'Frozen' ||
                    status === 'غير نشط' ||
                    status === 'مجمد',

                  showMenu: false,

                  lastActivity:
                    item.lastActivity ??
                    'نشط مؤخراً',

                  stats: {

                    monthlyEvaluations:
                      Number(
                        stats.monthlyEvaluations ??
                        0
                      ),

                    attendanceRate:
                      Number(
                        stats.attendanceRate ??
                        0
                      ),

                    assignedTrainees:
                      Number(
                        stats.assignedTrainees ??
                        0
                      )

                  }

                };

              }
            );


          this.calculateStatistics();

          this.loading = false;

          this.cdr.detectChanges();

        },

        error: (error) => {

          console.error(
            'Error loading supervisors:',
            error
          );

          this.loading = false;

          this.errorMessage =
            'حدث خطأ أثناء تحميل بيانات المشرفين';

          this.showToast(
            'error',
            'تعذر تحميل بيانات المشرفين'
          );

          this.cdr.detectChanges();

        }

      });

  }


  // =========================================================
  // تحديث البيانات
  // =========================================================

  refreshData(): void {

    this.loadSupervisors();

    this.showToast(
      'info',
      'جاري تحديث بيانات المشرفين...'
    );

  }


  // =========================================================
  // الفلترة الديناميكية
  // =========================================================

  get filteredSupervisors(): Supervisor[] {

    const query =
      this.searchQuery
        .trim()
        .toLowerCase();


    return this.supervisors.filter(
      (supervisor) => {

        const matchesDepartment =
          this.selectedDept === 'all' ||
          supervisor.department ===
          this.selectedDept;


        const matchesSearch =
          !query ||

          supervisor.fullName
            ?.toLowerCase()
            .includes(query) ||

          supervisor.email
            ?.toLowerCase()
            .includes(query) ||

          supervisor.phone
            ?.toLowerCase()
            .includes(query) ||

          supervisor.department
            ?.toLowerCase()
            .includes(query) ||

          supervisor.position
            ?.toLowerCase()
            .includes(query);


        return (
          matchesDepartment &&
          matchesSearch
        );

      }
    );

  }


  // =========================================================
  // مسح الفلاتر
  // =========================================================

  clearFilters(): void {

    this.searchQuery = '';

    this.selectedDept = 'all';

  }


  // =========================================================
  // اختيار القسم
  // =========================================================

  selectDepartment(
    department: string
  ): void {

    this.selectedDept =
      department;

  }


  // =========================================================
  // الإحصائيات
  // =========================================================

  calculateStatistics(): void {

    this.totalAssignedTrainees =
      this.supervisors.reduce(
        (
          total,
          supervisor
        ) =>
          total +
          (
            supervisor.stats
              ?.assignedTrainees ??
            0
          ),
        0
      );


    if (
      this.supervisors.length > 0
    ) {

      const totalAttendance =
        this.supervisors.reduce(
          (
            total,
            supervisor
          ) =>
            total +
            (
              supervisor.stats
                ?.attendanceRate ??
              0
            ),
          0
        );


      this.averageAttendance =
        Math.round(
          totalAttendance /
          this.supervisors.length
        );

    } else {

      this.averageAttendance = 0;

    }


    this.supervisorsNeedingAttention =
      this.supervisors.filter(
        supervisor =>

          (
            supervisor.stats
              ?.attendanceRate ??
            0
          ) < 70 ||

          supervisor.isInactive
      ).length;

  }


  // =========================================================
  // الأحرف الأولى
  // =========================================================

  initials(
    name: string
  ): string {

    if (!name) {
      return 'م';
    }


    const parts =
      name
        .trim()
        .split(/\s+/)
        .filter(Boolean);


    if (
      parts.length === 1
    ) {

      return parts[0]
        .substring(0, 2);

    }


    return (
      parts[0].charAt(0) +
      parts[1].charAt(0)
    );

  }


  // =========================================================
  // فتح ملف المشرف
  // =========================================================

  openSupervisorProfile(
    supervisor: Supervisor
  ): void {

    this.selectedProfileSupervisor =
      supervisor;

    this.showProfileModal =
      true;

    // إغلاق أي قائمة مفتوحة
    supervisor.showMenu =
      false;

  }


  // =========================================================
  // إغلاق ملف المشرف
  // =========================================================

  closeSupervisorProfile(): void {

    this.showProfileModal =
      false;

    this.selectedProfileSupervisor =
      null;

  }


  // =========================================================
  // فتح القائمة
  // =========================================================

  toggleDropdown(
    supervisor: Supervisor,
    event?: MouseEvent
  ): void {

    if (event) {
      event.stopPropagation();
    }


    this.supervisors.forEach(
      item => {

        if (
          item !== supervisor
        ) {

          item.showMenu =
            false;

        }

      }
    );


    supervisor.showMenu =
      !supervisor.showMenu;

  }


  // =========================================================
  // تعديل المشرف
  // =========================================================

  editSupervisor(
    supervisor: Supervisor
  ): void {

    this.selectedSupervisor =
      supervisor;

    this.editingSupervisor =
      true;

    this.showAddModal =
      true;

    this.newSupervisor = {

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

      isInactive:
        supervisor.isInactive ??
        false

    };


    supervisor.showMenu =
      false;

  }


  // =========================================================
  // إضافة مشرف
  // =========================================================

  openAddModal(): void {

    this.editingSupervisor =
      false;

    this.selectedSupervisor =
      null;

    this.showAddModal =
      true;

    this.newSupervisor = {

      fullName: '',

      department:
        'تقنية المعلومات',

      position:
        'مشرف تقنية المعلومات',

      email: '',

      phone: '',

      isInactive: false

    };

  }


  // =========================================================
  // إغلاق Modal
  // =========================================================

  closeAddModal(): void {

    this.showAddModal =
      false;

    this.editingSupervisor =
      false;

    this.selectedSupervisor =
      null;

  }


  // =========================================================
  // حفظ الإضافة / التعديل
  // =========================================================

  submitSupervisor(): void {

    if (
      !this.newSupervisor.fullName.trim()
    ) {

      this.showToast(
        'error',
        'يرجى إدخال اسم المشرف'
      );

      return;

    }


    if (
      this.editingSupervisor &&
      this.selectedSupervisor
    ) {

      const id =
        this.selectedSupervisor
          .supervisorId;


      const dto = {

        fullName:
          this.newSupervisor.fullName,

        phone:
          this.newSupervisor.phone,

        email:
          this.newSupervisor.email,

        department:
          this.newSupervisor.department,

        position:
          this.newSupervisor.position,

        status:
          this.newSupervisor.isInactive
            ? 'Inactive'
            : 'Active',

        companyId:
          this.companyId

      };


      this.companyApi
        .updateSupervisor(
          id,
          dto
        )
        .subscribe({

          next: () => {

            this.showToast(
              'success',
              'تم تحديث بيانات المشرف بنجاح'
            );

            this.closeAddModal();

            this.loadSupervisors();

          },

          error: (error) => {

            console.error(
              'Update supervisor error:',
              error
            );

            this.showToast(
              'error',
              'تعذر تحديث بيانات المشرف'
            );

          }

        });


      return;

    }


    const dto = {

      fullName:
        this.newSupervisor.fullName,

      phone:
        this.newSupervisor.phone,

      email:
        this.newSupervisor.email,

      department:
        this.newSupervisor.department,

      position:
        this.newSupervisor.position,

      companyId:
        this.companyId,

      status:
        'Active'

    };


    this.companyApi
      .addSupervisor(dto)
      .subscribe({

        next: () => {

          this.showToast(
            'success',
            'تمت إضافة المشرف بنجاح'
          );

          this.closeAddModal();

          this.loadSupervisors();

        },

        error: (error) => {

          console.error(
            'Add supervisor error:',
            error
          );

          this.showToast(
            'error',
            'تعذر إضافة المشرف'
          );

        }

      });

  }


  // =========================================================
  // تجميد / تنشيط
  // =========================================================

  toggleStatus(
    supervisor: Supervisor
  ): void {

    const id =
      supervisor.supervisorId;


    const newStatus =
      supervisor.isInactive
        ? 'Active'
        : 'Inactive';


    const dto = {

      fullName:
        supervisor.fullName,

      phone:
        supervisor.phone,

      email:
        supervisor.email,

      department:
        supervisor.department,

      position:
        supervisor.position,

      status:
        newStatus,

      companyId:
        supervisor.companyId ??
        this.companyId,

      userId:
        supervisor.userId

    };


    this.companyApi
      .updateSupervisor(
        id,
        dto
      )
      .subscribe({

        next: () => {

          this.showToast(
            'success',
            supervisor.isInactive
              ? 'تم تنشيط الحساب'
              : 'تم تجميد الحساب'
          );

          this.loadSupervisors();

        },

        error: (error) => {

          console.error(
            'Toggle status error:',
            error
          );

          this.showToast(
            'error',
            'تعذر تغيير حالة الحساب'
          );

        }

      });


    supervisor.showMenu =
      false;

  }


  // =========================================================
  // حذف
  // =========================================================

  deleteSupervisor(
    supervisor: Supervisor
  ): void {

    const id =
      supervisor.supervisorId;


    const confirmed =
      confirm(
        `هل أنت متأكد من حذف المشرف ${supervisor.fullName}؟`
      );


    if (!confirmed) {
      return;
    }


    this.companyApi
      .deleteSupervisor(id)
      .subscribe({

        next: () => {

          this.showToast(
            'success',
            'تم حذف المشرف بنجاح'
          );

          this.loadSupervisors();

        },

        error: (error) => {

          console.error(
            'Delete supervisor error:',
            error
          );

          this.showToast(
            'error',
            'تعذر حذف المشرف'
          );

        }

      });


    supervisor.showMenu =
      false;

  }


  // =========================================================
  // توزيع المتدربين
  // =========================================================

  openDistributeModal(
    supervisor: Supervisor
  ): void {

    this.selectedSupervisor =
      supervisor;

    this.isDistributeModalOpen =
      true;


    const supervisorId =
      supervisor.supervisorId;


    this.companyApi
      .getSupervisorAssignedTrainees(
        supervisorId
      )
      .subscribe({

        next: (data: any[]) => {

          this.traineesList =
            data.map(
              (
                item: any,
                index: number
              ) => {

                const name =
                  item.name ??
                  item.fullName ??
                  'متدرب';


                return {

                  id:
                    Number(
                      item.id ??
                      item.traineeId ??
                      index + 1
                    ),

                  name,

                  email:
                    item.email ??
                    '',

                  assigned:
                    item.assigned ??
                    item.isAssigned ??
                    true,

                  color:
                    this.avatarColors[
                      index %
                      this.avatarColors.length
                    ],

                  initials:
                    this.initials(name),

                  track:
                    item.track ??
                    item.program ??
                    'برنامج تدريبي',

                  batch:
                    item.batch ??
                    item.batchName ??
                    'الأولى'

                };

              }
            );

        },

        error: (error) => {

          console.error(
            'Get trainees error:',
            error
          );

          this.traineesList = [];

          this.showToast(
            'error',
            'تعذر تحميل المتدربين'
          );

        }

      });


    supervisor.showMenu =
      false;

  }


  // =========================================================
  // إغلاق توزيع المتدربين
  // =========================================================

  closeDistributeModal(): void {

    this.isDistributeModalOpen =
      false;

    this.selectedSupervisor =
      null;

    this.traineesList = [];

  }


  // =========================================================
  // عدد المتدربين المحددين
  // =========================================================

  get selectedAssignedCount(): number {

    return this.traineesList
      .filter(
        trainee =>
          trainee.assigned
      )
      .length;

  }


  // =========================================================
  // هل الكل محدد؟
  // =========================================================

  get allTraineesSelected(): boolean {

    return (
      this.traineesList.length > 0 &&
      this.traineesList.every(
        trainee =>
          trainee.assigned
      )
    );

  }


  // =========================================================
  // تحديد / إلغاء تحديد الكل
  // =========================================================

  toggleAllTrainees(): void {

    const newValue =
      !this.allTraineesSelected;


    this.traineesList.forEach(
      trainee => {

        trainee.assigned =
          newValue;

      }
    );

  }


  // =========================================================
  // حفظ التوزيع
  // =========================================================

  saveDistribution(): void {

    if (
      !this.selectedSupervisor
    ) {

      return;

    }


    const supervisorId =
      this.selectedSupervisor
        .supervisorId;


    const selectedTrainees =
      this.traineesList
        .filter(
          trainee =>
            trainee.assigned
        )
        .map(
          trainee =>
            trainee.id
        );


    this.distributionMap[
      supervisorId
    ] = selectedTrainees;


    this.showToast(
      'success',
      'تم حفظ توزيع المتدربين'
    );


    this.closeDistributeModal();

  }


  // =========================================================
  // الحضور
  // =========================================================

  getAttendanceValue(
    value: number | undefined
  ): number {

    if (
      value === undefined ||
      value === null ||
      Number.isNaN(value)
    ) {

      return 0;

    }


    return Math.max(
      0,
      Math.min(
        100,
        Number(value)
      )
    );

  }


  // =========================================================
  // لون الحضور
  // =========================================================

  getAttendanceClass(
    value: number | undefined
  ): string {

    const attendance =
      Number(value ?? 0);


    if (
      attendance >= 90
    ) {

      return 'attendance-good';

    }


    if (
      attendance >= 70
    ) {

      return 'attendance-medium';

    }


    return 'attendance-low';

  }


  // =========================================================
  // Toast
  // =========================================================

  showToast(
    type: 'success' | 'error' | 'info',
    message: string
  ): void {

    this.toast = {

      visible: true,

      type,

      message

    };


    setTimeout(() => {

      this.toast.visible =
        false;

    }, 3000);

  }


  // =========================================================
  // إخفاء Toast
  // =========================================================

  hideToast(): void {

    this.toast.visible =
      false;

  }


  // =========================================================
  // إغلاق القوائم عند الضغط خارجها
  // =========================================================

  @HostListener(
    'document:click',
    ['$event']
  )
  onDocumentClick(
    event: MouseEvent
  ): void {

    const target =
      event.target as HTMLElement;


    if (
      !target.closest(
        '.dropdown-container'
      )
    ) {

      this.supervisors.forEach(
        supervisor => {

          supervisor.showMenu =
            false;

        }
      );

    }

  }

}
