import { ApiErrorBody } from '../models/company-registration.models';

// الباك يرجع سبب الرفض في reason (و rejectionReason للتوافق).
type BackendErrorBody = ApiErrorBody & { reason?: string; detail?: string };

export type NoticeKind = 'pending' | 'rejected' | 'suspended' | 'error';

export interface LoginNotice {
  kind: NoticeKind;
  title: string;
  text: string;
  /** يظهر رابط "إعادة تقديم الطلب" */
  canReapply?: boolean;
}

const GENERIC_LOGIN_ERROR = 'تعذّر تسجيل الدخول، تأكد من البريد الإلكتروني وكلمة المرور.';

export function describeLoginError(err: unknown): LoginNotice {
  const errorObj = err as { error?: BackendErrorBody | string } | null;
  const rawError = errorObj?.error;
  // الاستجابة قد تكون كائن خطأ من API أو نصًا مباشرًا.
  const body: BackendErrorBody = rawError && typeof rawError === 'object' ? rawError : {};
  const rejectionReason = body.rejectionReason ?? body.reason;

  // ASP.NET ProblemDetails يرسل بعض رسائل الخطأ داخل detail.
  let errorMessage = body.message || body.detail || (typeof rawError === 'string' ? rawError : '');

  // ترجمة رسالة الباك اند الإنجليزية إلى العربية (عند إدخال كلمة مرور خاطئة)
  if (errorMessage && (errorMessage.includes('Invalid email or password') || errorMessage.includes('Authentication failed'))) {
    errorMessage = GENERIC_LOGIN_ERROR;
  }

  // التحقق من رسالة الانسحاب
  if (errorMessage && (errorMessage.includes('انسحاب') || errorMessage.includes('الانسحاب'))) {
    return {
      kind: 'rejected',
      title: 'تم إلغاء الحساب',
      text: errorMessage
    };
  }

  // التحقق من بقية أخطاء الشركات
  switch (body.code) {
    case 'COMPANY_PENDING_APPROVAL':
      return {
        kind: 'pending',
        title: 'حسابك قيد المراجعة',
        text: 'طلب تسجيل شركتك لدى الهيئة للاعتماد. سنرسل لك بريدًا إلكترونيًا ببيانات الدخول فور الموافقة.',
      };
    case 'COMPANY_REJECTED':
      return {
        kind: 'rejected',
        title: 'تم رفض طلب تسجيل شركتك',
        text: rejectionReason
          ? `سبب الرفض: ${rejectionReason}`
          : 'يمكنك تعديل بيانات الطلب وإعادة تقديمه.',
        canReapply: true,
      };
    case 'COMPANY_SUSPENDED':
      return {
        kind: 'suspended',
        title: 'حساب شركتك موقوف',
        text: 'تم إيقاف حساب الشركة مؤقتًا. للاستفسار تواصل مع إدارة نفاذ.',
      };
    default:
      // إرجاع الرسالة القادمة من الباك اند
      return { 
        kind: 'error', 
        title: '', 
        text: errorMessage || GENERIC_LOGIN_ERROR 
      };
  }
}

/** رسالة عامة لفشل تسجيل الشركة (غير أخطاء الحقول) */
export function describeRegistrationError(err: unknown): { text: string; fieldErrors: Record<string, string> } {
  const status = (err as { status?: number } | null)?.status;
  const body = ((err as { error?: BackendErrorBody } | null)?.error ?? {}) as BackendErrorBody;

  switch (body.code) {
    case 'DUPLICATE_EMAIL':
      return { text: '', fieldErrors: { email: 'هذا البريد الإلكتروني مسجّل مسبقًا. جرّب تسجيل الدخول.' } };
    case 'DUPLICATE_COMMERCIAL_REGISTER':
      return { text: '', fieldErrors: { commercialRegister: 'رقم السجل التجاري مسجّل مسبقًا.' } };
    case 'COMPANY_PENDING_APPROVAL':
      return { text: 'لديك طلب سابق ما زال قيد المراجعة، لا حاجة لتقديم طلب جديد.', fieldErrors: {} };
    case 'VALIDATION_FAILED':
      return { text: 'بعض البيانات غير صحيحة، راجع الحقول المحددة.', fieldErrors: body.errors ?? {} };
  }
  // أخطاء التحقق الافتراضية من ASP.NET: { errors: { ContactName: ['..'] } }
  if (status === 400 && body.errors && typeof body.errors === 'object') {
    const fieldErrors: Record<string, string> = {};
    for (const [key, val] of Object.entries(body.errors as Record<string, string | string[]>)) {
      const field = key.charAt(0).toLowerCase() + key.slice(1);
      fieldErrors[field] = Array.isArray(val) ? val[0] : val;
    }
    return { text: 'بعض البيانات غير صحيحة، راجع الحقول المحددة.', fieldErrors };
  }
  if (status === 0) return { text: 'تعذّر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.', fieldErrors: {} };
  return { text: body.message || 'حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.', fieldErrors: {} };
}