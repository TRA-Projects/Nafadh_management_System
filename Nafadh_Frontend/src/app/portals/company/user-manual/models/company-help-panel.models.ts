
/**
 * واجهات البيانات التي يستقبلها CompanyCompanyHelpPanelComponent من المكوّن الرئيسي.
 *
 * ملاحظة مهمة:
 * هذه الواجهات مستقلة عن GuidePage، وذلك لضمان أن CompanyCompanyHelpPanelComponent
 * مكوّن Reusable تماماً.
 *
 * المطور الرئيسي مسؤول عن تحويل GuidePage → HelpPanelData داخل
 * CompanyManualShell.
 */

export interface HelpFaqItem {
  /** معرّف فريد للسؤال */
  id: string;

  /** نص السؤال */
  question: string;

  /** نص الجواب */
  answer: string;
}

export interface HelpStep {
  /** معرّف فريد للخطوة */
  id: string;

  /** نص الخطوة */
  text: string;
}

export interface HelpSection {
  /** معرّف فريد للقسم */
  id: string;

  /** عنوان القسم */
  title: string;

  /** وصف مختصر للقسم (اختياري) */
  description?: string;

  /** اسم أيقونة nfd-icon (اختياري) */
  icon?: string;

  /** قائمة الخطوات (اختياري) */
  steps?: HelpStep[];
}

export interface HelpPanelData {
  /** عنوان الصفحة الحالية */
  pageTitle: string;

  /** وصف مختصر عن وظيفة الصفحة */
  pageDescription: string;

  /** أقسام "كيفية الاستخدام" */
  sections?: HelpSection[];

  /** الأسئلة الشائعة */
  faqs?: HelpFaqItem[];

  /** معلومات إضافية (اختياري) */
  extraInfo?: string;
}