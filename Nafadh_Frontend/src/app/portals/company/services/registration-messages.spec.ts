import { describe, it, expect } from 'vitest';
import { describeLoginError, describeRegistrationError } from './registration-messages';

const err = (error: object, status = 400) => ({ status, error });

describe('describeLoginError', () => {
  it('قيد المراجعة', () => {
    const n = describeLoginError(err({ code: 'COMPANY_PENDING_APPROVAL' }, 403));
    expect(n.kind).toBe('pending');
    expect(n.title).toContain('قيد المراجعة');
  });
  it('مرفوضة مع السبب وإمكانية إعادة التقديم', () => {
    const n = describeLoginError(err({ code: 'COMPANY_REJECTED', rejectionReason: 'سجل منتهي' }, 403));
    expect(n.kind).toBe('rejected');
    expect(n.text).toContain('سجل منتهي');
    expect(n.canReapply).toBe(true);
  });
  it('مرفوضة: السبب القادم من الباك في reason', () => {
    expect(describeLoginError(err({ code: 'COMPANY_REJECTED', reason: 'بيانات ناقصة' }, 403)).text).toContain('بيانات ناقصة');
  });
  it('موقوفة', () => {
    expect(describeLoginError(err({ code: 'COMPANY_SUSPENDED' }, 403)).kind).toBe('suspended');
  });
  it('بدون code أو خطأ غير متوقع => رسالة عامة', () => {
    expect(describeLoginError(err({})).kind).toBe('error');
    expect(describeLoginError(new TypeError('x')).text).toContain('تعذّر تسجيل الدخول');
    expect(describeLoginError(null).kind).toBe('error');
  });
});

describe('describeRegistrationError', () => {
  it('تكرار الإيميل يظهر على حقل الإيميل', () => {
    expect(describeRegistrationError(err({ code: 'DUPLICATE_EMAIL' }, 409)).fieldErrors['email']).toBeTruthy();
  });
  it('تكرار السجل التجاري', () => {
    expect(
      describeRegistrationError(err({ code: 'DUPLICATE_COMMERCIAL_REGISTER' }, 409)).fieldErrors['commercialRegister']
    ).toBeTruthy();
  });
  it('أخطاء التحقق من السيرفر تمر كما هي', () => {
    const r = describeRegistrationError(err({ code: 'VALIDATION_FAILED', errors: { phone: 'غير صحيح' } }));
    expect(r.fieldErrors['phone']).toBe('غير صحيح');
  });
  it('أخطاء ASP.NET الافتراضية تتحول لأسماء حقول الفورم', () => {
    const r = describeRegistrationError(err({ errors: { ContactName: ['مطلوب'] } }, 400));
    expect(r.fieldErrors['contactName']).toBe('مطلوب');
  });
  it('انقطاع الاتصال', () => {
    expect(describeRegistrationError({ status: 0, error: null }).text).toContain('الاتصال');
  });
});
