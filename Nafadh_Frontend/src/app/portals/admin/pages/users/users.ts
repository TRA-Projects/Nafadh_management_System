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

export const DEFAULT_ROLES: RoleDto[] = [
  { roleId: 1, roleName: 'هيئة', displayName: 'Admin' },
  { roleId: 2, roleName: 'شركة', displayName: 'CompanySupervisor' },
  { roleId: 3, roleName: 'مدرب', displayName: 'Trainer' },
  { roleId: 4, roleName: 'متدرب', displayName: 'Trainee' }
];

export interface PresetAvatar {
  id: string;
  name: string;
  url: string;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  { id: 'p1', name: 'مسؤول هيئة', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80' },
  { id: 'p2', name: 'مشرف شركة', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80' },
  { id: 'p3', name: 'مدرب أكاديمي', url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80' },
  { id: 'p4', name: 'مدربة / مشرفة', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80' },
  { id: 'p5', name: 'متدرب تقني', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80' },
  { id: 'p6', name: 'متدرب حاسب', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80' }
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
  rolesList = signal<RoleDto[]>(DEFAULT_ROLES);
  roleFilter = signal<string>('ALL');
  loadingUsers = signal<boolean>(true);
  usersError = signal<string>('');

  // =========================================================
  // تخزين الصورة محليًا (الباك اند لا يدعم avatarUrl)
  // =========================================================
  private readonly AVATAR_STORAGE_PREFIX = 'nfd_avatar_';

  private saveAvatarLocally(userId: number | undefined, avatarUrl: string | undefined): void {
    if (!userId || !avatarUrl) return;
    try {
      localStorage.setItem(this.AVATAR_STORAGE_PREFIX + userId, avatarUrl);
    } catch {
      // تجاهل بصمت لو المتصفح يمنع localStorage
    }
  }

  private getLocalAvatar(userId: number | undefined): string | null {
    if (!userId) return null;
    try {
      return localStorage.getItem(this.AVATAR_STORAGE_PREFIX + userId);
    } catch {
      return null;
    }
  }

  private removeLocalAvatar(userId: number | undefined): void {
    if (!userId) return;
    try {
      localStorage.removeItem(this.AVATAR_STORAGE_PREFIX + userId);
    } catch {
      // تجاهل
    }
  }

  // =========================================================
  // البحث والتصفية المتقدمة
  // =========================================================
  searchQuery = signal<string>('');
  statusFilter = signal<string>('ALL');
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

  // =========================================================
  // بطاقات إحصائية بأعلى الصفحة
  // =========================================================
  statsTotal = computed(() => this.users().length);

  statsActiveCount = computed(() =>
    this.users().filter((u) => (u.status || '').toLowerCase() !== 'suspended').length
  );

  statsSuspendedCount = computed(() => this.statsTotal() - this.statsActiveCount());

  statsActivePercentage = computed(() =>
    this.statsTotal() === 0 ? 0 : Math.round((this.statsActiveCount() / this.statsTotal()) * 100)
  );

  statsSuspendedPercentage = computed(() =>
    this.statsTotal() === 0 ? 0 : Math.round((this.statsSuspendedCount() / this.statsTotal()) * 100)
  );

  statsNewThisMonth = computed(() => {
    const now = new Date();
    return this.users().filter((u) => {
      if (!u.createdAt) return false;
      const d = new Date(u.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  });

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

  // جديد: نافذة تفاصيل المستخدم (قراءة فقط)
  isDetailsModalOpen = false;
  detailsUser: any = {};

  presetAvatars = PRESET_AVATARS;
  createAvatarMode = signal<'file' | 'url' | 'presets'>('file');
  createAvatarFileName = signal<string>('');
  editAvatarMode = signal<'file' | 'url' | 'presets'>('file');
  editAvatarFileName = signal<string>('');

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
  editSuccessMsg = signal<string>('');

  // =========================================================
  // RESET PASSWORD
  // =========================================================
  newPassword = '';
  resetPasswordTouched = { newPassword: false };
  resetPasswordErrorMsg = '';
  resetPasswordSuccessMsg = signal<string>('');

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

  // جديد: وصف صلاحيات كل دور (لنافذة التفاصيل)
  private readonly permissionsDescriptionByRole: Record<string, string> = {
    Admin: 'صلاحيات كاملة لإدارة النظام: إدارة المستخدمين والأدوار، الشركات، البرامج التدريبية، إصدار الشهادات، ومراجعة التقارير والتحليلات الشاملة.',
    CompanySupervisor: 'إدارة بيانات الشركة التابعة له، متابعة المتدربين المسجلين فيها، ومراجعة تقارير الأداء الخاصة بالشركة.',
    Trainer: 'إدارة البرامج والدفعات التدريبية، تسجيل الحضور، تقييم أداء المتدربين، ومتابعة تسليم المهام.',
    Trainee: 'الوصول للمحتوى التدريبي، تسجيل الحضور، تسليم المهام والمشاريع، وعرض الشهادات الصادرة له.'
  };

  getRolePermissionsCount(roleInput: any): number {
    const normalized = this.normalizeRole(roleInput);
    return this.permissionsCountByRole[normalized] ?? 0;
  }

  getRolePermissionsDescription(roleInput: any): string {
    const normalized = this.normalizeRole(roleInput);
    return this.permissionsDescriptionByRole[normalized] || 'لا يوجد وصف متاح لهذا الدور حاليًا.';
  }

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
        const list = Array.isArray(data) ? data : [];

        const merged = list.map((u) => ({
          ...u,
          avatarUrl: this.getLocalAvatar(u.userId) || (u as any).avatarUrl || ''
        }));

        this.users.set(merged);
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
  // AVATAR
  // =========================================================
  getAvatarUrl(user: any): string {
    if (user?.avatarUrl && String(user.avatarUrl).trim().length > 0) {
      return String(user.avatarUrl).trim();
    }
    const name = (user?.fullName || user || 'user').trim();
    const seed = encodeURIComponent(name);
    return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundType=gradientLinear&fontFamily=Arial&fontWeight=600`;
  }

  setCreateAvatarMode(mode: 'file' | 'url' | 'presets'): void {
    this.createAvatarMode.set(mode);
  }

  setEditAvatarMode(mode: 'file' | 'url' | 'presets'): void {
    this.editAvatarMode.set(mode);
  }

  handleCreateFileSelected(event: any): void {
    const file = event?.target?.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('حجم الصورة يجب أن لا يتجاوز 5 ميجابايت');
        return;
      }
      this.createAvatarFileName.set(`${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
      const reader = new FileReader();
      reader.onload = () => {
        this.newUser.avatarUrl = reader.result as string;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  handleEditFileSelected(event: any): void {
    const file = event?.target?.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('حجم الصورة يجب أن لا يتجاوز 5 ميجابايت');
        return;
      }
      this.editAvatarFileName.set(`${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
      const reader = new FileReader();
      reader.onload = () => {
        this.selectedUser.avatarUrl = reader.result as string;
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  selectCreatePreset(url: string, name: string): void {
    this.newUser.avatarUrl = url;
    this.createAvatarFileName.set(`صورة رمزية: ${name}`);
    this.cdr.detectChanges();
  }

  selectEditPreset(url: string, name: string): void {
    this.selectedUser.avatarUrl = url;
    this.editAvatarFileName.set(`صورة رمزية: ${name}`);
    this.cdr.detectChanges();
  }

  generateCreateInitialsAvatar(): void {
    const seed = encodeURIComponent((this.newUser.fullName || 'User').trim() + '-' + Date.now());
    this.newUser.avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundType=gradientLinear&fontFamily=Arial&fontWeight=600`;
    this.createAvatarFileName.set('رمز تلقائي مشتق من الاسم');
    this.cdr.detectChanges();
  }

  generateEditInitialsAvatar(): void {
    const seed = encodeURIComponent((this.selectedUser.fullName || 'User').trim() + '-' + Date.now());
    this.selectedUser.avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundType=gradientLinear&fontFamily=Arial&fontWeight=600`;
    this.editAvatarFileName.set('رمز تلقائي مشتق من الاسم');
    this.cdr.detectChanges();
  }

  removeCreateAvatar(): void {
    this.newUser.avatarUrl = '';
    this.createAvatarFileName.set('');
    this.cdr.detectChanges();
  }

  removeEditAvatar(): void {
    this.selectedUser.avatarUrl = '';
    this.editAvatarFileName.set('');
    this.removeLocalAvatar(this.selectedUser.userId);
    this.cdr.detectChanges();
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
    this.createAvatarFileName.set('');
    this.createAvatarMode.set('file');
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
      roleId: Number(this.newUser.roleId)
    };

    const pendingAvatar = this.newUser.avatarUrl;

    this.api.createUser(payload).subscribe({
      next: (res: any) => {
        const newUserId = res?.userId ?? res?.UserId ?? res?.id;
        if (newUserId && pendingAvatar) {
          this.saveAvatarLocally(Number(newUserId), pendingAvatar);
        }

        this.closeCreateModal();
        this.loadData();
      },
      error: (err) => {
        console.error('خطأ في إنشاء الحساب:', err);

        if (err.status === 413) {
          this.createErrorMsg = 'حجم الصورة المرفوعة كبير جدًا، يرجى اختيار صورة أصغر أو استخدام رابط صورة بدلاً من الرفع.';
        } else if (err.status === 409) {
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

  // =========================================================
  // جديد: نافذة تفاصيل المستخدم (قراءة فقط)
  // =========================================================
  openDetailsModal(user: any): void {
    const localAvatar = this.getLocalAvatar(user.userId);
    this.detailsUser = {
      ...user,
      avatarUrl: localAvatar || user.avatarUrl || ''
    };
    this.isDetailsModalOpen = true;
    this.cdr.detectChanges();
  }

  closeDetailsModal(): void {
    this.isDetailsModalOpen = false;
    this.detailsUser = {};
    this.cdr.detectChanges();
  }

  openEditModal(user: any): void {
    this.selectedUser = { ...user };

    const localAvatar = this.getLocalAvatar(user.userId);
    if (localAvatar) {
      this.selectedUser.avatarUrl = localAvatar;
    }

    this.editTouched = { fullName: false, email: false };
    this.editErrorMsg = '';
    this.editSuccessMsg.set('');
    this.editAvatarFileName.set('');

    const avatar = this.selectedUser.avatarUrl || '';
    this.editAvatarMode.set(
      avatar
        ? String(avatar).startsWith('data:')
          ? 'file'
          : this.presetAvatars.some((p) => p.url === avatar)
          ? 'presets'
          : 'url'
        : 'file'
    );

    this.isEditModalOpen = true;
    this.cdr.detectChanges();
  }

  closeEditModal(): void {
    this.isEditModalOpen = false;
    this.editErrorMsg = '';
    this.editSuccessMsg.set('');
    this.editAvatarFileName.set('');
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
    this.editSuccessMsg.set('');

    if (!this.isEditFormValid()) {
      this.cdr.detectChanges();
      return;
    }

    const payload = {
      fullName: this.selectedUser.fullName.trim(),
      email: this.selectedUser.email.trim(),
      phone: this.selectedUser.phone,
      roleId: Number(this.selectedUser.roleId)
    };

    const pendingAvatar = this.selectedUser.avatarUrl;
    const userId = this.selectedUser.userId;

    this.api.updateUser(userId, payload).subscribe({
      next: () => {
        if (pendingAvatar) {
          this.saveAvatarLocally(userId, pendingAvatar);
        } else {
          this.removeLocalAvatar(userId);
        }

        this.editSuccessMsg.set('تم تحديث بيانات الحساب بنجاح');
        this.cdr.detectChanges();

        setTimeout(() => {
          this.closeEditModal();
          this.loadData();
        }, 1300);
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
    this.resetPasswordSuccessMsg.set('');
    this.resetPasswordTouched = { newPassword: false };
    this.isResetPasswordModalOpen = true;
    this.cdr.detectChanges();
  }

  closeResetPasswordModal(): void {
    this.isResetPasswordModalOpen = false;
    this.newPassword = '';
    this.resetPasswordErrorMsg = '';
    this.resetPasswordSuccessMsg.set('');
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
    this.resetPasswordSuccessMsg.set('');

    if (!this.isResetPasswordValid()) {
      this.cdr.detectChanges();
      return;
    }

    this.api.resetPassword(this.selectedUser.userId, { newPassword: this.newPassword }).subscribe({
      next: () => {
        this.resetPasswordSuccessMsg.set('تم تغيير كلمة المرور بنجاح');
        this.cdr.detectChanges();

        setTimeout(() => {
          this.closeResetPasswordModal();
        }, 1300);
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
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
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