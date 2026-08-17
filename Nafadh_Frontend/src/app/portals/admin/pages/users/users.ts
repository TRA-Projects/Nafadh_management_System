import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../services/admin-api';
import { UserResponseDto } from '../../../../core/models/dtos';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html',
  styleUrls: ['./users.css']
})
export class AdminUsers implements OnInit {
  users = signal<UserResponseDto[]>([]);
  roleFilter = signal<string>('الكل');
  showCreate = signal<boolean>(false);

  newUser = { fullName: '', email: '', phone: '', roleId: 1, password: '' };

  constructor(private api: AdminApi) {}

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.getUsers().subscribe((d) => this.users.set(d));
  }

  // توحيد مسمى الدور لتفادي أخطاء المقارنة والترميز
  private normalizeRole(role: string): string {
    const map: Record<string, string> = {
      'هيئة': 'Admin',
      'شركة': 'CompanySupervisor',
      'مدرب': 'Trainer',
      'متدرب': 'Trainee'
    };
    return map[role] || role;
  }

  // 1. تفعيل أزرار الفلترة
  setFilter(roleKey: string) {
    this.roleFilter.set(roleKey);
  }

  // القائمة المفلترة المحدثة تلقائياً
  filtered = computed(() => {
    const filter = this.roleFilter();
    const list = this.users();

    if (filter === 'الكل') return list;

    const targetRole = this.normalizeRole(filter);
    return list.filter((u) => this.normalizeRole(u.roleName) === targetRole);
  });

  // حساب عدد المستخدمين للـ Chips
  getRoleCount(roleKey: string): number {
    const list = this.users();
    if (roleKey === 'الكل') return list.length;

    const targetRole = this.normalizeRole(roleKey);
    return list.filter((u) => this.normalizeRole(u.roleName) === targetRole).length;
  }

  // حساب أعداد جدول RBAC
  getRbacUserCount(roleKey: string): number {
    return this.getRoleCount(roleKey);
  }

  // 2. تفعيل فتح وإغلاق النافذة المنبثقة
  openCreateModal() {
    this.showCreate.set(true);
  }

  closeCreateModal() {
    this.showCreate.set(false);
  }

  // 3. تفعيل إنشاء حساب جديد
  createUser() {
    if (!this.newUser.fullName || !this.newUser.email) return;

    this.api.createUser(this.newUser).subscribe({
      next: () => {
        this.closeCreateModal();
        this.newUser = { fullName: '', email: '', phone: '', roleId: 1, password: '' };
        this.load();
      },
      error: (err) => console.error('خطأ أثناء إنشاء الحساب:', err)
    });
  }

  // 4. تفعيل تغيير حالة الحساب (نشط / موقوف)
  toggleStatus(u: UserResponseDto) {
    const nextStatus = u.status === 'Active' ? 'Suspended' : 'Active';
    this.api.updateUserStatus(u.userId, nextStatus).subscribe(() => this.load());
  }

  // أساليب مساعدة للعرض والواجهة
  getInitials(name: string): string {
    if (!name) return '';
    const parts = name.trim().split(' ');
    return parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : parts[0].substring(0, 2);
  }

  getRoleLabel(roleName: string): string {
    const map: Record<string, string> = {
      'Admin': 'هيئة',
      'CompanySupervisor': 'شركة',
      'Trainer': 'مدرب',
      'Trainee': 'متدرب'
    };
    return map[roleName] || roleName;
  }

  getAvatarBg(roleName: string): string {
    const map: Record<string, string> = {
      'Admin': '#0f172a',
      'Trainer': '#0d9488',
      'CompanySupervisor': '#d97706',
      'Trainee': '#2563eb'
    };
    return map[roleName] || '#64748b';
  }
}