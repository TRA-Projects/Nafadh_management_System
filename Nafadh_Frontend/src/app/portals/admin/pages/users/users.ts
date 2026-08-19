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

  rbacSummary = signal([
    { role: 'Admin', permissionsCount: 10, usersCount: 1 },
    { role: 'CompanySupervisor', permissionsCount: 3, usersCount: 6 },
    { role: 'Trainer', permissionsCount: 3, usersCount: 3 },
    { role: 'Trainee', permissionsCount: 0, usersCount: 12 }
  ]);

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
    return list.filter(u => this.normalizeRole(u.roleName) === selected);
  });

  constructor(
    private api: AdminApi,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.api.getUsers().subscribe({
      next: (d) => {
        this.users.set(d || []);
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('خطأ في جلب المستخدمين:', err);
        if (err.status === 401) {
          console.warn('غير مصرح - تحقق من إرسال Token مع Request');
        }
        this.users.set([]);
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

    // إضافة userName لتوافق ASP.NET Core Identity
    const payload = {
      fullName: this.newUser.fullName,
      userName: this.newUser.email,
      email: this.newUser.email,
      password: this.newUser.password,
      roleId: Number(this.newUser.roleId)
    };

    this.api.createUser(payload).subscribe({
      next: (res) => {
        alert('تم إنشاء الحساب وحفظه في قاعدة البيانات بنجاح!');
        this.closeCreateModal();
        this.loadData(); // إعادة تحميل البيانات مباشرة من الباك إند
      },
      error: (err) => {
        console.error('تفاصيل خطأ إنشاء الحساب:', err);

        if (err.status === 401) {
          alert('انتهت جلسة الدخول أو لا تملك صلاحية، يرجى تسجيل الدخول مجدداً.');
          return;
        }

        const errors = err?.error?.errors;
        if (errors) {
          const firstKey = Object.keys(errors)[0];
          alert(`خطأ بالبيانات: ${errors[firstKey][0]}`);
        } else if (err?.error?.message) {
          alert(`فشل الحفظ: ${err.error.message}`);
        } else {
          alert('حدث خطأ أثناء إضافة الحساب، تأكد من استيفاء شروط كلمة المرور (رمز، حرف كبير، أرقام).');
        }
      }
    });
  }

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
    this.api.updateUserStatus(this.selectedUser.userId, this.selectedUser.status).subscribe({
      next: () => {
        alert('تم التحديث بنجاح');
        this.closeEditModal();
        this.loadData();
      },
      error: (err) => console.error(err)
    });
  }

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
    alert('تم تغيير كلمة المرور بنجاح');
    this.closeResetPasswordModal();
  }

  getInitials(name: string): string {
    if (!name) return '';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`;
    return parts[0].slice(0, 2);
  }

  private normalizeRole(roleName: string): string {
    if (!roleName) return '';
    const name = roleName.trim().toLowerCase();
    if (name === 'admin' || name.includes('هيئة')) return 'Admin';
    if (name === 'companysupervisor' || name.includes('شركة')) return 'CompanySupervisor';
    if (name === 'trainer' || name.includes('مدرب')) return 'Trainer';
    if (name === 'trainee' || name.includes('متدرب')) return 'Trainee';
    return roleName;
  }

  private countByRole(list: UserResponseDto[], targetRole: string): number {
    return list.filter(u => this.normalizeRole(u.roleName) === targetRole).length;
  }
}