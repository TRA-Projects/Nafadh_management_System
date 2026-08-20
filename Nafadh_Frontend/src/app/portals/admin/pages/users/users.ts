import { Component, OnInit, computed, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../services/admin-api';
import { UserResponseDto } from '../../../../core/models/dtos';

export interface RoleFilterItem {
  key: string;
  label: string;
  count: number;
}

export interface RoleDto {
  roleId: number;
  roleName: string;
  displayName?: string;
}

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html',
  styleUrls: ['./users.css']
})
export class AdminUsers implements OnInit {
  users = signal<UserResponseDto[]>([]);
  rolesList = signal<RoleDto[]>([]);
  roleFilter = signal<string>('ALL');

  loadingUsers = signal<boolean>(true);
  usersError = signal<string>('');

  isCreateModalOpen: boolean = false;
  isEditModalOpen: boolean = false;
  isResetPasswordModalOpen: boolean = false;

  newUser = {
    fullName: '',
    email: '',
    roleId: 4,
    password: '',
    confirmPassword: ''
  };

  selectedUser: any = {};
  newPassword = '';

  private readonly permissionsCountByRole: Record<string, number> = {
    Admin: 10,
    CompanySupervisor: 3,
    Trainer: 3,
    Trainee: 0
  };

  rbacSummary = computed(() => {
    const list = this.users();
    const rolesMap = [
      { key: 'Admin', arLabel: 'هيئة' },
      { key: 'CompanySupervisor', arLabel: 'شركة' },
      { key: 'Trainer', arLabel: 'مدرب' },
      { key: 'Trainee', arLabel: 'متدرب' }
    ];

    return rolesMap.map((r) => ({
      role: r.arLabel,
      permissionsCount: this.permissionsCountByRole[r.key],
      usersCount: this.countByRole(list, r.key)
    }));
  });

  roles = computed<RoleFilterItem[]>(() => {
    const list = this.users();
    return [
      { key: 'ALL', label: 'الكل', count: list.length },
      { key: 'Admin', label: 'هيئة', count: this.countByRole(list, 'Admin') },
      { key: 'CompanySupervisor', label: 'شركة', count: this.countByRole(list, 'CompanySupervisor') },
      { key: 'Trainer', label: 'مدرب', count: this.countByRole(list, 'Trainer') },
      { key: 'Trainee', label: 'متدرب', count: this.countByRole(list, 'Trainee') }
    ];
  });

  filtered = computed(() => {
    const selected = this.roleFilter();
    const list = this.users();
    if (selected === 'ALL') return list;
    return list.filter((u) => this.normalizeRole(u.roleName || u.roleId) === selected);
  });

  constructor(
    private api: AdminApi,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loadingUsers.set(true);
    this.usersError.set('');

    this.api.getUsers().subscribe({
      next: (d) => {
        this.users.set(Array.isArray(d) ? d : []);
        this.loadingUsers.set(false);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('خطأ في جلب المستخدمين:', err);
        this.loadingUsers.set(false);

        if (err.status === 401 || err.status === 403) {
          this.usersError.set('غير مصرح لك بعرض المستخدمين - تحقق من تسجيل الدخول أو الصلاحيات');
        } else if (err.status === 0) {
          this.usersError.set('تعذر الاتصال بالخادم - تحقق من تشغيل الـ API وإعدادات CORS');
        } else {
          this.usersError.set('حدث خطأ أثناء تحميل قائمة المستخدمين');
        }
        this.cdr.detectChanges();
      }
    });

    if (this.api.getRoles) {
      this.api.getRoles().subscribe({
        next: (rolesData) => {
          if (rolesData && rolesData.length > 0) {
            this.rolesList.set(rolesData);
            this.newUser.roleId = rolesData[0].roleId;
          }
          this.cdr.detectChanges();
        },
        error: (err) => console.error('خطأ في جلب قائمة الأدوار:', err)
      });
    }
  }

  setFilter(roleKey: string): void {
    this.roleFilter.set(roleKey);
    this.cdr.detectChanges();
  }

  // دالة تحويل اسم الدور للعربي
  getRoleArabicName(roleInput: any): string {
    if (!roleInput) return 'غير محدد';
    const str = String(roleInput).trim().toLowerCase();

    if (str === '1' || str === 'admin' || str.includes('هيئة')) return 'هيئة';
    if (str === '2' || str === 'companysupervisor' || str.includes('شركة')) return 'شركة';
    if (str === '3' || str === 'trainer' || str.includes('مدرب')) return 'مدرب';
    if (str === '4' || str === 'trainee' || str.includes('متدرب')) return 'متدرب';

    return String(roleInput);
  }

  // دالة جلب كلاس التنسيق الخاص بالدور
  getRoleClass(roleInput: any): string {
    const norm = this.normalizeRole(roleInput);
    return norm.toLowerCase();
  }

  // Modal: Create
  openCreateModal(): void {
    this.isCreateModalOpen = true;
    this.cdr.detectChanges();
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
    this.resetForm();
    this.cdr.detectChanges();
  }

  resetForm(): void {
    const defaultRoleId = this.rolesList().length > 0 ? this.rolesList()[0].roleId : 4;
    this.newUser = {
      fullName: '',
      email: '',
      roleId: defaultRoleId,
      password: '',
      confirmPassword: ''
    };
  }

  createUser(): void {
    if (!this.newUser.fullName || !this.newUser.email || !this.newUser.password || !this.newUser.roleId) {
      alert('يرجى تعبئة جميع الحقول المطلوبة (*)');
      return;
    }

    if (this.newUser.password !== this.newUser.confirmPassword) {
      alert('كلمة المرور وتأكيد كلمة المرور غير متطابقين');
      return;
    }

    const payload = {
      fullName: this.newUser.fullName,
      userName: this.newUser.email,
      email: this.newUser.email,
      password: this.newUser.password,
      roleId: Number(this.newUser.roleId)
    };

    this.api.createUser(payload).subscribe({
      next: () => {
        alert('تم إنشاء الحساب بنجاح!');
        this.closeCreateModal();
        this.loadData();
      },
      error: (err) => {
        console.error('تفاصيل خطأ إنشاء الحساب:', err);
        alert('حدث خطأ أثناء إضافة الحساب، تأكد من استيفاء البيانات الشروط المطلوب.');
      }
    });
  }

  // Modal: Edit
  openEditModal(user: UserResponseDto): void {
    this.selectedUser = { ...user };
    this.isEditModalOpen = true;
    this.cdr.detectChanges();
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.cdr.detectChanges();
  }

  updateUser(): void {
    if (!this.selectedUser.fullName || !this.selectedUser.email) {
      alert('يرجى تعبئة الاسم والبريد الإلكتروني');
      return;
    }

    const payload = {
      fullName: this.selectedUser.fullName,
      email: this.selectedUser.email,
      phone: this.selectedUser.phone,
      roleId: Number(this.selectedUser.roleId)
    };

    this.api.updateUser(this.selectedUser.userId, payload).subscribe({
      next: () => {
        alert('تم تحديث بيانات الحساب بنجاح');
        this.closeEditModal();
        this.loadData();
      },
      error: (err) => {
        console.error('خطأ أثناء تعديل البيانات:', err);
        alert('حدث خطأ أثناء تحديث البيانات');
      }
    });
  }

  // Modal: Password
  openResetPasswordModal(user: UserResponseDto): void {
    this.selectedUser = { ...user };
    this.newPassword = '';
    this.isResetPasswordModalOpen = true;
    this.cdr.detectChanges();
  }

  closeResetPasswordModal(): void {
    this.isResetPasswordModalOpen = false;
    this.cdr.detectChanges();
  }

  confirmResetPassword(): void {
    if (!this.newPassword) {
      alert('يرجى إدخال كلمة المرور الجديدة');
      return;
    }

    this.api.resetPassword(this.selectedUser.userId, { newPassword: this.newPassword }).subscribe({
      next: () => {
        alert('تم تغيير كلمة المرور بنجاح');
        this.closeResetPasswordModal();
      },
      error: (err) => {
        console.error('خطأ أثناء تغيير كلمة المرور:', err);
        alert('تعذر تغيير كلمة المرور');
      }
    });
  }

  getInitials(name: string): string {
    if (!name) return '';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`;
    return parts[0].slice(0, 2);
  }

  public normalizeRole(roleInput: any): string {
    if (!roleInput) return '';
    const str = String(roleInput).trim().toLowerCase();

    if (str === '1' || str === 'admin' || str.includes('هيئة')) return 'Admin';
    if (str === '2' || str === 'companysupervisor' || str.includes('شركة')) return 'CompanySupervisor';
    if (str === '3' || str === 'trainer' || str.includes('مدرب')) return 'Trainer';
    if (str === '4' || str === 'trainee' || str.includes('متدرب')) return 'Trainee';

    return str;
  }

  private countByRole(list: UserResponseDto[], targetRole: string): number {
    return list.filter((u) => this.normalizeRole(u.roleName || u.roleId) === targetRole).length;
  }
}