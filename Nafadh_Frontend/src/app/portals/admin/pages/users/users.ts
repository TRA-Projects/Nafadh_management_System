import {
  Component,
  OnInit,
  computed,
  signal,
  ChangeDetectorRef
} from '@angular/core';

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

// قائمة الأدوار الافتراضية لمنع فراغ القائمة المنسدلة في حال تعثر استدعاء الـ API
export const DEFAULT_ROLES: RoleDto[] = [
  { roleId: 1, roleName: 'هيئة', displayName: 'Admin' },
  { roleId: 2, roleName: 'شركة', displayName: 'CompanySupervisor' },
  { roleId: 3, roleName: 'مدرب', displayName: 'Trainer' },
  { roleId: 4, roleName: 'متدرب', displayName: 'Trainee' }
];

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html',
  styleUrls: ['./users.css']
})
export class AdminUsers implements OnInit {
  // =========================================================
  // USERS
  // =========================================================
  users = signal<UserResponseDto[]>([]);
  // تم تزويد rolesList بالأدوار الافتراضية فوراً لضمان ظهور الخيارات دائماً
  rolesList = signal<RoleDto[]>(DEFAULT_ROLES);
  roleFilter = signal<string>('ALL');
  loadingUsers = signal<boolean>(true);
  usersError = signal<string>('');

  // =========================================================
  // البحث والتصفية المتقدمة
  // =========================================================
  searchQuery = signal<string>('');
  statusFilter = signal<string>('ALL'); // ALL | Active | Suspended
  yearFilter = signal<string>('ALL');
  dateFrom = signal<string>('');
  dateTo = signal<string>('');

  availableYears = computed(() => {
    const yearsSet = new Set<string>();
    this.users().forEach((u) => {
      if (u.createdAt) {
        const y = new Date(u.createdAt).getFullYear();
        if (!isNaN(y)) yearsSet.add(String(y));
      }
    });
    return Array.from(yearsSet).sort((a, b) => Number(b) - Number(a));
  });

  resultsCount = computed(() => this.getFilteredList().length);

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1);
  }

  setStatusFilter(status: string): void {
    this.statusFilter.set(status);
    this.currentPage.set(1);
  }

  setYearFilter(year: string): void {
    this.yearFilter.set(year);
    this.currentPage.set(1);
  }

  onDateFromChange(value: string): void {
    this.dateFrom.set(value);
    this.currentPage.set(1);
  }

  onDateToChange(value: string): void {
    this.dateTo.set(value);
    this.currentPage.set(1);
  }

  hasActiveFilters(): boolean {
    return (
      this.roleFilter() !== 'ALL' ||
      this.statusFilter() !== 'ALL' ||
      this.yearFilter() !== 'ALL' ||
      !!this.dateFrom() ||
      !!this.dateTo() ||
      !!this.searchQuery().trim()
    );
  }

  clearAllFilters(): void {
    this.roleFilter.set('ALL');
    this.statusFilter.set('ALL');
    this.yearFilter.set('ALL');
    this.dateFrom.set('');
    this.dateTo.set('');
    this.searchQuery.set('');
    this.currentPage.set(1);
  }

  private getFilteredList(): UserResponseDto[] {
    const selectedRole = this.roleFilter();
    const status = this.statusFilter();
    const year = this.yearFilter();
    const from = this.dateFrom();
    const to = this.dateTo();
    const query = this.searchQuery().trim().toLowerCase();

    let result = this.users();

    if (selectedRole !== 'ALL') {
      result = result.filter((u) => this.normalizeRole(u.roleName || u.roleId) === selectedRole);
    }

    if (status !== 'ALL') {
      result = result.filter((u) => (u.status || '').toLowerCase() === status.toLowerCase());
    }

    if (query) {
      result = result.filter(
        (u) =>
          (u.fullName || '').toLowerCase().includes(query) ||
          (u.email || '').toLowerCase().includes(query)
      );
    }

    if (year !== 'ALL') {
      result = result.filter((u) => {
        if (!u.createdAt) return false;
        return new Date(u.createdAt).getFullYear().toString() === year;
      });
    }

    if (from) {
      const fromDate = new Date(from);
      result = result.filter((u) => u.createdAt && new Date(u.createdAt) >= fromDate);
    }

    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      result = result.filter((u) => u.createdAt && new Date(u.createdAt) <= toDate);
    }

    return result;
  }

  // =========================================================
  // MODALS
  // =========================================================
  isCreateModalOpen = false;
  isEditModalOpen = false;
  isResetPasswordModalOpen = false;

  // =========================================================
  // CREATE USER
  // =========================================================
  createErrorMsg = '';
  createTouched = {
    fullName: false,
    email: false,
    roleId: false,
    password: false,
    confirmPassword: false
  };

  newUser = {
    fullName: '',
    email: '',
    roleId: 4,
    password: '',
    confirmPassword: '',
    avatarUrl: ''
  };

  // =========================================================
  // EDIT USER
  // =========================================================
  selectedUser: any = {};
  editTouched = { fullName: false, email: false };
  editErrorMsg = '';

  // =========================================================
  // RESET PASSWORD
  // =========================================================
  newPassword = '';
  resetPasswordTouched = { newPassword: false };
  resetPasswordErrorMsg = '';

  // =========================================================
  // PAGINATION
  // =========================================================
  currentPage = signal<number>(1);
  pageSize = 10;

  // =========================================================
  // PERMISSIONS
  // =========================================================
  private readonly permissionsCountByRole: Record<string, number> = {
    Admin: 10,
    CompanySupervisor: 3,
    Trainer: 3,
    Trainee: 0
  };

  // =========================================================
  // RBAC SUMMARY
  // =========================================================
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

  // =========================================================
  // ROLES FILTER (chips)
  // =========================================================
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

  // =========================================================
  // FILTERED USERS (مع الترقيم)
  // =========================================================
  filtered = computed(() => {
    const page = this.currentPage();
    const result = this.getFilteredList();
    const startIndex = (page - 1) * this.pageSize;
    return result.slice(startIndex, startIndex + this.pageSize);
  });

  // =========================================================
  // TOTAL PAGES
  // =========================================================
  totalPages = computed(() => {
    const filteredList = this.getFilteredList();
    return Math.ceil(filteredList.length / this.pageSize) || 1;
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
      next: (data) => {
        this.users.set(Array.isArray(data) ? data : []);
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

    this.api.getRoles().subscribe({
      next: (rolesData) => {
        if (rolesData && rolesData.length > 0) {
          this.rolesList.set(rolesData);
        }
        this.cdr.detectChanges();
      },
      error: (err) => console.error('خطأ في جلب الأدوار:', err)
    });
  }

  setFilter(roleKey: string): void {
    this.roleFilter.set(roleKey);
    this.currentPage.set(1);
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update((page) => page + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update((page) => page - 1);
    }
  }

  getRoleArabicName(roleInput: any): string {
    if (!roleInput) return 'غير محدد';
    const role = String(roleInput).trim().toLowerCase();
    if (role === '1' || role === 'admin' || role.includes('هيئة')) return 'هيئة';
    if (role === '2' || role === 'companysupervisor' || role.includes('شركة')) return 'شركة';
    if (role === '3' || role === 'trainer' || role.includes('مدرب')) return 'مدرب';
    if (role === '4' || role === 'trainee' || role.includes('متدرب')) return 'متدرب';
    return String(roleInput);
  }

  getRoleClass(roleInput: any): string {
    return this.normalizeRole(roleInput).toLowerCase();
  }

  // =========================================================
  // AVATAR: يعرض الصورة الخاصة إن توفرت أو صورة رمزية ثابتة وتلقائية
  // =========================================================
  getAvatarUrl(user: any): string {
    if (user?.avatarUrl && String(user.avatarUrl).trim().length > 0) {
      return String(user.avatarUrl).trim();
    }
    const name = (user?.fullName || user || 'user').trim();
    const seed = encodeURIComponent(name);
    return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundType=gradientLinear&fontFamily=Arial&fontWeight=600`;
  }

  openCreateModal(): void {
    this.createErrorMsg = '';
    this.resetCreateTouched();
    this.isCreateModalOpen = true;
    this.cdr.detectChanges();
  }

  closeCreateModal(): void {
    this.isCreateModalOpen = false;
    this.createErrorMsg = '';
    this.resetForm();
    this.resetCreateTouched();
    this.cdr.detectChanges();
  }

  resetForm(): void {
    const defaultRoleId = this.rolesList().length > 0 ? this.rolesList()[0].roleId : 4;
    this.newUser = {
      fullName: '',
      email: '',
      roleId: defaultRoleId,
      password: '',
      confirmPassword: '',
      avatarUrl: ''
    };
  }

  resetCreateTouched(): void {
    this.createTouched = {
      fullName: false,
      email: false,
      roleId: false,
      password: false,
      confirmPassword: false
    };
  }

  validateCreateField(field: 'fullName' | 'email' | 'roleId' | 'password' | 'confirmPassword'): void {
    this.createTouched[field] = true;
  }

  getCreateFieldError(field: 'fullName' | 'email' | 'roleId' | 'password' | 'confirmPassword'): string {
    switch (field) {
      case 'fullName':
        if (!this.newUser.fullName?.trim()) return 'الاسم الكامل مطلوب';
        if (this.newUser.fullName.trim().length < 3) return 'الاسم يجب أن لا يقل عن 3 أحرف';
        return '';

      case 'email':
        if (!this.newUser.email?.trim()) return 'البريد الإلكتروني مطلوب';
        if (!this.isValidEmail(this.newUser.email)) return 'يرجى إدخال بريد إلكتروني صحيح';
        return '';

      case 'roleId':
        if (!this.newUser.roleId) return 'يرجى اختيار الدور';
        return '';

      case 'password':
        return this.getPasswordError(this.newUser.password);

      case 'confirmPassword':
        if (!this.newUser.confirmPassword) return 'تأكيد كلمة المرور مطلوب';
        if (this.newUser.password !== this.newUser.confirmPassword) return 'كلمة المرور وتأكيد كلمة المرور غير متطابقين';
        return '';

      default:
        return '';
    }
  }

  isCreateFormValid(): boolean {
    return (
      !!this.newUser.fullName?.trim() &&
      this.newUser.fullName.trim().length >= 3 &&
      this.isValidEmail(this.newUser.email) &&
      !!this.newUser.roleId &&
      this.isValidPassword(this.newUser.password) &&
      this.newUser.password === this.newUser.confirmPassword
    );
  }

  createUser(): void {
    this.createErrorMsg = '';
    this.createTouched = {
      fullName: true,
      email: true,
      roleId: true,
      password: true,
      confirmPassword: true
    };

    if (!this.isCreateFormValid()) {
      this.cdr.detectChanges();
      return;
    }

    const payload = {
      fullName: this.newUser.fullName.trim(),
      userName: this.newUser.email.trim(),
      email: this.newUser.email.trim(),
      password: this.newUser.password,
      roleId: Number(this.newUser.roleId),
      avatarUrl: this.newUser.avatarUrl?.trim() || null
    };

    this.api.createUser(payload).subscribe({
      next: () => {
        this.closeCreateModal();
        this.loadData();
      },
      error: (err) => {
        console.error('خطأ في إنشاء الحساب:', err);

        if (err.status === 409) {
          this.createErrorMsg = 'البريد الإلكتروني مستخدم مسبقاً، يرجى استخدام بريد آخر.';
        } else if (err.error?.message) {
          this.createErrorMsg = err.error.message;
        } else {
          this.createErrorMsg = 'حدث خطأ أثناء إضافة الحساب، تأكد من صحة البيانات.';
        }

        this.cdr.detectChanges();
      }
    });
  }

  openEditModal(user: UserResponseDto): void {
    this.selectedUser = { ...user };
    this.editTouched = { fullName: false, email: false };
    this.editErrorMsg = '';
    this.isEditModalOpen = true;
    this.cdr.detectChanges();
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.editErrorMsg = '';
    this.editTouched = { fullName: false, email: false };
    this.cdr.detectChanges();
  }

  validateEditField(field: 'fullName' | 'email'): void {
    this.editTouched[field] = true;
  }

  getEditFieldError(field: 'fullName' | 'email'): string {
    switch (field) {
      case 'fullName':
        if (!this.selectedUser.fullName?.trim()) return 'الاسم الكامل مطلوب';
        if (this.selectedUser.fullName.trim().length < 3) return 'الاسم يجب أن لا يقل عن 3 أحرف';
        return '';

      case 'email':
        if (!this.selectedUser.email?.trim()) return 'البريد الإلكتروني مطلوب';
        if (!this.isValidEmail(this.selectedUser.email)) return 'يرجى إدخال بريد إلكتروني صحيح';
        return '';

      default:
        return '';
    }
  }

  isEditFormValid(): boolean {
    return (
      !!this.selectedUser.fullName?.trim() &&
      this.selectedUser.fullName.trim().length >= 3 &&
      this.isValidEmail(this.selectedUser.email)
    );
  }

  updateUser(): void {
    this.editTouched = { fullName: true, email: true };
    this.editErrorMsg = '';

    if (!this.isEditFormValid()) {
      this.cdr.detectChanges();
      return;
    }

    const payload = {
      fullName: this.selectedUser.fullName.trim(),
      email: this.selectedUser.email.trim(),
      phone: this.selectedUser.phone,
      roleId: Number(this.selectedUser.roleId),
      avatarUrl: this.selectedUser.avatarUrl?.trim() || null
    };

    this.api.updateUser(this.selectedUser.userId, payload).subscribe({
      next: () => {
        alert('تم تحديث بيانات الحساب بنجاح');
        this.closeEditModal();
        this.loadData();
      },
      error: (err) => {
        console.error('خطأ أثناء تعديل البيانات:', err);

        if (err.status === 409) {
          this.editErrorMsg = 'البريد الإلكتروني مستخدم مسبقاً، يرجى استخدام بريد آخر.';
        } else if (err.error?.message) {
          this.editErrorMsg = err.error.message;
        } else {
          this.editErrorMsg = 'حدث خطأ أثناء تحديث البيانات';
        }

        this.cdr.detectChanges();
      }
    });
  }

  openResetPasswordModal(user: UserResponseDto): void {
    this.selectedUser = { ...user };
    this.newPassword = '';
    this.resetPasswordErrorMsg = '';
    this.resetPasswordTouched = { newPassword: false };
    this.isResetPasswordModalOpen = true;
    this.cdr.detectChanges();
  }

  closeResetPasswordModal(): void {
    this.isResetPasswordModalOpen = false;
    this.newPassword = '';
    this.resetPasswordErrorMsg = '';
    this.resetPasswordTouched = { newPassword: false };
    this.cdr.detectChanges();
  }

  validateResetPasswordField(): void {
    this.resetPasswordTouched.newPassword = true;
  }

  getResetPasswordError(): string {
    return this.getPasswordError(this.newPassword);
  }

  isResetPasswordValid(): boolean {
    return this.isValidPassword(this.newPassword);
  }

  confirmResetPassword(): void {
    this.resetPasswordTouched.newPassword = true;
    this.resetPasswordErrorMsg = '';

    if (!this.isResetPasswordValid()) {
      this.cdr.detectChanges();
      return;
    }

    this.api.resetPassword(this.selectedUser.userId, { newPassword: this.newPassword }).subscribe({
      next: () => {
        alert('تم تغيير كلمة المرور بنجاح');
        this.closeResetPasswordModal();
      },
      error: (err) => {
        console.error('تعذر تغيير كلمة المرور:', err);
        this.resetPasswordErrorMsg = err.error?.message || 'تعذر تغيير كلمة المرور';
        this.cdr.detectChanges();
      }
    });
  }

  getPasswordError(password: string): string {
    if (!password) return 'كلمة المرور مطلوبة';
    if (!this.passwordHasMinLengthFor(password)) return 'كلمة المرور يجب أن تحتوي على 8 أحرف على الأقل';
    if (!this.passwordHasUppercaseFor(password)) return 'يجب أن تحتوي كلمة المرور على حرف كبير';
    if (!this.passwordHasLowercaseFor(password)) return 'يجب أن تحتوي كلمة المرور على حرف صغير';
    if (!this.passwordHasNumberFor(password)) return 'يجب أن تحتوي كلمة المرور على رقم واحد على الأقل';
    return '';
  }

  isValidPassword(password: string): boolean {
    if (!password) return false;
    return (
      this.passwordHasMinLengthFor(password) &&
      this.passwordHasUppercaseFor(password) &&
      this.passwordHasLowercaseFor(password) &&
      this.passwordHasNumberFor(password)
    );
  }

  passwordHasMinLength(): boolean {
    return (this.newUser.password || '').length >= 8;
  }

  passwordHasUppercase(): boolean {
    return /[A-Z]/.test(this.newUser.password || '');
  }

  passwordHasLowercase(): boolean {
    return /[a-z]/.test(this.newUser.password || '');
  }

  passwordHasNumber(): boolean {
    return /\d/.test(this.newUser.password || '');
  }

  passwordHasMinLengthFor(password: string): boolean {
    return (password || '').length >= 8;
  }

  passwordHasUppercaseFor(password: string): boolean {
    return /[A-Z]/.test(password || '');
  }

  passwordHasLowercaseFor(password: string): boolean {
    return /[a-z]/.test(password || '');
  }

  passwordHasNumberFor(password: string): boolean {
    return /\d/.test(password || '');
  }

  isValidEmail(email: string): boolean {
    if (!email) return false;
    const emailPattern = /^[^s@]+@[^s@]+.[^s@]{2,}$/;
    return emailPattern.test(email.trim());
  }

  getInitials(name: string): string {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return parts[0][0] + parts[1][0];
    return parts[0].slice(0, 2);
  }

  public normalizeRole(roleInput: any): string {
    if (!roleInput) return '';
    const role = String(roleInput).trim().toLowerCase();
    if (role === '1' || role === 'admin' || role.includes('هيئة')) return 'Admin';
    if (role === '2' || role === 'companysupervisor' || role.includes('شركة')) return 'CompanySupervisor';
    if (role === '3' || role === 'trainer' || role.includes('مدرب')) return 'Trainer';
    if (role === '4' || role === 'trainee' || role.includes('متدرب')) return 'Trainee';
    return role;
  }

  private countByRole(list: UserResponseDto[], targetRole: string): number {
    return list.filter((u) => this.normalizeRole(u.roleName || u.roleId) === targetRole).length;
  }
}
