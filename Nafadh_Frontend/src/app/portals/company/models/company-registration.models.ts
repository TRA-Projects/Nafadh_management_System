// العقد (Contract) بين فرونت تسجيل الشركة والباك إند (CompanyRegistrationDTO).
// أسماء الحقول هنا مطابقة تمامًا لما يستقبله الباك إند.

/** شكل طلب التسجيل: POST /api/company-registration (عام، بدون توكن) */
export interface CompanyRegistrationRequest {
  companyName: string;
  commercialRegister: string;
  workField: string;
  /** العنوان (المدينة جزء منه، لا يوجد حقل مدينة منفصل) */
  address: string;
  /** الطاقة الاستيعابية: عدد المتدربين المتوقع (اختياري، الافتراضي 0) */
  capacity: number;
  phone: string;
  /** إيميل الشركة، وهو نفسه إيميل دخول مشرف الشركة بعد الاعتماد */
  email: string;
  /** اسم المسؤول (يصبح صاحب حساب الشركة) */
  contactName: string;
}

export interface CompanyRegistrationResponse {
  message: string;
  companyId: number;
  companyName: string;
  email: string;
  /** PendingApproval دائمًا بعد التسجيل */
  status: 'PendingApproval';
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
