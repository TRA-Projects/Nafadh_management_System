import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminApi } from '../../services/admin-api';

export interface UserDto {
  userId?: number;
  fullName: string;
  email: string;
  phoneNumber?: string; // أضفنا حقل رقم الهاتف هنا
  roleId?: number;
  role?: string;
  password?: string;
  createdAt?: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html',
  styleUrls: ['./users.css']
})
export class AdminUsers implements OnInit {
  statusFilter = signal<string>('الكل');
  users = signal<UserDto[]>([]);
  isLoading = signal<boolean>(false);

  showAddModal = signal<boolean>(false);
  isSaving = signal<boolean>(false);

  // إدارة الأخطاء وتتبع التفاعل مع الحقول
  formErrors = signal<{ [key: string]: string }>({});
  touchedFields = signal<{ [key: string]: boolean }>({});
  addError = signal<string>('');

  roleOptions: { value: number; label: string; name: string }[] = [
    { value: 1, label: 'أدمن', name: 'Admin' },
    { value: 2, label: 'شركة', name: 'Company' },
    { value: 3, label: 'مدرب', name: 'Trainer' },
    { value: 4, label: 'متدرب', name: 'Trainee' }
  ];

  newUser: any = this.emptyUserForm();

  constructor(private adminApi: AdminApi) { }

  ngOnInit(): void {
    this.loadUsers();
  }

  setFilter(role: string) {
    this.statusFilter.set(role);
  }

  filtered = computed(() => {
    const filter = this.statusFilter();
    if (filter === 'الكل') {
      return this.users();
    }
    return this.users().filter(u => String(u.role) === String(filter));
  });

  loadUsers() {
    this.isLoading.set(true);
    this.adminApi.getUsers().subscribe({
      next: (data: any) => {
        this.users.set(data?.items || data || []);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('خطأ في جلب بيانات المستخدمين:', err);
        this.isLoading.set(false);
      }
    });
  }

  private emptyUserForm() {
    return {
      fullName: '',
      email: '',
      phoneNumber: '', // تهيئة حقل رقم الهاتف بفارغ
      roleId: null,
      password: '',
      confirmPassword: ''
    };
  }

  openAddModal() {
    this.newUser = this.emptyUserForm();
    this.formErrors.set({});
    this.touchedFields.set({});
    this.addError.set('');
    this.showAddModal.set(true);
  }

  closeAddModal() {
    this.isSaving.set(false);
    this.showAddModal.set(false);
  }

  closeAllDropdowns() { }

  roleLabel(val: any): string {
    return this.roleOptions.find(o => o.value === Number(val) || o.name === String(val))?.label ?? val;
  }

  markTouched(field: string): void {
    this.touchedFields.set({ ...this.touchedFields(), [field]: true });
    this.validateForm();
  }

  // محرك التحقق الشامل (Form Validation Engine)
  validateForm(): boolean {
    const errors: { [key: string]: string } = {};
    const nameRegex = /^[\u0600-\u06FFa-zA-Z\s]{6,50}$/;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    const phoneRegex = /^[0-9]{8}$/; // التحقق من أن رقم الهاتف مكون من 8 أرقام فقط
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    // 1. الاسم الكامل
    const fullNameVal = (this.newUser.fullName || '').trim();
    if (!fullNameVal) {
      errors['fullName'] = 'الاسم الكامل مطلوب ولا يمكن تركه فارغاً.';
    } else if (fullNameVal.length < 6) {
      errors['fullName'] = 'يجب أن يكون الاسم 6 أحرف على الأقل (يفضل الاسم الثلاثي).';
    } else if (!nameRegex.test(fullNameVal)) {
      errors['fullName'] = 'يجب أن يحتوي الاسم على أحرف فقط بدون أرقام أو رموز.';
    }

    // 2. البريد الإلكتروني
    const emailVal = (this.newUser.email || '').trim();
    if (!emailVal) {
      errors['email'] = 'البريد الإلكتروني مطلوب.';
    } else if (!emailRegex.test(emailVal)) {
      errors['email'] = 'يرجى إدخال بريد إلكتروني بصيغة صحيحة (مثال: admin@nafadh.om).';
    }

    // 3. رقم الهاتف (8 أرقام فقط)
    const phoneVal = (this.newUser.phoneNumber || '').trim();
    if (!phoneVal) {
      errors['phoneNumber'] = 'رقم الهاتف مطلوب.';
    } else if (!phoneRegex.test(phoneVal)) {
      errors['phoneNumber'] = 'يجب أن يتكون رقم الهاتف من 8 أرقام صحيحة فقط.';
    }

    // 4. تحديد الدور
    if (!this.newUser.roleId || Number(this.newUser.roleId) <= 0) {
      errors['role'] = 'يرجى اختيار دور المستخدم.';
    }

    // 5. كلمة المرور
    if (!this.newUser.password) {
      errors['password'] = 'كلمة المرور مطلوبة.';
    } else if (!passwordRegex.test(this.newUser.password)) {
      errors['password'] = 'يجب أن تحتوي على 8 أحرف، حرف كبير، حرف صغير، رقم، ورمز خاص (@$!%*?&).';
    }

    // 6. تأكيد كلمة المرور
    if (!this.newUser.confirmPassword) {
      errors['confirmPassword'] = 'يرجى تأكيد كلمة المرور.';
    } else if (this.newUser.password !== this.newUser.confirmPassword) {
      errors['confirmPassword'] = 'كلمتا المرور غير متطابقتين.';
    }

    this.formErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  submitAddUser() {
    this.addError.set('');

    this.touchedFields.set({
      fullName: true,
      email: true,
      phoneNumber: true,
      role: true,
      password: true,
      confirmPassword: true
    });

    if (!this.validateForm() || this.isSaving()) {
      return;
    }

    this.isSaving.set(true);

    const payload = {
      fullName: this.newUser.fullName.trim(),
      email: this.newUser.email.trim(),
      phone: this.newUser.phoneNumber.trim(), // إرسال رقم الهاتف مع البيانات
      roleId: Number(this.newUser.roleId),
      password: this.newUser.password
    };

    this.adminApi.createUser(payload).subscribe({
      next: (res: any) => {
        this.users.update(list => [res, ...list]);
        this.isSaving.set(false);
        this.closeAddModal();
      },
      error: (err) => {
        console.error('تفاصيل الخطأ:', err);
        this.isSaving.set(false);
        if (err.status === 409 || err?.error?.title === 'Conflict') {
          this.addError.set('البريد الإلكتروني مستخدم مسبقاً، يرجى استخدام بريد آخر.');
        } else {
          this.addError.set(err?.error?.message || 'حدث خطأ أثناء إضافة المستخدم، يرجى المحاولة لاحقاً.');
        }
      }
    });
  }
}