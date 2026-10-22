import { Component, HostListener, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

export interface NotificationTemplate {
  id: number;
  code: string;
  name: string;
  type: 'SMS' | 'Email' | 'Push';
  subject?: string;
  body: string;
  isActive: boolean;
}

@Component({
  selector: 'app-notification-templates-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notification-templates-page.component.html',
  styleUrl: './notification-templates-page.component.css'
})
export class NotificationTemplatesPageComponent {
  private router = inject(Router);

  searchTerm = '';
  selectedType = '';
  openMenuId: number | null = null;

  templates = signal<NotificationTemplate[]>([
    {
      id: 1,
      name: 'تأكيد تسجيل الحساب',
      code: 'REG_CONFIRM',
      type: 'Email',
      subject: 'مرحباً بك في المنصة',
      body: 'عزيزي {{name}}، تم التسجيل بنجاح.',
      isActive: true
    },
    {
      id: 2,
      name: 'رمز التحقق (OTP)',
      code: 'SEND_OTP',
      type: 'SMS',
      body: 'رمز التحقق الخاص بك هو: {{otp}}',
      isActive: true
    },
    {
      id: 3,
      name: 'تنبيه تغيير حالة الطلب',
      code: 'ORDER_STATUS',
      type: 'Push',
      body: 'تم تحديث طلبك رقم {{orderId}}',
      isActive: false
    },
    {
      id: 4,
      name: 'إصدار الشهادة',
      code: 'CERT_ISSUED',
      type: 'Email',
      subject: 'تهانينا! تم إصدار شهادتك',
      body: 'عزيزي {{name}}، شهادتك جاهزة للتحميل.',
      isActive: true
    }
  ]);

  filteredTemplates(): NotificationTemplate[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.templates().filter(template => {
      const matchesSearch =
        template.name.toLowerCase().includes(search) ||
        template.code.toLowerCase().includes(search);

      const matchesType =
        !this.selectedType || template.type === this.selectedType;

      return matchesSearch && matchesType;
    });
  }

  openAddModal(): void {
    // يضاف منطق نافذة الإضافة لاحقاً
  }

  toggleMenu(id: number, event: Event): void {
    event.stopPropagation();
    this.openMenuId = this.openMenuId === id ? null : id;
  }

  @HostListener('document:click')
  closeMenu(): void {
    this.openMenuId = null;
  }

  editTemplate(template: NotificationTemplate): void {
    this.openMenuId = null;
    this.router.navigate(['/admin/notification-templates', template.id], {
      state: {
        template: {
          id: template.id,
          code: template.code,
          name: template.name,
          active: template.isActive,
          email: template.type === 'Email',
          sms: template.type === 'SMS'
        }
      }
    });
  }

  deleteTemplate(id: number): void {
    this.templates.update(items =>
      items.filter(template => template.id !== id)
    );
  }
}