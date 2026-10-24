/**
 * Arabic-only labels for the Management constants page.
 * The group list itself is still loaded dynamically from Nafadh Training API.
 * These legacy names are fallback display translations for Training databases
 * that have not yet populated SystemConfigGroups.NameAr (some return the code).
 * Do not use these labels as group IDs or change stored ValueKey/Code values.
 */
import { MANAGEMENT_SYSTEM_LOOKUP_TYPES } from './management-system-config-codes';

const TRAINING_GROUP_LABELS_AR: Readonly<Record<string, string>> = {
  "OPP_TYPE": "نوع الفرصة",
  "APPL_METH": "طريقة التقديم",
  "WORK_MODE": "نمط العمل",
  "TGT_GEND": "الجنس المستهدف",
  "INTV_MODE": "نمط المقابلة",
  "CRDT_STAT": "حالة الاعتماد",
  "EXAM_TYPE": "نوع الاختبار",
  "CRDT_PROV": "مزود الدورة",
  "EDUC_LVL": "المستوى التعليمي",
  "QUAL_DEGR": "درجة المؤهل",
  "TRNG_TYPE": "نوع برنامج التدريب",
  "STDY_FILDS": "مجال الدراسة",
  "LANG": "اللغة",
  "TGT_APPL": "المتقدم المستهدف",
  "DOC_TYPE": "نوع ملف المستند",
  "SAL_DISP": "عرض الراتب",
  "CURR": "العملة",
  "PAY_FREQ": "تكرار الدفع",
  "BENEF": "المزايا",
  "ALLOW": "البدلات",
  "EDUC_INST": "المؤسسة التعليمية",
  "NAT": "الجنسية",
  "PRIM_SPEC": "التخصص الرئيسي",
  "CONT_TYPE": "نوع العقد",
  "OFFR_RJCT": "سبب رفض العرض",
  "RJCT_RSN": "سبب رفض المقابلة",
  "RJCT_SUB": "سبب فرعي لرفض المقابلة",
  "NSHW_RSN": "سبب عدم الحضور للمقابلة",
  "RSCH_RSN": "سبب إعادة جدولة المقابلة",
  "WRK_SCOPE": "مجال الفرصة / نطاقات العمل",
  "JOB_CAT": "فئة الوظيفة (قديم)",
  "OFFR_ENTY": "جهة العرض",
  "AOFF_RJCT": "سبب رفض عرض التقييم",
  "AOFF_SUB": "سبب فرعي لرفض عرض التقييم",
  "WD_RSN": "فئة سبب الانسحاب",
  "BEHV": "السلوك",
  "ATA_RJCT": "سبب رفض طلب التقديم",
  "CERT_NAME": "أسماء الشهادات المهنية",
  "TRNG_PROV": "مقدمو التدريب",
};

const MANAGEMENT_GROUP_LABELS_AR: Readonly<Record<string, string>> = Object.fromEntries(
  MANAGEMENT_SYSTEM_LOOKUP_TYPES.map(({ code, labelAr }) => [code, labelAr]),
);

const HAS_ARABIC_CHARACTERS = /[\u0600-\u06FF]/;

/**
 * Prefer a valid Arabic name from Training DB, then known display translations.
 * Unknown future groups require NameAr in the database to appear in Arabic.
 */
export function getArabicConfigGroupLabel(
  code: string,
  nameAr?: string | null,
  nameEn?: string | null,
): string {
  const fromDb = (nameAr ?? '').trim();
  if (HAS_ARABIC_CHARACTERS.test(fromDb)) return fromDb;
  const normalizedCode = code.trim().toUpperCase();
  const knownArabic = TRAINING_GROUP_LABELS_AR[normalizedCode] ?? MANAGEMENT_GROUP_LABELS_AR[normalizedCode];
  return knownArabic || fromDb || (nameEn ?? '').trim() || normalizedCode;
}
