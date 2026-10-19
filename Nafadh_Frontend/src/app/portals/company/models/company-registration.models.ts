// العقد (Contract) بين فرونت تسجيل الشركة وباك نورة.
// أي تغيير هنا لازم يتفق عليه مع نورة أولاً.

/** شكل طلب التسجيل: POST /api/company-registration (عام، بدون توكن) */
export interface CompanyRegistrationRequest {
  companyName: string;
  commercialRegister: string;
  workField: string;
  city: string;
  address: string;
  phone: string;
  /** إيميل الشركة، وهو نفسه إيميل دخول مشرف الشركة بعد الاعتماد */
  email: string;
  /** اسم مشرف الشركة (صاحب الحساب) */
  supervisorName: string;
}

export interface CompanyRegistrationResponse {
  message: string;
  companyId: number;
  /** PendingApproval دائمًا بعد التسجيل */
  status: 'PendingApproval';
  /** true لو الإيميل كان لشركة مرفوضة وتم تحديث طلبها بدل إنشاء طلب جديد */
  resubmitted?: boolean;
}

/** رموز الأخطاء المتفق عليها مع الباك (الحقل code في جسم الخطأ) */
export type RegistrationErrorCode =
  | 'DUPLICATE_EMAIL'
  | 'DUPLICATE_COMMERCIAL_REGISTER'
  | 'COMPANY_PENDING_APPROVAL' // طلب سابق ما زال قيد المراجعة
  | 'VALIDATION_FAILED';

export type LoginCompanyErrorCode =
  | 'COMPANY_PENDING_APPROVAL'
  | 'COMPANY_REJECTED'
  | 'COMPANY_SUSPENDED'
  | 'INVALID_CREDENTIALS';

/** شكل جسم الخطأ من الباك */
export interface ApiErrorBody {
  code?: string;
  message?: string;
  /** سبب الرفض، يرجع مع COMPANY_REJECTED */
  rejectionReason?: string;
  /** أخطاء الحقول مع VALIDATION_FAILED: { fieldName: 'رسالة' } */
  errors?: Record<string, string>;
}
