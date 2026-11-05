import { EVALUATION_TYPE_LABELS, WARNING_TYPE_LABELS } from './enums';

// The array positions match the persisted Nafadh enum ordinals.
const values = {
  NFD_REM_STAT: [
    { key: 'Pending', label: 'قيد الانتظار' },
    { key: 'Approved', label: 'معتمد' },
    { key: 'NeedsRevision', label: 'يتطلب تعديلًا' },
  ],
  NFD_EVL_PER: [
    { key: 'Weekly', label: 'أسبوعي' },
    { key: 'Monthly', label: 'شهري' },
    { key: 'Midterm', label: 'منتصف المدة' },
    { key: 'Final', label: 'نهائي' },
    { key: 'AdHoc', label: 'حسب الحاجة' },
  ],
  NFD_MOD_STAT: [
    { key: 'NotStarted', label: 'لم يبدأ' },
    { key: 'InProgress', label: 'قيد التنفيذ' },
    { key: 'Completed', label: 'مكتمل' },
  ],
  NFD_EXT_ACT: [
    { key: 'Warn', label: 'تنبيه' },
    { key: 'Terminate', label: 'إنهاء' },
    { key: 'FlagForReview', label: 'إحالة للمراجعة' },
  ],
  NFD_FIL_TYPE: [
    { key: 'Pdf', label: 'PDF' },
    { key: 'Video', label: 'فيديو' },
    { key: 'Image', label: 'صورة' },
    { key: 'Document', label: 'مستند' },
    { key: 'Link', label: 'رابط' },
    { key: 'Other', label: 'أخرى' },
  ],
  NFD_PRG_STAT: [
    { key: 'Draft', label: 'مسودة' },
    { key: 'Published', label: 'منشور' },
    { key: 'Archived', label: 'مؤرشف' },
  ],
  NFD_PYS_STAT: [
    { key: 'Pending', label: 'قيد الانتظار' },
    { key: 'Paid', label: 'مدفوع' },
    { key: 'Overdue', label: 'متأخر عن الموعد' },
  ],
  NFD_TIC_STAT: [
    { key: 'Open', label: 'مفتوح' },
    { key: 'InProgress', label: 'قيد المعالجة' },
    { key: 'Resolved', label: 'تم الحل' },
    { key: 'Closed', label: 'مغلق' },
  ],
  NFD_WDR_STAT: [
    { key: 'Pending', label: 'قيد المراجعة' },
    { key: 'Approved', label: 'مقبول' },
    { key: 'Rejected', label: 'مرفوض' },
  ],
  NFD_RPT_TYPE: [
    { key: 'Attendance', label: 'تقرير الحضور والغياب' },
    { key: 'Performance', label: 'تقرير أداء الدفعات والمهام' },
    { key: 'Financial', label: 'التقرير المالي' },
    { key: 'Enrollment', label: 'تقرير التسجيل' },
    { key: 'Custom', label: 'التقرير الشامل للأداء التدريبي' },
  ],
  NFD_CPE_STAT: [
    { key: 'NotStarted', label: 'لم يبدأ' },
    { key: 'InProgress', label: 'قيد التنفيذ' },
    { key: 'OnHold', label: 'متوقف مؤقتًا' },
    { key: 'Completed', label: 'مكتمل' },
  ],
  NFD_CPI_TYPE: [
    { key: 'Task', label: 'مهمة' },
    { key: 'Project', label: 'مشروع' },
  ],
  NFD_CPP_STAT: [
    { key: 'NotStarted', label: 'لم يبدأ' },
    { key: 'InProgress', label: 'قيد التنفيذ' },
    { key: 'Completed', label: 'مكتمل' },
  ],
  NFD_FBK_TYPE: [
    { key: 'TrainerRating', label: 'تقييم المدرب' },
    { key: 'BatchExperienceRating', label: 'تقييم تجربة الدفعة' },
  ],
  NFD_BDG_COND: [
    { key: 'ModulesCompletedInPeriod', label: 'وحدات مكتملة خلال فترة' },
    { key: 'AttendanceStreak', label: 'سلسلة حضور متواصل' },
    { key: 'HighScoreCount', label: 'عدد درجات مرتفعة' },
    { key: 'ProjectCompletion', label: 'إنجاز المشروع' },
    { key: 'ProgramCompletion', label: 'إكمال البرنامج' },
  ],
  NFD_PJT_ROLE: [
    { key: 'Lead', label: 'قائد' },
    { key: 'Contributor', label: 'مساهم' },
  ],
  NFD_MSG_STAT: [
    { key: 'Sent', label: 'مرسل' },
    { key: 'Delivered', label: 'تم التسليم' },
    { key: 'Read', label: 'مقروء' },
  ],
  NFD_TRK_STAT: [
    { key: 'Active', label: 'نشط' },
    { key: 'Archived', label: 'مؤرشف' },
  ],
  NFD_VER_STAT: [
    { key: 'Pending', label: 'قيد الانتظار' },
    { key: 'Verified', label: 'تم التحقق' },
    { key: 'Rejected', label: 'مرفوض' },
  ],
  NFD_QUE_TYPE: [
    { key: 'MultipleChoice', label: 'اختيار من متعدد' },
    { key: 'TrueFalse', label: 'صح أو خطأ' },
    { key: 'Essay', label: 'سؤال مقالي' },
  ],
  NFD_WRN_LVL: [
    { key: 'Low', label: 'منخفض' },
    { key: 'Medium', label: 'متوسط' },
    { key: 'High', label: 'مرتفع' },
    { key: 'Critical', label: 'حرج' },
  ],
  NFD_WRN_SCOPE: [
    { key: 'Company', label: 'الشركة' },
    { key: 'Trainee', label: 'المتدرب' },
  ],
  NFD_TSK_PRI: [
    { key: 'Low', label: 'منخفضة' },
    { key: 'Medium', label: 'متوسطة' },
    { key: 'High', label: 'عالية' },
    { key: 'Critical', label: 'حرجة' },
  ],
  NFD_PAY_STAT: [
    { key: 'Pending', label: 'قيد الانتظار' },
    { key: 'PartiallyPaid', label: 'مدفوع جزئيًا' },
    { key: 'Paid', label: 'مدفوع' },
    { key: 'Overdue', label: 'متأخر' },
    { key: 'Cancelled', label: 'ملغى' },
  ],
  NFD_ANN_SCOPE: [
    { key: 'Platform', label: 'الجميع' },
    { key: 'Company', label: 'الشركة' },
    { key: 'Batch', label: 'الدفعة' },
    { key: 'Trainee', label: 'المتدرب' },
    { key: 'Trainer', label: 'المدرب' },
    { key: 'Admin', label: 'الإدارة' },
  ],
  NFD_CMP_STAT: [
    { key: 'PendingApproval', label: 'قيد المراجعة والاعتماد' },
    { key: 'Approved', label: 'معتمدة ومفعلة' },
    { key: 'Suspended', label: 'موقوفة مؤقتاً' },
    { key: 'Rejected', label: 'مرفوضة' },
  ],
  NFD_CPA_STAT: [
    { key: 'Draft', label: 'مسودة' },
    { key: 'PendingApproval', label: 'بانتظار الاعتماد' },
    { key: 'Approved', label: 'معتمدة' },
    { key: 'Rejected', label: 'مرفوضة' },
  ],
  NFD_USR_STAT: [
    { key: 'Active', label: 'نشط' },
    { key: 'Inactive', label: 'غير نشط' },
    { key: 'Suspended', label: 'موقوف' },
    { key: 'PendingVerification', label: 'بانتظار التحقق' },
  ],
} as const;

export type AdministrativeGroup = keyof typeof values;

export function isAdministrativeGroup(code: string): code is AdministrativeGroup {
  return Object.prototype.hasOwnProperty.call(values, code);
}

const legacyKeys: Record<string, readonly string[]> = {
  NFD_QUE_DIFF: ['Easy', 'Medium', 'Hard'],
  NFD_EVL_TYPE: Object.keys(EVALUATION_TYPE_LABELS),
  NFD_WRN_TYPE: Object.keys(WARNING_TYPE_LABELS),
};

export function hasFixedEditKey(group: string): boolean {
  return isAdministrativeGroup(group) || Object.prototype.hasOwnProperty.call(legacyKeys, group);
}

export function constantPolicyHint(code: string, readOnly: boolean, labelsOnly: boolean, fixedKeys: boolean) {
  if (!code) return null;
  if (readOnly || (code.startsWith('NFD_') && !hasFixedEditKey(code))) return 'readOnly';
  if (code === 'NFD_TSK_PRI' && !labelsOnly) return 'priorityActivation';
  if (isAdministrativeGroup(code) || labelsOnly) return 'labelsOnly';
  if (hasFixedEditKey(code)) return 'labelsAndActivation';
  return fixedKeys ? 'labelsAndActivation' : null;
}

function explicitValueKeys(row: object) {
  return Object.entries(row).filter(([name]) => name.replace(/_/g, '').toLowerCase() === 'valuekey');
}

/** Read old id-based responses only when the explicit key is absent. */
export function lookupLabel(row: Record<string, unknown>): string {
  for (const name of ['label_ar', 'labelAr', 'LabelAr', 'label_en', 'labelEn', 'LabelEn']) {
    const value = row[name];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

export function lookupValueKey(row: Record<string, unknown>): string {
  const explicit = explicitValueKeys(row);
  if (!explicit.length) return String(row['id'] ?? row['Id'] ?? '').trim();
  const [, first] = explicit[0];
  if (typeof first !== 'string') return '';
  const key = first.trim();
  return explicit.every(([, v]) => typeof v === 'string' && v.trim().toLowerCase() === key.toLowerCase()) ? key : '';
}

/** Only an enum name can identify a row for editing. Prefer the explicit ValueKey. */
export function constantEditKey(group: string, row: object): string | undefined {
  const keys = isAdministrativeGroup(group) ? values[group].map(row => row.key) : legacyKeys[group];
  if (!keys) return undefined;
  const entries = Object.entries(row);
  const explicit = explicitValueKeys(row);
  const candidates = explicit.length ? explicit : entries.filter(([name]) => ['id', 'code'].includes(name.toLowerCase()));
  const matches = new Set<string>();
  for (const [, value] of candidates) {
    const key = typeof value === 'string' && keys.find(key => key.toLowerCase() === value.trim().toLowerCase());
    if (key) matches.add(key);
    else if (explicit.length) return undefined;
  }
  return matches.size === 1 ? [...matches][0] : undefined;
}

export function administrativeValue(group: AdministrativeGroup, value: unknown) {
  const raw = String(value ?? '').trim();
  const rows = values[group];
  if (/^\d+$/.test(raw)) return rows[Number(raw)];
  const key = group === 'NFD_CMP_STAT' && raw.toLowerCase() === 'pending' ? 'pendingapproval' : raw.toLowerCase();
  return rows.find(row => row.key.toLowerCase() === key);
}

export function moduleProgressKey(value: unknown): string {
  const raw = String(value ?? '').trim();
  return raw.toLowerCase() === 'in_progress' ? 'InProgress' :
    administrativeValue('NFD_MOD_STAT', raw)?.key ?? raw;
}
