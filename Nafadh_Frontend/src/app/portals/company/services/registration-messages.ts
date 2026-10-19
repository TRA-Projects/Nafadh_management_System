import { ApiErrorBody } from '../models/company-registration.models';

export type NoticeKind = 'pending' | 'rejected' | 'suspended' | 'error';

export interface LoginNotice {
  kind: NoticeKind;
  title: string;
  text: string;
  /** يظهر رابط "إعادة تقديم الطلب" */
  canReapply?: boolean;
}

const GENERIC_LOGIN_ERROR = 'تعذّر تسجيل الدخول، تأكد من البريد الإلكتروني وكلمة المرور.';

/**
 * يحوّل خطأ تسجيل الدخول القادم من الباك إلى رسالة واضحة.
 * لو الباك ما أرسل code (السلوك القديم) نرجع للرسالة العامة.
 */
export function describeLoginError(err: unknown): LoginNotice {
  const body = ((err as { error?: ApiErrorBody } | null)?.error ?? {}) as ApiErrorBody;

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
        text: body.rejectionReason
          ? `سبب الرفض: ${body.rejectionReason}`
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
      return { kind: 'error', title: '', text: body.message || GENERIC_LOGIN_ERROR };
  }
}


/** رسالة عامة لفشل تسجيل الشركة (غير أخطاء الحقول) */
export function describeRegistrationError(err: unknown): { text: string; fieldErrors: Record<string, string> } {
  const status = (err as { status?: number } | null)?.status;
  const body = ((err as { error?: ApiErrorBody } | null)?.error ?? {}) as ApiErrorBody;

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
  if (status === 0) return { text: 'تعذّر الاتصال بالخادم. تحقق من الإنترنت وحاول مرة أخرى.', fieldErrors: {} };
  return { text: body.message || 'حدث خطأ أثناء إرسال الطلب. حاول مرة أخرى.', fieldErrors: {} };
}
