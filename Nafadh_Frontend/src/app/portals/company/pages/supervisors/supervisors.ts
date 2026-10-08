import {
  Component,
  HostListener,
  OnInit,
  inject
} from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

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
    FormsModule,
    RouterLink
  ],

  templateUrl: './supervisors.html',
  styleUrls: ['./supervisors.scss']
})
export class CompanySupervisors implements OnInit {

  // =========================================================
  // API
  // =========================================================

  private readonly companyApi = inject(CompanyApi);


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

  // تمت إزالة المصفوفة العادية واستبدالها بالـ Getter أدناه لضمان التحديث التلقائي الفوري


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
  // توزيع الأقسام
  // =========================================================

  private readonly departmentAssignments = [

    {
      department: 'تقنية المعلومات',
      position: 'مشرف تقنية المعلومات'
    },

    {
      department: 'الموارد البشرية',
      position: 'مشرف الموارد البشرية'
    },

    {
      department: 'التسويق',
      position: 'مشرف التسويق'
    },

    {
      department: 'المالية',
      position: 'مشرف مالي'
    },

    {
      department: 'التدريب والتطوير',
      position: 'مسؤول التدريب والتطوير'
    },

    {
      department: 'الجودة',
      position: 'مشرف الجودة'
    },

    {
      department: 'الشؤون الإدارية',
      position: 'مشرف الشؤون الإدارية'
    },

    {
      department: 'التدريب والتطوير',
      position: 'منسق التدريب والتطوير'
    }

  ];


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

          this.supervisors = data.map(
            (item: any, index: number) => {

              const assignment =
                this.departmentAssignments[
                  index % this.departmentAssignments.length
                ];


              const supervisorId =
                Number(
                  item.supervisorId ??
                  item.id ??
                  0
                );


              const status =
                item.status ?? 'Active';


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
                  assignment.department,

                position:
                  assignment.position,


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
                    item.stats?.monthlyEvaluations ??
                    0,

                  attendanceRate:
                    item.stats?.attendanceRate ??
                    0,

                  assignedTrainees:
                    item.stats?.assignedTrainees ??
                    0

                }

              };

            }
          );

          this.calculateStatistics();

          this.loading = false;

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
  // الفلترة الديناميكية (Getter) لحل مشاكل الأزرار والبحث
  // =========================================================

  get filteredSupervisors(): Supervisor[] {
    const query = this.searchQuery.trim().toLowerCase();

    return this.supervisors.filter((supervisor) => {
      const matchesDepartment =
        this.selectedDept === 'all' ||
        supervisor.department === this.selectedDept;

      const matchesSearch =
        !query ||
        supervisor.fullName?.toLowerCase().includes(query) ||
        supervisor.email?.toLowerCase().includes(query) ||
        supervisor.phone?.toLowerCase().includes(query) ||
        supervisor.department?.toLowerCase().includes(query) ||
        supervisor.position?.toLowerCase().includes(query);

      return matchesDepartment && matchesSearch;
    });
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

    this.selectedDept = department;

  }


  // =========================================================
  // الإحصائيات
  // =========================================================

  calculateStatistics(): void {

    this.totalAssignedTrainees =
      this.supervisors.reduce(
        (total, supervisor) =>
          total +
          (
            supervisor.stats
              ?.assignedTrainees ??
            0
          ),
        0
      );


    if (this.supervisors.length > 0) {

      const totalAttendance =
        this.supervisors.reduce(
          (total, supervisor) =>
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


    if (parts.length === 1) {

      return parts[0]
        .substring(0, 2);

    }


    return (
      parts[0].charAt(0) +
      parts[1].charAt(0)
    );

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

        if (item !== supervisor) {
          item.showMenu = false;
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
        .updateSupervisor(id, dto)
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
      .updateSupervisor(id, dto)
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
              (item: any, index: number) => {

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

    if (!this.selectedSupervisor) {
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


    if (attendance >= 90) {
      return 'attendance-good';
    }


    if (attendance >= 70) {
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