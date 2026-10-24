import {
  HttpEvent,
  HttpHandlerFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

const NAFADH_SNAPSHOT_URL = 'https://localhost:7082/api/NafadhIdentityBridge/snapshot';
const NAFADH_USER_TYPE_ID = 9000;
const NAFADH_GROUP_BASE_ID = 9000;
const NAFADH_ORG_BASE_ID = 90000;

interface NafadhSnapshot {
  roles: Array<{
    roleId: number;
    roleName: string;
    usersCount: number;
    permissionsCount: number;
  }>;
  users: Array<{
    userId: number;
    fullName: string;
    email: string;
    phone: string;
    roleId: number;
    roleName: string;
    status: string;
    companyId: number | null;
    companyName: string;
  }>;
  permissions: Array<{
    permissionId: number;
    permissionKey: string;
    description: string;
  }>;
  rolePermissions: Array<{
    roleId: number;
    permissionId: number;
  }>;
  companies: Array<{
    companyId: number;
    companyName: string;
    commercialRegister: string;
    workField: string;
    status: string;
  }>;
  departments: Array<{
    departmentId: number;
    companyId: number;
    departmentName: string;
    companyName: string;
    membersCount: number;
  }>;
  supervisors: Array<{
    supervisorId: number;
    companyId: number;
    department: string;
    position: string;
    status: string;
    companyName: string;
  }>;
}

type AnyRecord = Record<string, any>;

let cachedSnapshot: NafadhSnapshot | null = null;
let cachedSnapshotAt = 0;
let inflightSnapshot: Promise<NafadhSnapshot | null> | null = null;
let detectedFirstPageIndex: 0 | 1 | null = null;
let lastEnvelopeKey: 'Data' | 'data' | null = 'Data';
let liveSearchInstalled = false;

const biddingGroupNameById = new Map<number, string>();
const biddingTypeNameById = new Map<number, string>();

// ─────────────────────────────────────────────────────────────────────────────
// قواميس التعريب الشاملة للأدوار والمجموعات والأنواع والأسماء والصلاحيات
// ─────────────────────────────────────────────────────────────────────────────

const EXACT_EMAIL_NAME_AR: Record<string, string> = {
  'admin@esnad.om': 'مدير منصة إسناد',
  'superadmin@esnad.om': 'المدير العام - إسناد',
  'operator@esnad.om': 'مشغّل منصة إسناد',
  'admin@nafadh.om': 'مدير منصة نفاذ',
  'authority@nafadh.om': 'الجهة المشرفة - نفاذ',
};

const ROLE_AND_TERM_AR_MAP: Record<string, string> = {
  // أنواع المستخدمين والمنصات
  system: 'النظام',
  systemusers: 'مستخدمو النظام',
  organization: 'الجهات والشركات',
  organizations: 'الجهات والشركات',
  entity: 'جهة',
  entities: 'الجهات',
  individual: 'الأفراد والباحثون عن عمل',
  individuals: 'الأفراد والباحثون عن عمل',
  nafadh: 'منصة نفاذ',
  nafadhplatform: 'منصة نفاذ',
  esnad: 'منصة إسناد',
  esnadplatform: 'منصة إسناد',
  tra: 'هيئة تنظيم الاتصالات',
  government: 'الجهات الحكومية',
  private: 'القطاع الخاص',
  trainingprovider: 'مزود تدريب',
  trainingproviders: 'مزودو التدريب',

  // الأدوار والمجموعات والمناصب
  superadmin: 'المدير العام',
  systemadmin: 'مدير النظام',
  systemadministrator: 'مدير النظام',
  admin: 'مدير النظام',
  administrator: 'مدير النظام',
  portaladmin: 'مدير البوابة',
  subadmin: 'مدير فرعي',
  operator: 'مشغّل النظام',
  systemoperator: 'مشغّل النظام',
  operationsoperator: 'مشغّل العمليات',
  authority: 'الجهة المشرفة',
  regulator: 'الجهة التنظيمية',
  company: 'شركة تدريبية',
  companies: 'الشركات',
  companyadmin: 'مسؤول شركة',
  organizationadmin: 'مسؤول جهة',
  entityadmin: 'مسؤول جهة',
  employer: 'جهة توظيف',
  employers: 'جهات التوظيف',
  employeradmin: 'مسؤول جهة توظيف',
  vendor: 'مورّد',
  vendors: 'الموردون',
  supplier: 'مورّد',
  client: 'عميل',
  supervisor: 'مشرف شركة',
  companysupervisor: 'مشرف شركة',
  trainingsupervisor: 'مشرف تدريب',
  fieldsupervisor: 'مشرف ميداني',
  trainer: 'مدرب',
  trainers: 'المدربون',
  leadtrainer: 'مدرب رئيسي',
  assistanttrainer: 'مدرب مساعد',
  instructor: 'محاضر',
  mentor: 'مرشد تدريبي',
  trainee: 'متدرب',
  trainees: 'المتدربون',
  student: 'طالب',
  intern: 'متدرب ميداني',
  jobseeker: 'باحث عن عمل',
  jobseekers: 'الباحثون عن عمل',
  applicant: 'متقدم',
  candidate: 'مرشح',
  freelancer: 'مستقل (عمل حر)',
  freelancers: 'المستقلون (عمل حر)',
  evaluator: 'مقيّم',
  evaluators: 'المقيّمون',
  assessor: 'مقيّم معتمد',
  interviewer: 'مسؤول مقابلات',
  reviewer: 'مراجع',
  auditor: 'مدقق',
  approver: 'معتمد',
  requester: 'طالب خدمة',
  coordinator: 'منسق تدريب',
  programcoordinator: 'منسق برامج',
  manager: 'مدير',
  generalmanager: 'مدير عام',
  projectmanager: 'مدير مشروع',
  departmentmanager: 'مدير قسم',
  branchmanager: 'مدير فرع',
  director: 'مدير تنفيذي',
  head: 'رئيس قسم',
  teamlead: 'قائد فريق',
  leader: 'قائد فريق',
  specialist: 'أخصائي',
  seniorspecialist: 'أخصائي أول',
  engineer: 'مهندس',
  seniorengineer: 'مهندس أول',
  softwareengineer: 'مهندس برمجيات',
  developer: 'مطور برمجيات',
  seniordev: 'مطور أول',
  seniordeveloper: 'مطور أول',
  analyst: 'محلل نظم',
  dataanalyst: 'محلل بيانات',
  consultant: 'مستشار',
  officer: 'مسؤول',
  executive: 'تنفيذي',
  employee: 'موظف',
  staff: 'موظف',
  member: 'عضو',
  user: 'مستخدم',
  users: 'المستخدمون',
  viewer: 'مستعرض',
  guest: 'زائر',
  support: 'الدعم الفني',
  technicalsupport: 'الدعم الفني',
  helpdesk: 'مكتب المساندة',
  customrole: 'دور مخصص',
  templaterole: 'قالب دور',
  role: 'دور',
  roles: 'الأدوار',
  group: 'مجموعة',
  groups: 'المجموعات',

  // الأقسام والتخصصات
  it: 'تقنية المعلومات',
  informationtechnology: 'تقنية المعلومات',
  ict: 'تقنية المعلومات والاتصالات',
  hr: 'الموارد البشرية',
  humanresources: 'الموارد البشرية',
  finance: 'المالية',
  accounting: 'المحاسبة',
  operations: 'العمليات',
  engineering: 'الهندسة',
  software: 'البرمجيات',
  softwaredevelopment: 'تطوير البرمجيات',
  webdevelopment: 'تطوير الويب',
  mobiledevelopment: 'تطوير التطبيقات',
  cybersecurity: 'الأمن السيبراني',
  infosec: 'أمن المعلومات',
  security: 'الأمن السيبراني',
  network: 'الشبكات',
  networking: 'الشبكات والاتصالات',
  telecom: 'الاتصالات',
  telecommunications: 'الاتصالات',
  ai: 'الذكاء الاصطناعي',
  artificialintelligence: 'الذكاء الاصطناعي',
  datascience: 'علوم البيانات',
  data: 'البيانات',
  cloud: 'الحوسبة السحابية',
  devops: 'تشغيل وتطوير النظم',
  qa: 'ضمان الجودة',
  qualityassurance: 'ضمان الجودة',
  quality: 'الجودة',
  marketing: 'التسويق',
  sales: 'المبيعات',
  legal: 'الشؤون القانونية',
  procurement: 'المشتريات والمناقصات',
  bidding: 'المناقصات',
  tenders: 'العطاءات والمناقصات',
  contracts: 'العقود',
  administration: 'الإدارة العامة',
  management: 'الإدارة',
  training: 'التدريب والتأهيل',
  education: 'التعليم',
  customerservice: 'خدمة المستفيدين',
  pr: 'العلاقات العامة',
  publicrelations: 'العلاقات العامة',
  media: 'الإعلام',
  design: 'التصميم',
  uiux: 'تصميم تجربة المستخدم',
};

const WORD_AR_DICTIONARY: Record<string, string> = {
  // أسماء أشخاص شائعة
  ahmed: 'أحمد',
  ahmad: 'أحمد',
  mohammed: 'محمد',
  mohamed: 'محمد',
  muhammad: 'محمد',
  ali: 'علي',
  salim: 'سالم',
  salem: 'سالم',
  said: 'سعيد',
  saeed: 'سعيد',
  khalid: 'خالد',
  khaled: 'خالد',
  nasser: 'ناصر',
  nasir: 'ناصر',
  sultan: 'سلطان',
  hamad: 'حمد',
  hamed: 'حامد',
  hamood: 'حمود',
  humood: 'حمود',
  abdullah: 'عبدالله',
  abdallah: 'عبدالله',
  abdulrahman: 'عبدالرحمن',
  abdulaziz: 'عبدالعزيز',
  rashid: 'راشد',
  rashed: 'راشد',
  hilal: 'هلال',
  badr: 'بدر',
  badar: 'بدر',
  talal: 'طلال',
  fahad: 'فهد',
  fahd: 'فهد',
  faisal: 'فيصل',
  majid: 'ماجد',
  majed: 'ماجد',
  waleed: 'وليد',
  walid: 'وليد',
  tariq: 'طارق',
  tareq: 'طارق',
  omar: 'عمر',
  umar: 'عمر',
  ammar: 'عمار',
  amer: 'عامر',
  amir: 'أمير',
  yousuf: 'يوسف',
  youssef: 'يوسف',
  yusuf: 'يوسف',
  ibrahim: 'إبراهيم',
  ismail: 'إسماعيل',
  yahya: 'يحيى',
  zakariya: 'زكريا',
  sulaiman: 'سليمان',
  soliman: 'سليمان',
  dawood: 'داود',
  issa: 'عيسى',
  musa: 'موسى',
  moosa: 'موسى',
  hassan: 'حسن',
  hasan: 'حسن',
  hussain: 'حسين',
  hussein: 'حسين',
  mustafa: 'مصطفى',
  murtadha: 'مرتضى',
  haitham: 'هيثم',
  qaboos: 'قابوس',
  theyazin: 'ذي يزن',
  azzan: 'عزان',
  qais: 'قيس',
  loay: 'لؤي',
  luay: 'لؤي',
  mazin: 'مازن',
  mazen: 'مازن',
  mundhir: 'منذر',
  munther: 'منذر',
  muhannad: 'مهند',
  mohannad: 'مهند',
  osama: 'أسامة',
  usama: 'أسامة',
  anas: 'أنس',
  ayman: 'أيمن',
  bilal: 'بلال',
  ziyad: 'زياد',
  ziad: 'زياد',
  zayed: 'زايد',
  saif: 'سيف',
  nawaf: 'نواف',
  naif: 'نايف',
  nayef: 'نايف',
  turki: 'تركي',
  bandar: 'بندر',
  adel: 'عادل',
  adil: 'عادل',
  essam: 'عصام',
  isam: 'عصام',
  imad: 'عماد',
  emad: 'عماد',
  kamil: 'كامل',
  kamal: 'كمال',
  jamal: 'جمال',
  jalal: 'جلال',
  samir: 'سمير',
  sameer: 'سمير',
  rami: 'رامي',
  ramy: 'رامي',
  hani: 'هاني',
  fadi: 'فادي',
  shadi: 'شادي',
  maher: 'ماهر',
  zaher: 'زاهر',
  tahir: 'طاهر',
  taher: 'طاهر',
  jassim: 'جاسم',
  jasim: 'جاسم',
  qasim: 'قاسم',
  kasim: 'قاسم',
  hashim: 'هاشم',
  hashem: 'هاشم',
  masoud: 'مسعود',
  mubarak: 'مبارك',
  mansoor: 'منصور',
  mansour: 'منصور',
  marwan: 'مروان',
  safwan: 'صفوان',
  adnan: 'عدنان',
  ghassan: 'غسان',
  khalifa: 'خليفة',
  khalfan: 'خلفان',
  saud: 'سعود',
  mahmood: 'محمود',
  mahmoud: 'محمود',
  murad: 'مراد',
  fouad: 'فؤاد',
  fuad: 'فؤاد',
  jawad: 'جواد',
  riyadh: 'رياض',
  riad: 'رياض',
  wisam: 'وسام',
  wissam: 'وسام',
  basim: 'باسم',
  bassem: 'باسم',
  hatim: 'حاتم',
  hatem: 'حاتم',
  hazim: 'حازم',
  hazem: 'حازم',
  karim: 'كريم',
  kareem: 'كريم',
  hakim: 'حكيم',
  halim: 'حليم',
  latif: 'لطيف',
  nabil: 'نبيل',
  nabeel: 'نبيل',
  shakir: 'شاكر',
  sabir: 'صابر',
  jabir: 'جابر',
  jaber: 'جابر',
  thamer: 'ثامر',
  sami: 'سامي',
  wail: 'وائل',
  wael: 'وائل',
  raed: 'رائد',
  raid: 'رائد',
  majdi: 'مجدي',
  hamdi: 'حمدي',
  fawzi: 'فوزي',
  ramzi: 'رمزي',
  lotfi: 'لطفي',
  azhar: 'أزهر',
  anwar: 'أنور',
  akram: 'أكرم',
  ashraf: 'أشرف',
  atef: 'عاطف',
  ayoub: 'أيوب',
  younes: 'يونس',
  younis: 'يونس',
  idris: 'إدريس',
  ilyas: 'إلياس',
  harith: 'حارث',
  laith: 'ليث',
  ghaith: 'غيث',
  faris: 'فارس',
  fares: 'فارس',
  malik: 'مالك',
  malek: 'مالك',
  rayan: 'ريان',
  rayyan: 'ريان',
  yazan: 'يزن',
  adam: 'آدم',
  nooh: 'نوح',

  // أسماء إناث شائعة
  fatma: 'فاطمة',
  fatima: 'فاطمة',
  aisha: 'عائشة',
  aysha: 'عائشة',
  maryam: 'مريم',
  mariam: 'مريم',
  khadija: 'خديجة',
  zainab: 'زينب',
  zeinab: 'زينب',
  sarah: 'سارة',
  sara: 'سارة',
  noor: 'نور',
  nour: 'نور',
  noora: 'نورة',
  noura: 'نورة',
  huda: 'هدى',
  muna: 'منى',
  mona: 'منى',
  amal: 'أمل',
  eman: 'إيمان',
  iman: 'إيمان',
  ihsan: 'إحسان',
  ahlam: 'أحلام',
  asma: 'أسماء',
  asmaa: 'أسماء',
  halima: 'حليمة',
  salma: 'سلمى',
  layla: 'ليلى',
  laila: 'ليلى',
  bushra: 'بشرى',
  basma: 'بسمة',
  hana: 'هناء',
  hanaa: 'هناء',
  hiba: 'هبة',
  heba: 'هبة',
  reem: 'ريم',
  rima: 'ريما',
  rana: 'رنا',
  rasha: 'رشا',
  ruba: 'ربى',
  rawan: 'روان',
  razan: 'رزان',
  rahaf: 'رهف',
  raghad: 'رغد',
  شهد: 'شهد',
  shahad: 'شهد',
  shahd: 'شهد',
  shamsa: 'شمسة',
  shaikha: 'شيخة',
  sheikha: 'شيخة',
  moza: 'موزة',
  mouza: 'موزة',
  maitha: 'ميثاء',
  mahra: 'مهرة',
  latifa: 'لطيفة',
  sharifa: 'شريفة',
  badriya: 'بدرية',
  fakhriya: 'فخرية',
  zakiyya: 'زكية',
  zakiya: 'زكية',
  safiya: 'صفية',
  sumaya: 'سمية',
  sumayya: 'سمية',
  ruqaya: 'رقية',
  thuraya: 'ثريا',
  suad: 'سعاد',
  souad: 'سعاد',
  siham: 'سهام',
  ibtisam: 'ابتسام',
  intisar: 'انتصار',
  itimad: 'اعتماد',
  widad: 'وداد',
  wedad: 'وداد',
  wijdan: 'وجدان',
  wafaa: 'وفاء',
  wafa: 'وفاء',
  sana: 'سناء',
  sanaa: 'سناء',
  samira: 'سميرة',
  amira: 'أميرة',
  ameera: 'أميرة',
  munira: 'منيرة',
  jamila: 'جميلة',
  karima: 'كريمة',
  nabila: 'نبيلة',
  dalal: 'دلال',
  dina: 'دينا',
  dana: 'دانة',
  lubna: 'لبنى',
  lamya: 'لمياء',
  lamia: 'لمياء',
  alia: 'علياء',
  alya: 'علياء',
  aziza: 'عزيزة',
  faiza: 'فائزة',
  naima: 'نعيمة',
  rahma: 'رحمة',
  afنان: 'أفنان',
  afnan: 'أفنان',
  abrars: 'أبرار',
  abrar: 'أبرار',
  anfal: 'أنفال',
  alaa: 'آلاء',
  israa: 'إسراء',
  esraa: 'إسراء',
  doaa: 'دعاء',
  duaa: 'دعاء',
  marwa: 'مروة',
  safa: 'صفاء',
  safaa: 'صفاء',
  nada: 'ندى',
  nadia: 'نادية',
  najla: 'نجلاء',
  najwa: 'نجوى',
  nashwa: 'نشوى',
  nisreen: 'نسرين',
  yasmin: 'ياسمين',
  yasmine: 'ياسمين',
  abeer: 'عبير',
  abir: 'عبير',
  arij: 'أريج',
  areej: 'أريج',
  taghreed: 'تغريد',
  tasneem: 'تسنيم',
  sundus: 'سندس',
  kawthar: 'كوثر',
  buthaina: 'بثينة',
  jawaher: 'جواهر',
  balqees: 'بلقيس',
  ghada: 'غادة',
  ghaliya: 'غالية',
  mizna: 'مزنة',
  maisa: 'ميساء',
  may: 'مي',
  mai: 'مي',
  hala: 'هلا',
  leen: 'لين',
  lina: 'لينا',
  joud: 'جود',
  jana: 'جنى',
  malak: 'ملاك',
  farah: 'فرح',
  maram: 'مرام',
  manal: 'منال',
  nawal: 'نوال',
  hayat: 'حياة',
  najat: 'نجاة',
  sawsan: 'سوسن',
  shaima: 'شيماء',
  shayma: 'شيماء',
  hanan: 'حنان',
  inass: 'إيناس',
  inas: 'إيناس',
  ilham: 'إلهام',
  elham: 'إلهام',
  khawla: 'خولة',
  asalah: 'أصالة',
  azhar2: 'أزهار',
  zuhoor: 'زهور',
  warda: 'وردة',
  zahra: 'زهراء',
  zahraa: 'زهراء',
  batool: 'بتول',
  hawraa: 'حوراء',
  taif: 'طيف',
  shurooq: 'شروق',
  ashwaq: 'أشواق',

  // قبائل وألقاب ومناطق وشركات عُمانية شائعة
  amri: 'العمري',
  alamri: 'العمري',
  balushi: 'البلوشي',
  albalushi: 'البلوشي',
  harthy: 'الحارثي',
  harthi: 'الحارثي',
  alharthy: 'الحارثي',
  alharthi: 'الحارثي',
  habsi: 'الحبسي',
  alhabsi: 'الحبسي',
  hinai: 'الهنائي',
  alhinai: 'الهنائي',
  kindy: 'الكندي',
  kindi: 'الكندي',
  alkindi: 'الكندي',
  busaidi: 'البوسعيدي',
  albusaidi: 'البوسعيدي',
  riyami: 'الريامي',
  alriyami: 'الريامي',
  mahrooqi: 'المحروقي',
  almahrooqi: 'المحروقي',
  maskari: 'المسكري',
  almaskari: 'المسكري',
  rashdi: 'الراشدي',
  alrashdi: 'الراشدي',
  saadi: 'السعدي',
  alsaadi: 'السعدي',
  mamari: 'المعمري',
  almamari: 'المعمري',
  jabri: 'الجابري',
  aljabri: 'الجابري',
  shukaili: 'الشكيلي',
  alshukaili: 'الشكيلي',
  rawahi: 'الرواحي',
  alrawahi: 'الرواحي',
  hosni: 'الحوسني',
  alhosni: 'الحوسني',
  farsi: 'الفارسي',
  alfarsi: 'الفارسي',
  lawati: 'اللواتي',
  allawati: 'اللواتي',
  shanfari: 'الشنفري',
  alshanfari: 'الشنفري',
  kathiri: 'الكثيري',
  alkathiri: 'الكثيري',
  ghafri: 'الغافري',
  alghafri: 'الغافري',
  badi: 'البادي',
  albadi: 'البادي',
  kalbani: 'الكلباني',
  alkalbani: 'الكلباني',
  zadjali: 'الزدجالي',
  alzadjali: 'الزدجالي',
  siyabi: 'السيابي',
  alsiyabi: 'السيابي',
  hashmi: 'الهاشمي',
  alhashmi: 'الهاشمي',
  salmi: 'السالمي',
  alsalmi: 'السالمي',
  mundhiri: 'المنذري',
  azri: 'العزري',
  alazri: 'العزري',
  kharusi: 'الخروصي',
  alkharusi: 'الخروصي',
  barwani: 'البرواني',
  albarwani: 'البرواني',
  hajri: 'الهاجري',
  alhajri: 'الهاجري',
  subhi: 'الصبحي',
  alsubhi: 'الصبحي',
  sinani: 'السناني',
  alsinani: 'السناني',
  mukhaini: 'المخيني',
  almukhaini: 'المخيني',
  araimi: 'العريمي',
  alaraimi: 'العريمي',
  wahaibi: 'الوهيبي',
  alwahaibi: 'الوهيبي',
  naamani: 'النعماني',
  alnaamani: 'النعماني',
  hadhrami: 'الحضرمي',
  alhadhrami: 'الحضرمي',
  qasmi: 'القاسمي',
  alqasmi: 'القاسمي',
  shehhi: 'الشحي',
  alshehhi: 'الشحي',
  shibli: 'الشبلي',
  alshibli: 'الشبلي',
  muqbali: 'المقبالي',
  almuqbali: 'المقبالي',

  // شركات ومؤسسات ومصطلحات أعمال
  oman: 'عُمان',
  omani: 'العُمانية',
  muscat: 'مسقط',
  salalah: 'صلالة',
  sohar: 'صحار',
  nizwa: 'نزوى',
  sur: 'صور',
  duqm: 'الدقم',
  omantel: 'عمانتل',
  ooredoo: 'أوريدو',
  pdo: 'تنمية نفط عُمان',
  oq: 'مجموعة أوكيو',
  asyad: 'مجموعة أسياد',
  nama: 'مجموعة نماء',
  bank: 'بنك',
  national: 'الوطني',
  modern: 'الحديثة',
  global: 'العالمية',
  international: 'الدولية',
  advanced: 'المتقدمة',
  smart: 'الذكية',
  digital: 'الرقمية',
  tech: 'للتقنية',
  technology: 'للتكنولوجيا',
  technologies: 'للتقنيات',
  solutions: 'للحلول',
  services: 'للخدمات',
  systems: 'للأنظمة',
  holding: 'القابضة',
  enterprise: 'المؤسسة',
  enterprises: 'للمشاريع',
  trading: 'للتجارة',
  contracting: 'للمقاولات',
  investment: 'للاستثمار',
  investments: 'للاستثمارات',
  logistics: 'للخدمات اللوجستية',
  energy: 'للطاقة',
  oil: 'للنفط',
  gas: 'والغاز',
  aviation: 'للطيران',
  port: 'ميناء',
  airport: 'مطار',
  academy: 'أكاديمية',
  institute: 'معهد',
  center: 'مركز',
  centre: 'مركز',
  college: 'كلية',
  university: 'جامعة',
  school: 'مدرسة',
  ministry: 'وزارة',
  council: 'مجلس',
  foundation: 'مؤسسة',
  association: 'جمعية',
  llc: 'ش.م.م',
  spc: 'ش.ش.و',
  saoc: 'ش.م.ع.م',
  saog: 'ش.م.ع.ع',
  co: 'شركة',
  corp: 'مؤسسة',
  inc: 'المحدودة',
  ltd: 'المحدودة',
  senior: 'أول',
  junior: 'مبتدئ',
  chief: 'رئيس',
  deputy: 'نائب',
  assistant: 'مساعد',
  first: 'الأول',
  second: 'الثاني',
  main: 'الرئيسي',
  primary: 'أساسي',
  test: 'تجريبي',
  demo: 'تجريبي',
  account: 'حساب',
  default: 'افتراضي',
  new: 'جديد',
  general: 'عام',
};

const PERMISSION_VERB_AR: Record<string, string> = {
  view: 'عرض',
  read: 'عرض',
  list: 'استعراض قائمة',
  get: 'عرض',
  browse: 'تصفح',
  search: 'البحث في',
  create: 'إضافة',
  add: 'إضافة',
  insert: 'إدراج',
  register: 'تسجيل',
  edit: 'تعديل',
  update: 'تحديث',
  modify: 'تعديل',
  delete: 'حذف',
  remove: 'إزالة',
  manage: 'إدارة',
  admin: 'إدارة',
  approve: 'اعتماد',
  reject: 'رفض',
  review: 'مراجعة',
  evaluate: 'تقييم',
  grade: 'رصد درجات',
  assign: 'إسناد',
  export: 'تصدير',
  import: 'استيراد',
  download: 'تنزيل',
  upload: 'رفع',
  send: 'إرسال',
  publish: 'نشر',
  archive: 'أرشفة',
  activate: 'تفعيل',
  deactivate: 'إيقاف',
  lock: 'قفل',
  unlock: 'فك قفل',
  schedule: 'جدولة',
  submit: 'تقديم',
  verify: 'توثيق',
  issue: 'إصدار',
  print: 'طباعة',
};

const PERMISSION_ENTITY_AR: Record<string, string> = {
  user: 'المستخدمين',
  users: 'المستخدمين',
  role: 'الأدوار',
  roles: 'الأدوار',
  permission: 'الصلاحيات',
  permissions: 'الصلاحيات',
  group: 'المجموعات',
  groups: 'المجموعات',
  usergroup: 'مجموعات المستخدمين',
  usergroups: 'مجموعات المستخدمين',
  page: 'الصفحات',
  pages: 'الصفحات',
  identity: 'الهوية والصلاحيات',
  dashboard: 'لوحة التحكم',
  analytics: 'التحليلات',
  report: 'التقارير',
  reports: 'التقارير',
  company: 'الشركات المستضيفة',
  companies: 'الشركات المستضيفة',
  organization: 'الجهات',
  organizations: 'الجهات',
  branch: 'الفروع',
  branches: 'الفروع',
  department: 'الأقسام',
  departments: 'الأقسام',
  supervisor: 'مشرفي الشركات',
  supervisors: 'مشرفي الشركات',
  trainer: 'المدربين',
  trainers: 'المدربين',
  trainee: 'المتدربين',
  trainees: 'المتدربين',
  track: 'المسارات التدريبية',
  tracks: 'المسارات التدريبية',
  program: 'البرامج التدريبية',
  programs: 'البرامج التدريبية',
  batch: 'الدفعات',
  batches: 'الدفعات',
  enrollment: 'التسجيل والالتحاق',
  enrollments: 'التسجيل والالتحاق',
  module: 'الوحدات التدريبية',
  modules: 'الوحدات التدريبية',
  lesson: 'الدروس',
  lessons: 'الدروس',
  material: 'المواد التدريبية',
  materials: 'المواد التدريبية',
  courseplan: 'الخطط التدريبية',
  courseplans: 'الخطط التدريبية',
  session: 'الجلسات التدريبية',
  sessions: 'الجلسات التدريبية',
  attendance: 'الحضور والانصراف',
  attendances: 'الحضور والانصراف',
  excuse: 'الأعذار',
  excuses: 'الأعذار',
  task: 'المهام',
  tasks: 'المهام',
  submission: 'التسليمات',
  submissions: 'التسليمات',
  project: 'المشاريع',
  projects: 'المشاريع',
  quiz: 'الاختبارات القصيرة',
  quizzes: 'الاختبارات القصيرة',
  question: 'بنك الأسئلة',
  questions: 'بنك الأسئلة',
  questionbank: 'بنك الأسئلة',
  evaluation: 'التقييمات',
  evaluations: 'التقييمات',
  certificate: 'الشهادات',
  certificates: 'الشهادات',
  warning: 'الإنذارات',
  warnings: 'الإنذارات',
  remediation: 'طلبات المعالجة',
  ticket: 'تذاكر الدعم الفني',
  tickets: 'تذاكر الدعم الفني',
  support: 'الدعم الفني',
  notification: 'الإشعارات',
  notifications: 'الإشعارات',
  announcement: 'الإعلانات',
  announcements: 'الإعلانات',
  message: 'المراسلات',
  messages: 'المراسلات',
  conversation: 'المحادثات',
  conversations: 'المحادثات',
  payment: 'المدفوعات',
  payments: 'المدفوعات',
  setting: 'إعدادات النظام',
  settings: 'إعدادات النظام',
  audit: 'سجل العمليات',
  auditlog: 'سجل العمليات',
  auditlogs: 'سجلات التدقيق',
  badge: 'الشارات',
  badges: 'الشارات',
  feedback: 'التغذية الراجعة',
  profile: 'الملف الشخصي',
  profiles: 'الملفات الشخصية',
  jobseeker: 'الباحثين عن عمل',
  jobseekers: 'الباحثين عن عمل',
  opportunity: 'الفرص الوظيفية',
  opportunities: 'الفرص الوظيفية',
  job: 'الوظائف',
  jobs: 'الوظائف',
  interview: 'المقابلات',
  interviews: 'المقابلات',
  contract: 'العقود',
  contracts: 'العقود',
  offer: 'عروض العمل',
  offers: 'عروض العمل',
  credential: 'المؤهلات والاعتمادات',
  credentials: 'المؤهلات والاعتمادات',
  exam: 'الامتحانات',
  exams: 'الامتحانات',
  bid: 'العطاءات',
  bids: 'العطاءات',
  request: 'الطلبات والمناقصات',
  requests: 'الطلبات والمناقصات',
  tender: 'المناقصات',
  tenders: 'المناقصات',
  catalog: 'الدليل المرجعي',
  skill: 'المهارات',
  skills: 'المهارات',
  showcase: 'معرض الأعمال',
  withdrawal: 'طلبات الانسحاب',
};

// ─────────────────────────────────────────────────────────────────────────────
// دوال المساعدة للتعريب وتوحيد النصوص والبحث العربي الذكي
// ─────────────────────────────────────────────────────────────────────────────

function hasArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

function hasLatin(text: string): boolean {
  return /[A-Za-z]/.test(text);
}

/** تطبيع النص العربي والإنجليزي لأغراض البحث الذكي (توحيد الهمزات والتاء المربوطة والأرقام والتشكيل) */
export function normalizeArabicSearch(input: string | null | undefined): string {
  if (!input) return '';
  let s = String(input);

  // تحويل الأرقام العربية/الفارسية إلى أرقام قياسية
  s = s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  s = s.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

  // إزالة التشكيل والمد (التطويل)
  s = s.replace(/[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g, '');

  // توحيد الهمزات والألف المقصورة والتاء المربوطة
  s = s
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه');

  // معالجة عبارة "غير نشط" كوحدة دلالية مميزة عن "نشط"
  s = s.replace(/غير\s+نشط/g, 'معطل');

  return s
    .toLowerCase()
    .replace(/[^\u0600-\u06FFa-z0-9@._+-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** مطابقة ذكية متعددة الكلمات تدعم العربية والإنجليزية معاً */
function matchesArabicQuery(haystackParts: Array<unknown>, rawQuery: string): boolean {
  const normalizedQuery = normalizeArabicSearch(rawQuery);
  if (!normalizedQuery) return true;

  const tokens = normalizedQuery.split(' ').filter(Boolean);
  if (!tokens.length) return true;

  const hay = normalizeArabicSearch(
    haystackParts
      .filter((p) => p !== null && p !== undefined && p !== '')
      .map((p) => String(p))
      .join(' '),
  );

  return tokens.every((token) => hay.includes(token));
}

/** تعريب صوتي تلقائي لأي كلمة لاتينية غير موجودة في القاموس لضمان عدم بقاء حروف إنجليزية */
function transliterateLatinWordToArabic(word: string): string {
  const clean = word.trim();
  if (!clean) return '';
  if (/^\d+$/.test(clean)) return clean;

  let lower = clean.toLowerCase();
  if (WORD_AR_DICTIONARY[lower]) return WORD_AR_DICTIONARY[lower];
  if (ROLE_AND_TERM_AR_MAP[lower]) return ROLE_AND_TERM_AR_MAP[lower];

  // معالجة الـ التعريف في بداية الأسماء مثل Al-Harthy / Albalushi
  let prefix = '';
  if (lower.startsWith('al-') && lower.length > 4) {
    prefix = 'ال';
    lower = lower.slice(3);
    if (WORD_AR_DICTIONARY[lower]) return WORD_AR_DICTIONARY[lower];
  } else if (lower.startsWith('al') && lower.length >= 6 && WORD_AR_DICTIONARY[lower.slice(2)]) {
    return WORD_AR_DICTIONARY[lower.slice(2)];
  }

  const digraphs: Array<[RegExp, string]> = [
    [/sh/g, 'ش'],
    [/kh/g, 'خ'],
    [/gh/g, 'غ'],
    [/th/g, 'ث'],
    [/dh/g, 'ذ'],
    [/ch/g, 'تش'],
    [/ph/g, 'ف'],
    [/tion/g, 'شن'],
    [/oo|ou/g, 'و'],
    [/ee|ea/g, 'ي'],
    [/aa/g, 'ا'],
    [/ai|ay/g, 'اي'],
    [/aw|au/g, 'او'],
  ];

  let out = lower;
  for (const [rgx, rep] of digraphs) {
    out = out.replace(rgx, rep);
  }

  const charMap: Record<string, string> = {
    a: 'ا',
    b: 'ب',
    c: 'ك',
    d: 'د',
    e: 'ي',
    f: 'ف',
    g: 'ج',
    h: 'ه',
    i: 'ي',
    j: 'ج',
    k: 'ك',
    l: 'ل',
    m: 'م',
    n: 'ن',
    o: 'و',
    p: 'ب',
    q: 'ق',
    r: 'ر',
    s: 'س',
    t: 'ت',
    u: 'و',
    v: 'ف',
    w: 'و',
    x: 'كس',
    y: 'ي',
    z: 'ز',
  };

  let arabicChars = '';
  for (let i = 0; i < out.length; i++) {
    const ch = out[i];
    if (i === 0 && (ch === 'e' || ch === 'i')) {
      arabicChars += 'إ';
    } else if (i === 0 && (ch === 'a' || ch === 'o' || ch === 'u')) {
      arabicChars += 'أ';
    } else {
      arabicChars += charMap[ch] ?? ch;
    }
  }

  // تقليل تكرار الحروف المتتالية الناتج عن الحروف المضعفة الإنجليزية
  arabicChars = arabicChars.replace(/(.)\1+/g, '$1');
  return prefix + arabicChars;
}

/** تقسيم الكلمات المدمجة بصيغة CamelCase أو snake_case */
function splitIdentifierWords(raw: string): string[] {
  return raw
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/[_\-./]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** تعريب أي مصطلح (دور / مجموعة / نوع / قسم / منصب) */
function translateTermToArabic(raw: string | null | undefined, fallback = 'عام'): string {
  const clean = (raw ?? '').trim();
  if (!clean) return fallback;

  // إن كان النص عربياً خالصاً بدون حروف لاتينية نرجعه مباشرة
  if (hasArabic(clean) && !hasLatin(clean)) {
    return clean;
  }

  // استبدال اللاحقات الشائعة أولاً
  const normalizedWhole = clean
    .replace(/\(Nafadh\)/gi, '(نفاذ)')
    .replace(/\(Esnad\)/gi, '(إسناد)')
    .replace(/\(System\)/gi, '(النظام)');

  if (hasArabic(normalizedWhole) && !hasLatin(normalizedWhole)) {
    return normalizedWhole;
  }

  const compactKey = clean.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (ROLE_AND_TERM_AR_MAP[compactKey]) {
    return ROLE_AND_TERM_AR_MAP[compactKey];
  }
  if (WORD_AR_DICTIONARY[compactKey]) {
    return WORD_AR_DICTIONARY[compactKey];
  }

  // معالجة النصوص المركبة أو المختلطة (مثل "قسم IT - Omantel (Nafadh)")
  return normalizedWhole.replace(/[A-Za-z][A-Za-z0-9_-]*/g, (segment) => {
    const segKey = segment.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (segKey === 'nfd') return 'نفاذ';
    if (ROLE_AND_TERM_AR_MAP[segKey]) return ROLE_AND_TERM_AR_MAP[segKey];
    if (WORD_AR_DICTIONARY[segKey]) return WORD_AR_DICTIONARY[segKey];
    if (PERMISSION_ENTITY_AR[segKey]) return PERMISSION_ENTITY_AR[segKey];
    if (PERMISSION_VERB_AR[segKey]) return PERMISSION_VERB_AR[segKey];

    const parts = splitIdentifierWords(segment);
    if (parts.length > 1) {
      return parts
        .map((p) => {
          const pk = p.toLowerCase();
          return (
            ROLE_AND_TERM_AR_MAP[pk] ??
            WORD_AR_DICTIONARY[pk] ??
            PERMISSION_ENTITY_AR[pk] ??
            PERMISSION_VERB_AR[pk] ??
            transliterateLatinWordToArabic(p)
          );
        })
        .join(' ');
    }

    return transliterateLatinWordToArabic(segment);
  });
}

/** تعريب اسم مستخدم أو جهة حتى لو كان بريداً إلكترونياً أو باللغة الإنجليزية */
function arabizePersonOrOrgName(
  arCandidate: string | null | undefined,
  enCandidate: string | null | undefined,
  emailCandidate?: string | null,
  fallback = 'مستخدم النظام',
): string {
  const ar = (arCandidate ?? '').trim();
  if (ar && hasArabic(ar)) {
    return translateTermToArabic(ar, fallback);
  }

  const emailLower = (emailCandidate ?? '').trim().toLowerCase();
  if (emailLower && EXACT_EMAIL_NAME_AR[emailLower]) {
    return EXACT_EMAIL_NAME_AR[emailLower];
  }

  const raw = (ar || (enCandidate ?? '').trim() || emailLower).trim();
  if (!raw) return fallback;

  if (EXACT_EMAIL_NAME_AR[raw.toLowerCase()]) {
    return EXACT_EMAIL_NAME_AR[raw.toLowerCase()];
  }

  // إذا كان الاسم عبارة عن بريد إلكتروني، نأخذ الجزء قبل @ ونعرّبه
  if (raw.includes('@')) {
    const localPart = raw.split('@')[0] ?? '';
    const domainPart = (raw.split('@')[1] ?? '').split('.')[0]?.toLowerCase() ?? '';
    const words = splitIdentifierWords(localPart);
    const translatedLocal = words.length
      ? words.map((w) => translateTermToArabic(w, '')).filter(Boolean).join(' ')
      : 'مستخدم';
    if (domainPart === 'nafadh') return `${translatedLocal} (نفاذ)`;
    if (domainPart === 'esnad') return `${translatedLocal} (إسناد)`;
    return translatedLocal || fallback;
  }

  return translateTermToArabic(raw, fallback);
}

/** تعريب مفاتيح الصلاحيات وصفحات النظام */
function arabizePermissionOrPage(
  nameAr: string | null | undefined,
  nameEnOrKey: string | null | undefined,
  code?: string | null,
): string {
  const ar = (nameAr ?? '').trim();
  if (ar && hasArabic(ar)) {
    return translateTermToArabic(ar, 'صلاحية النظام');
  }

  const raw = (ar || (nameEnOrKey ?? '').trim() || (code ?? '').trim()).trim();
  if (!raw) return 'صفحة النظام';

  // نمط الصلاحيات مثل users.view أو Manage_Users أو trainees:evaluate
  const parts = splitIdentifierWords(raw).map((p) => p.toLowerCase());
  if (parts.length >= 2) {
    const firstVerb = PERMISSION_VERB_AR[parts[0]];
    const lastVerb = PERMISSION_VERB_AR[parts[parts.length - 1]];

    if (lastVerb && parts.length >= 2) {
      const entityParts = parts.slice(0, -1);
      const entityKey = entityParts.join('');
      const entityAr =
        PERMISSION_ENTITY_AR[entityKey] ??
        entityParts
          .map((e) => PERMISSION_ENTITY_AR[e] ?? translateTermToArabic(e, e))
          .join(' ');
      return `${lastVerb} ${entityAr}`.trim();
    }

    if (firstVerb) {
      const entityParts = parts.slice(1);
      const entityKey = entityParts.join('');
      const entityAr =
        PERMISSION_ENTITY_AR[entityKey] ??
        entityParts
          .map((e) => PERMISSION_ENTITY_AR[e] ?? translateTermToArabic(e, e))
          .join(' ');
      return `${firstVerb} ${entityAr}`.trim();
    }
  }

  return translateTermToArabic(raw, 'صفحة النظام');
}

/** تعريب رمز المجموعة (Code) ليظهر بالعربية في جدول المجموعات */
function arabizeGroupCode(rawCode: string | null | undefined, arabicGroupName: string): string {
  const cleanName = arabicGroupName
    .replace(/[()]/g, '')
    .trim()
    .replace(/\s+/g, '_');

  const raw = (rawCode ?? '').trim();
  if (!raw) return cleanName || 'مجموعة_عامة';
  if (hasArabic(raw) && !hasLatin(raw)) return raw;

  if (/^NFD_/i.test(raw)) {
    const rest = raw.replace(/^NFD_/i, '');
    const restAr = translateTermToArabic(rest, cleanName).replace(/\s+/g, '_');
    return restAr.includes('نفاذ') ? restAr : `نفاذ_${restAr}`;
  }

  const translated = translateTermToArabic(raw, cleanName)
    .replace(/[()]/g, '')
    .trim()
    .replace(/\s+/g, '_');
  return translated || cleanName || 'مجموعة_نظام';
}

// ─────────────────────────────────────────────────────────────────────────────
// دوال قراءة وتعديل الحقول بأمان تام مع PascalCase و camelCase (متوافقة مع ts4111)
// ─────────────────────────────────────────────────────────────────────────────

function getVal(obj: AnyRecord | null | undefined, pascal: string, camel: string): any {
  if (!obj || typeof obj !== 'object') return undefined;
  return pascal in obj ? obj[pascal] : obj[camel];
}

function getStr(obj: AnyRecord | null | undefined, pascal: string, camel: string): string {
  const v = getVal(obj, pascal, camel);
  return typeof v === 'string' ? v : v != null ? String(v) : '';
}

function getNum(obj: AnyRecord | null | undefined, pascal: string, camel: string): number | null {
  const v = getVal(obj, pascal, camel);
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
  return null;
}

function getBool(obj: AnyRecord | null | undefined, pascal: string, camel: string, fallback = true): boolean {
  const v = getVal(obj, pascal, camel);
  if (typeof v === 'boolean') return v;
  return fallback;
}

function setSmart(target: AnyRecord, pascal: string, camel: string, value: any, preferCamel: boolean): void {
  if (pascal in target) {
    target[pascal] = value;
  } else if (camel in target) {
    target[camel] = value;
  } else {
    target[preferCamel ? camel : pascal] = value;
  }
}

function isCamelObject(sample?: AnyRecord | null): boolean {
  if (!sample || typeof sample !== 'object') return false;
  return (
    ('id' in sample && !('Id' in sample)) ||
    ('nameEn' in sample && !('NameEn' in sample)) ||
    ('displayNameEn' in sample && !('DisplayNameEn' in sample))
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// تعريب صفوف وكائنات BiddingDB_Training القادمة من المنفذ 58888
// ─────────────────────────────────────────────────────────────────────────────

function arabizeBiddingGroupItem(rawGroup: AnyRecord, parentTypeAr?: string): AnyRecord {
  const copy: AnyRecord = { ...rawGroup };
  const camel = isCamelObject(copy);
  const groupId = getNum(copy, 'Id', 'id');
  const rawAr = getStr(copy, 'NameAr', 'nameAr');
  const rawEn = getStr(copy, 'NameEn', 'nameEn');
  const rawCode = getStr(copy, 'Code', 'code');

  const nameAr = translateTermToArabic(rawAr || rawEn || rawCode, parentTypeAr || 'مجموعة مستخدمين');
  const codeAr = arabizeGroupCode(rawCode, nameAr);

  if (groupId !== null) {
    biddingGroupNameById.set(groupId, nameAr);
  }

  setSmart(copy, 'NameAr', 'nameAr', nameAr, camel);
  setSmart(copy, 'NameEn', 'nameEn', nameAr, camel);
  setSmart(copy, 'Code', 'code', codeAr, camel);
  return copy;
}

function arabizeBiddingUserTypeItem(rawType: AnyRecord): AnyRecord {
  const copy: AnyRecord = { ...rawType };
  const camel = isCamelObject(copy);
  const typeId = getNum(copy, 'Id', 'id');
  const rawAr = getStr(copy, 'NameAr', 'nameAr');
  const rawEn = getStr(copy, 'NameEn', 'nameEn');
  const rawCode = getStr(copy, 'Code', 'code');

  // ملاحظة مهمة: نُبقي UserType.Code كما هو ('System' إلخ) لأن نافذة إضافة مستخدم تعتمد عليه برمجياً
  const typeNameAr = translateTermToArabic(rawAr || rawEn || rawCode, 'فئة مستخدمين');
  if (typeId !== null) {
    biddingTypeNameById.set(typeId, typeNameAr);
  }

  setSmart(copy, 'NameAr', 'nameAr', typeNameAr, camel);
  setSmart(copy, 'NameEn', 'nameEn', typeNameAr, camel);

  const rawGroups = getVal(copy, 'Groups', 'groups');
  if (Array.isArray(rawGroups)) {
    const arabizedGroups = rawGroups.map((g: AnyRecord) =>
      g && typeof g === 'object' ? arabizeBiddingGroupItem(g, typeNameAr) : g,
    );
    setSmart(copy, 'Groups', 'groups', arabizedGroups, camel);
  }

  return copy;
}

function arabizeBiddingUserRow(rawRow: AnyRecord): { row: AnyRecord; searchParts: unknown[] } {
  const copy: AnyRecord = { ...rawRow };
  const camel = isCamelObject(copy);

  const origNameAr = getStr(copy, 'NameAr', 'nameAr');
  const origNameEn = getStr(copy, 'NameEn', 'nameEn');
  const userName = getStr(copy, 'UserName', 'userName');
  const email = getStr(copy, 'Email', 'email');
  const phone = getStr(copy, 'PhoneNumber', 'phoneNumber');

  const userTypeId = getNum(copy, 'UserTypeId', 'userTypeId');
  const userGroupId = getNum(copy, 'UserGroupId', 'userGroupId');

  const origTypeAr = getStr(copy, 'UserTypeNameAr', 'userTypeNameAr');
  const origTypeEn = getStr(copy, 'UserTypeNameEn', 'userTypeNameEn');
  const origTypeCode = getStr(copy, 'UserTypeCode', 'userTypeCode');

  const origGroupAr = getStr(copy, 'UserGroupNameAr', 'userGroupNameAr');
  const origGroupEn = getStr(copy, 'UserGroupNameEn', 'userGroupNameEn');
  const origGroupCode = getStr(copy, 'UserGroupCode', 'userGroupCode');

  const origOrgAr = getStr(copy, 'OrganizationNameAr', 'organizationNameAr');
  const origOrgEn = getStr(copy, 'OrganizationNameEn', 'organizationNameEn');

  const personAr = arabizePersonOrOrgName(
    origNameAr,
    origNameEn || userName,
    email,
    'مستخدم النظام',
  );

  const typeAr =
    (userTypeId !== null ? biddingTypeNameById.get(userTypeId) : undefined) ||
    translateTermToArabic(origTypeAr || origTypeEn || origTypeCode, 'النظام');

  const groupAr =
    (userGroupId !== null ? biddingGroupNameById.get(userGroupId) : undefined) ||
    translateTermToArabic(origGroupAr || origGroupEn || origGroupCode, typeAr);

  const hasOrg = Boolean(origOrgAr || origOrgEn || getNum(copy, 'OrganizationId', 'organizationId'));
  const orgAr = hasOrg
    ? arabizePersonOrOrgName(origOrgAr, origOrgEn, null, 'جهة مسجلة')
    : '';

  const rawRolesAr = getVal(copy, 'RoleNamesAr', 'roleNamesAr');
  const rawRolesEn = getVal(copy, 'RoleNamesEn', 'roleNamesEn');
  const sourceRoles: string[] = Array.isArray(rawRolesAr) && rawRolesAr.length
    ? rawRolesAr
    : Array.isArray(rawRolesEn)
      ? rawRolesEn
      : [];
  const rolesAr = sourceRoles.length
    ? sourceRoles.map((r) => translateTermToArabic(String(r), groupAr))
    : [groupAr];

  const isActive = getBool(copy, 'IsActive', 'isActive', true);

  setSmart(copy, 'NameAr', 'nameAr', personAr, camel);
  setSmart(copy, 'NameEn', 'nameEn', personAr, camel);
  setSmart(copy, 'UserTypeNameAr', 'userTypeNameAr', typeAr, camel);
  setSmart(copy, 'UserTypeNameEn', 'userTypeNameEn', typeAr, camel);
  setSmart(copy, 'UserGroupNameAr', 'userGroupNameAr', groupAr, camel);
  setSmart(copy, 'UserGroupNameEn', 'userGroupNameEn', groupAr, camel);
  if (hasOrg) {
    setSmart(copy, 'OrganizationNameAr', 'organizationNameAr', orgAr, camel);
    setSmart(copy, 'OrganizationNameEn', 'organizationNameEn', orgAr, camel);
  }
  setSmart(copy, 'RoleNamesAr', 'roleNamesAr', rolesAr, camel);
  setSmart(copy, 'RoleNamesEn', 'roleNamesEn', rolesAr, camel);

  const searchParts: unknown[] = [
    personAr,
    origNameAr,
    origNameEn,
    userName,
    email,
    phone,
    typeAr,
    origTypeEn,
    groupAr,
    origGroupEn,
    orgAr,
    origOrgEn,
    rolesAr.join(' '),
    isActive ? 'نشط فعال نعم' : 'معطل متوقف لا',
    'إسناد',
  ];

  return { row: copy, searchParts };
}

function arabizeBiddingRoleRow(rawRow: AnyRecord): { row: AnyRecord; searchParts: unknown[] } {
  const copy: AnyRecord = { ...rawRow };
  const camel = isCamelObject(copy);

  const origDispAr = getStr(copy, 'DisplayNameAr', 'displayNameAr');
  const origDispEn = getStr(copy, 'DisplayNameEn', 'displayNameEn');
  const origNameAr = getStr(copy, 'NameAr', 'nameAr');
  const origNameEn = getStr(copy, 'NameEn', 'nameEn');
  const origName = getStr(copy, 'Name', 'name');

  const userTypeId = getNum(copy, 'UserTypeId', 'userTypeId');
  const userGroupId = getNum(copy, 'UserGroupId', 'userGroupId');

  const origTypeAr = getStr(copy, 'UserTypeNameAr', 'userTypeNameAr');
  const origTypeEn = getStr(copy, 'UserTypeNameEn', 'userTypeNameEn');
  const origTypeCode = getStr(copy, 'UserTypeCode', 'userTypeCode');

  const origGroupAr = getStr(copy, 'UserGroupNameAr', 'userGroupNameAr');
  const origGroupEn = getStr(copy, 'UserGroupNameEn', 'userGroupNameEn');
  const origGroupCode = getStr(copy, 'UserGroupCode', 'userGroupCode');

  const origOrgAr = getStr(copy, 'OrganizationNameAr', 'organizationNameAr');
  const origOrgEn = getStr(copy, 'OrganizationNameEn', 'organizationNameEn');
  const origParent = getStr(copy, 'ParentRoleName', 'parentRoleName');

  const roleAr = translateTermToArabic(
    origDispAr || origNameAr || origDispEn || origNameEn || origName,
    'دور نظام',
  );

  const typeAr =
    (userTypeId !== null ? biddingTypeNameById.get(userTypeId) : undefined) ||
    translateTermToArabic(origTypeAr || origTypeEn || origTypeCode, 'النظام');

  const groupAr =
    (userGroupId !== null ? biddingGroupNameById.get(userGroupId) : undefined) ||
    translateTermToArabic(origGroupAr || origGroupEn || origGroupCode, typeAr);

  const hasOrg = Boolean(origOrgAr || origOrgEn || getNum(copy, 'OrganizationId', 'organizationId'));
  const orgAr = hasOrg
    ? arabizePersonOrOrgName(origOrgAr, origOrgEn, null, 'جهة مسجلة')
    : null;

  const parentAr = origParent ? translateTermToArabic(origParent, 'قالب أساسي') : null;
  const isTemplate = getBool(copy, 'IsTemplate', 'isTemplate', false);
  const isLocked = getBool(copy, 'IsLocked', 'isLocked', false);
  const isActive = getBool(copy, 'IsActive', 'isActive', true);

  setSmart(copy, 'DisplayNameAr', 'displayNameAr', roleAr, camel);
  setSmart(copy, 'DisplayNameEn', 'displayNameEn', roleAr, camel);
  setSmart(copy, 'NameAr', 'nameAr', roleAr, camel);
  setSmart(copy, 'NameEn', 'nameEn', roleAr, camel);
  setSmart(copy, 'Name', 'name', roleAr, camel);
  setSmart(copy, 'UserTypeNameAr', 'userTypeNameAr', typeAr, camel);
  setSmart(copy, 'UserTypeNameEn', 'userTypeNameEn', typeAr, camel);
  setSmart(copy, 'UserGroupNameAr', 'userGroupNameAr', groupAr, camel);
  setSmart(copy, 'UserGroupNameEn', 'userGroupNameEn', groupAr, camel);
  if (orgAr !== null) {
    setSmart(copy, 'OrganizationNameAr', 'organizationNameAr', orgAr, camel);
    setSmart(copy, 'OrganizationNameEn', 'organizationNameEn', orgAr, camel);
  }
  if (parentAr !== null) {
    setSmart(copy, 'ParentRoleName', 'parentRoleName', parentAr, camel);
  }

  const searchParts: unknown[] = [
    roleAr,
    origDispAr,
    origDispEn,
    origName,
    typeAr,
    origTypeEn,
    groupAr,
    origGroupEn,
    orgAr ?? '',
    origOrgEn,
    parentAr ?? '',
    isTemplate ? 'قالب دور أساسي' : 'دور مخصص',
    isLocked ? 'مقفل محمي' : 'قابل للتعديل',
    isActive ? 'نشط فعال نعم' : 'معطل متوقف لا',
    'إسناد',
  ];

  return { row: copy, searchParts };
}

function arabizeBiddingPageItem(rawPage: AnyRecord): AnyRecord {
  const copy: AnyRecord = { ...rawPage };
  const camel = isCamelObject(copy);
  const origAr = getStr(copy, 'NameAr', 'nameAr');
  const origEn = getStr(copy, 'NameEn', 'nameEn');
  const origCode = getStr(copy, 'Code', 'code');
  const pageAr = arabizePermissionOrPage(origAr, origEn, origCode);

  setSmart(copy, 'NameAr', 'nameAr', pageAr, camel);
  setSmart(copy, 'NameEn', 'nameEn', pageAr, camel);
  return copy;
}

function arabizeBiddingRolePagesEnvelope(rawDto: AnyRecord): AnyRecord {
  const copy: AnyRecord = { ...rawDto };
  const camel = isCamelObject(copy);

  const roleName = getStr(copy, 'RoleName', 'roleName');
  const dispAr = getStr(copy, 'DisplayNameAr', 'displayNameAr');
  const dispEn = getStr(copy, 'DisplayNameEn', 'displayNameEn');
  const groupNameAr = getStr(copy, 'GroupNameAr', 'groupNameAr');
  const groupNameEn = getStr(copy, 'GroupNameEn', 'groupNameEn');

  const finalRoleAr = translateTermToArabic(dispAr || dispEn || roleName || groupNameAr || groupNameEn, 'صلاحيات الدور');
  setSmart(copy, 'DisplayNameAr', 'displayNameAr', finalRoleAr, camel);
  setSmart(copy, 'DisplayNameEn', 'displayNameEn', finalRoleAr, camel);
  if ('RoleName' in copy || 'roleName' in copy) {
    setSmart(copy, 'RoleName', 'roleName', finalRoleAr, camel);
  }
  if ('GroupNameAr' in copy || 'groupNameAr' in copy) {
    setSmart(copy, 'GroupNameAr', 'groupNameAr', finalRoleAr, camel);
    setSmart(copy, 'GroupNameEn', 'groupNameEn', finalRoleAr, camel);
  }

  for (const [pascalKey, camelKey] of [
    ['Pages', 'pages'],
    ['AssignedPages', 'assignedPages'],
    ['Items', 'items'],
  ] as const) {
    const arr = getVal(copy, pascalKey, camelKey);
    if (Array.isArray(arr)) {
      setSmart(
        copy,
        pascalKey,
        camelKey,
        arr.map((p: AnyRecord) => (p && typeof p === 'object' ? arabizeBiddingPageItem(p) : p)),
        camel,
      );
    }
  }

  return copy;
}

function arabizeBiddingOrganizationRow(rawOrg: AnyRecord): { row: AnyRecord; searchParts: unknown[] } {
  const copy: AnyRecord = { ...rawOrg };
  const camel = isCamelObject(copy);
  const origAr = getStr(copy, 'NameAr', 'nameAr');
  const origEn = getStr(copy, 'NameEn', 'nameEn');
  const code = getStr(copy, 'Code', 'code');
  const cr = getStr(copy, 'CrNumber', 'crNumber');

  const orgAr = arabizePersonOrOrgName(origAr, origEn, null, code || 'جهة مسجلة');
  setSmart(copy, 'NameAr', 'nameAr', orgAr, camel);
  setSmart(copy, 'NameEn', 'nameEn', orgAr, camel);

  return {
    row: copy,
    searchParts: [orgAr, origAr, origEn, code, cr],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// بناء وتعريب سجلات منصة نفاذ (NafadhDbDev)
// ─────────────────────────────────────────────────────────────────────────────

function translateRoleAr(roleName: string): string {
  return translateTermToArabic(roleName, 'مستخدم نفاذ');
}

function isStatusActive(status: string | null | undefined): boolean {
  const s = String(status ?? 'Active').trim().toLowerCase();
  if (!s) return true;
  if (
    ['inactive', 'disabled', 'suspended', 'rejected', 'blocked', 'deleted', '0', 'false', 'غير نشط', 'معطل'].includes(
      s,
    )
  ) {
    return false;
  }
  return true;
}

function fetchNafadhSnapshot(nafadhToken: string | null): Promise<NafadhSnapshot | null> {
  const now = Date.now();
  if (cachedSnapshot && now - cachedSnapshotAt < 15_000) {
    return Promise.resolve(cachedSnapshot);
  }
  if (inflightSnapshot) {
    return inflightSnapshot;
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Accept-Language': 'ar-OM,ar;q=0.9',
  };
  if (nafadhToken) {
    headers['Authorization'] = `Bearer ${nafadhToken}`;
  }

  inflightSnapshot = fetch(NAFADH_SNAPSHOT_URL, { method: 'GET', headers })
    .then(async (res) => {
      if (!res.ok) return cachedSnapshot;
      const json = (await res.json()) as AnyRecord;
      const snap = (json?.['Data'] ?? json?.['data'] ?? json) as NafadhSnapshot;
      if (snap && Array.isArray(snap.users) && Array.isArray(snap.roles)) {
        cachedSnapshot = snap;
        cachedSnapshotAt = Date.now();
        return snap;
      }
      return cachedSnapshot;
    })
    .catch(() => cachedSnapshot)
    .finally(() => {
      inflightSnapshot = null;
    });

  return inflightSnapshot;
}

function interleave<T>(first: T[], second: T[]): T[] {
  const out: T[] = [];
  const max = Math.max(first.length, second.length);
  for (let i = 0; i < max; i++) {
    if (i < first.length) out.push(first[i]);
    if (i < second.length) out.push(second[i]);
  }
  return out;
}

function adaptCase(item: AnyRecord, sample?: AnyRecord | null): AnyRecord {
  if (!isCamelObject(sample)) return item;

  const converted: AnyRecord = {};
  const nestedSample =
    (Array.isArray(sample?.['groups']) ? (sample['groups'][0] as AnyRecord | undefined) : undefined) ?? sample;

  for (const [k, v] of Object.entries(item)) {
    const camelKey = k.charAt(0).toLowerCase() + k.slice(1);
    converted[camelKey] = Array.isArray(v)
      ? v.map((child) =>
          child && typeof child === 'object' ? adaptCase(child as AnyRecord, nestedSample) : child,
        )
      : v;
  }
  return converted;
}

function wrapSyntheticBody(payload: unknown): unknown {
  if (lastEnvelopeKey === 'Data') return { Data: payload, IsSuccess: true };
  if (lastEnvelopeKey === 'data') return { data: payload, isSuccess: true };
  return payload;
}

function buildNafadhGroups(snap: NafadhSnapshot, includeInactive: boolean) {
  const roles = snap.roles.length
    ? snap.roles
    : [{ roleId: 1, roleName: 'مستخدم', usersCount: snap.users.length, permissionsCount: 0 }];

  const groups = roles.map((r, idx) => {
    const roleAr = translateRoleAr(r.roleName);
    const fullGroupAr = `${roleAr} (نفاذ)`;
    const codeAr = arabizeGroupCode(`NFD_${r.roleName || r.roleId}`, roleAr);
    const groupId = NAFADH_GROUP_BASE_ID + r.roleId;

    return {
      Id: groupId,
      UserTypeId: NAFADH_USER_TYPE_ID,
      Code: codeAr,
      NameEn: fullGroupAr,
      NameAr: fullGroupAr,
      SortOrder: idx + 1,
      IsActive: true,
      IsSystem: true,
      IsProtected: true,
      CanDeactivate: false,
      CanEdit: false,
      TemplateRoleId: `nafadh-tpl-${r.roleId}`,
      UsersCount: r.usersCount,
      CustomRolesCount: 0,
    };
  });

  const filteredGroups = includeInactive ? groups : groups.filter((g) => g.IsActive);

  return {
    userType: {
      Id: NAFADH_USER_TYPE_ID,
      Code: 'NAFADH',
      NameEn: 'منصة نفاذ',
      NameAr: 'منصة نفاذ',
      SortOrder: 900,
      IsActive: true,
      HasRequesterCapability: false,
      Groups: filteredGroups,
    },
    groups: filteredGroups,
  };
}

function buildNafadhUsers(
  snap: NafadhSnapshot,
  filters: {
    q: string;
    userTypeId: number | null;
    userGroupId: number | null;
    isActive: boolean | null;
  },
): AnyRecord[] {
  const roleMap = new Map(snap.roles.map((r) => [r.roleId, r]));
  const results: AnyRecord[] = [];

  for (const u of snap.users) {
    const roleObj = roleMap.get(u.roleId);
    const rawRoleName = u.roleName || roleObj?.roleName || 'عضو';
    const roleAr = translateRoleAr(rawRoleName);
    const groupAr = `${roleAr} (نفاذ)`;
    const groupCodeAr = arabizeGroupCode(`NFD_${rawRoleName}`, roleAr);
    const groupId = NAFADH_GROUP_BASE_ID + (u.roleId || 1);
    const active = isStatusActive(u.status);

    const displayNameAr = arabizePersonOrOrgName(
      u.fullName,
      u.fullName,
      u.email,
      `مستخدم نفاذ #${u.userId}`,
    );

    const compAr = u.companyName
      ? arabizePersonOrOrgName(u.companyName, u.companyName, null, 'شركة مستضيفة')
      : '';
    const orgNameAr = compAr ? `${compAr} (نفاذ)` : 'منصة نفاذ';

    if (filters.userTypeId != null && filters.userTypeId > 0 && NAFADH_USER_TYPE_ID !== filters.userTypeId) {
      continue;
    }
    if (filters.userGroupId != null && filters.userGroupId > 0 && groupId !== filters.userGroupId) {
      continue;
    }
    if (filters.isActive !== null && active !== filters.isActive) {
      continue;
    }

    if (
      filters.q &&
      !matchesArabicQuery(
        [
          displayNameAr,
          u.fullName,
          u.email,
          u.phone,
          groupAr,
          rawRoleName,
          orgNameAr,
          u.companyName,
          'منصة نفاذ',
          active ? 'نشط فعال نعم' : 'معطل متوقف لا',
        ],
        filters.q,
      )
    ) {
      continue;
    }

    results.push({
      Id: `nafadh-user-${u.userId}`,
      ProfileId: u.userId,
      UserName: u.email || `nafadh_${u.userId}`,
      NameEn: displayNameAr,
      NameAr: displayNameAr,
      Email: u.email || '',
      PhoneNumber: u.phone || null,
      OrganizationId: u.companyId ? NAFADH_ORG_BASE_ID + u.companyId : null,
      OrganizationNameEn: orgNameAr,
      OrganizationNameAr: orgNameAr,
      UserTypeId: NAFADH_USER_TYPE_ID,
      UserTypeCode: 'NAFADH',
      UserTypeNameEn: 'منصة نفاذ',
      UserTypeNameAr: 'منصة نفاذ',
      UserGroupId: groupId,
      UserGroupCode: groupCodeAr,
      UserGroupNameEn: groupAr,
      UserGroupNameAr: groupAr,
      RoleIds: [`nafadh-tpl-${u.roleId || 1}`],
      RoleNamesEn: [groupAr],
      RoleNamesAr: [groupAr],
      IsActive: active,
      IsPrimary: true,
      HasRequesterCapability: false,
      CanRemove: false,
      CanEdit: false,
      CanDeactivate: false,
      IsSelf: false,
    });
  }

  return results;
}

function buildNafadhRoles(
  snap: NafadhSnapshot,
  filters: {
    templatesOnly: boolean;
    q: string;
    userTypeId: number | null;
    userGroupId: number | null;
    organizationId: number | null;
  },
): AnyRecord[] {
  const candidates: Array<{ row: AnyRecord; searchParts: unknown[] }> = [];

  if (filters.templatesOnly) {
    for (const r of snap.roles) {
      const roleAr = translateRoleAr(r.roleName);
      const displayAr = `${roleAr} (نفاذ)`;
      const codeAr = arabizeGroupCode(`NFD_${r.roleName || r.roleId}`, roleAr);
      const groupId = NAFADH_GROUP_BASE_ID + r.roleId;

      const row: AnyRecord = {
        Id: `nafadh-tpl-${r.roleId}`,
        Name: displayAr,
        DisplayNameEn: displayAr,
        DisplayNameAr: displayAr,
        NameEn: displayAr,
        NameAr: displayAr,
        IsActive: true,
        IsTemplate: true,
        UserTypeId: NAFADH_USER_TYPE_ID,
        UserTypeCode: 'NAFADH',
        UserTypeNameEn: 'منصة نفاذ',
        UserTypeNameAr: 'منصة نفاذ',
        UserGroupId: groupId,
        UserGroupCode: codeAr,
        UserGroupNameEn: displayAr,
        UserGroupNameAr: displayAr,
        OrganizationId: null,
        OrganizationNameEn: null,
        OrganizationNameAr: null,
        ParentRoleId: null,
        ParentRoleName: null,
        UsersCount: r.usersCount,
        UserCount: r.usersCount,
        AssignedUsersCount: r.usersCount,
        PagesCount: r.permissionsCount,
        PageCount: r.permissionsCount,
        AssignedPagesCount: r.permissionsCount,
        IsLocked: true,
        CanDelete: false,
        CanEdit: false,
      };

      candidates.push({
        row,
        searchParts: [displayAr, r.roleName, codeAr, 'منصة نفاذ', 'قالب دور مقفل نشط فعال نعم'],
      });
    }
  } else {
    const companyRole =
      snap.roles.find((r) => /company|supervisor/i.test(r.roleName)) ?? snap.roles[0];
    const defaultRoleId = companyRole?.roleId ?? 1;
    const defaultRoleEn = companyRole?.roleName ?? 'Company';
    const defaultRoleAr = translateRoleAr(defaultRoleEn);
    const defaultGroupAr = `${defaultRoleAr} (نفاذ)`;
    const defaultGroupCodeAr = arabizeGroupCode(`NFD_${defaultRoleEn}`, defaultRoleAr);
    const defaultGroupId = NAFADH_GROUP_BASE_ID + defaultRoleId;

    for (const d of snap.departments) {
      const deptAr = translateTermToArabic(d.departmentName, 'عام');
      const compAr = d.companyName
        ? arabizePersonOrOrgName(d.companyName, d.companyName, null, `شركة #${d.companyId}`)
        : `شركة #${d.companyId}`;
      const displayAr = `قسم ${deptAr} - ${compAr} (نفاذ)`;

      const row: AnyRecord = {
        Id: `nafadh-dept-${d.departmentId}`,
        Name: displayAr,
        DisplayNameEn: displayAr,
        DisplayNameAr: displayAr,
        NameEn: displayAr,
        NameAr: displayAr,
        IsActive: true,
        IsTemplate: false,
        UserTypeId: NAFADH_USER_TYPE_ID,
        UserTypeCode: 'NAFADH',
        UserTypeNameEn: 'منصة نفاذ',
        UserTypeNameAr: 'منصة نفاذ',
        UserGroupId: defaultGroupId,
        UserGroupCode: defaultGroupCodeAr,
        UserGroupNameEn: defaultGroupAr,
        UserGroupNameAr: defaultGroupAr,
        OrganizationId: NAFADH_ORG_BASE_ID + d.companyId,
        OrganizationNameEn: compAr,
        OrganizationNameAr: compAr,
        ParentRoleId: `nafadh-tpl-${defaultRoleId}`,
        ParentRoleName: defaultGroupAr,
        UsersCount: d.membersCount,
        UserCount: d.membersCount,
        AssignedUsersCount: d.membersCount,
        PagesCount: companyRole?.permissionsCount ?? 0,
        PageCount: companyRole?.permissionsCount ?? 0,
        AssignedPagesCount: companyRole?.permissionsCount ?? 0,
        IsLocked: true,
        CanDelete: false,
        CanEdit: false,
      };

      candidates.push({
        row,
        searchParts: [
          displayAr,
          d.departmentName,
          compAr,
          d.companyName,
          defaultGroupAr,
          'منصة نفاذ دور مخصص مقفل نشط فعال نعم',
        ],
      });
    }

    const seenPositions = new Set<string>();
    for (const s of snap.supervisors) {
      const rawLabel = (s.position || s.department || 'مشرف تدريب').trim();
      const dedupKey = `${s.companyId}:${rawLabel.toLowerCase()}`;
      if (seenPositions.has(dedupKey)) continue;
      seenPositions.add(dedupKey);

      const posAr = translateTermToArabic(rawLabel, 'مشرف تدريب');
      const compAr = s.companyName
        ? arabizePersonOrOrgName(s.companyName, s.companyName, null, `شركة #${s.companyId}`)
        : `شركة #${s.companyId}`;
      const displayAr = `${posAr} - ${compAr} (نفاذ)`;
      const active = isStatusActive(s.status);

      const row: AnyRecord = {
        Id: `nafadh-sup-${s.supervisorId}`,
        Name: displayAr,
        DisplayNameEn: displayAr,
        DisplayNameAr: displayAr,
        NameEn: displayAr,
        NameAr: displayAr,
        IsActive: active,
        IsTemplate: false,
        UserTypeId: NAFADH_USER_TYPE_ID,
        UserTypeCode: 'NAFADH',
        UserTypeNameEn: 'منصة نفاذ',
        UserTypeNameAr: 'منصة نفاذ',
        UserGroupId: defaultGroupId,
        UserGroupCode: defaultGroupCodeAr,
        UserGroupNameEn: defaultGroupAr,
        UserGroupNameAr: defaultGroupAr,
        OrganizationId: NAFADH_ORG_BASE_ID + s.companyId,
        OrganizationNameEn: compAr,
        OrganizationNameAr: compAr,
        ParentRoleId: `nafadh-tpl-${defaultRoleId}`,
        ParentRoleName: defaultGroupAr,
        UsersCount: 1,
        UserCount: 1,
        AssignedUsersCount: 1,
        PagesCount: companyRole?.permissionsCount ?? 0,
        PageCount: companyRole?.permissionsCount ?? 0,
        AssignedPagesCount: companyRole?.permissionsCount ?? 0,
        IsLocked: true,
        CanDelete: false,
        CanEdit: false,
      };

      candidates.push({
        row,
        searchParts: [
          displayAr,
          rawLabel,
          compAr,
          s.companyName,
          defaultGroupAr,
          'منصة نفاذ دور مخصص مقفل',
          active ? 'نشط فعال نعم' : 'معطل متوقف لا',
        ],
      });
    }

    for (const c of snap.companies) {
      const compAr = arabizePersonOrOrgName(
        c.companyName,
        c.companyName,
        null,
        `جهة #${c.companyId}`,
      );
      const displayAr = `مسؤول جهة: ${compAr} (نفاذ)`;
      const active = isStatusActive(c.status);

      const row: AnyRecord = {
        Id: `nafadh-comp-role-${c.companyId}`,
        Name: displayAr,
        DisplayNameEn: displayAr,
        DisplayNameAr: displayAr,
        NameEn: displayAr,
        NameAr: displayAr,
        IsActive: active,
        IsTemplate: false,
        UserTypeId: NAFADH_USER_TYPE_ID,
        UserTypeCode: 'NAFADH',
        UserTypeNameEn: 'منصة نفاذ',
        UserTypeNameAr: 'منصة نفاذ',
        UserGroupId: defaultGroupId,
        UserGroupCode: defaultGroupCodeAr,
        UserGroupNameEn: defaultGroupAr,
        UserGroupNameAr: defaultGroupAr,
        OrganizationId: NAFADH_ORG_BASE_ID + c.companyId,
        OrganizationNameEn: compAr,
        OrganizationNameAr: compAr,
        ParentRoleId: `nafadh-tpl-${defaultRoleId}`,
        ParentRoleName: defaultGroupAr,
        UsersCount: 1,
        UserCount: 1,
        AssignedUsersCount: 1,
        PagesCount: companyRole?.permissionsCount ?? 0,
        PageCount: companyRole?.permissionsCount ?? 0,
        AssignedPagesCount: companyRole?.permissionsCount ?? 0,
        IsLocked: true,
        CanDelete: false,
        CanEdit: false,
      };

      candidates.push({
        row,
        searchParts: [
          displayAr,
          compAr,
          c.companyName,
          c.workField,
          c.commercialRegister,
          defaultGroupAr,
          'منصة نفاذ دور مخصص مقفل',
          active ? 'نشط فعال نعم' : 'معطل متوقف لا',
        ],
      });
    }
  }

  return candidates
    .filter(({ row, searchParts }) => {
      if (
        filters.userTypeId != null &&
        filters.userTypeId > 0 &&
        row['UserTypeId'] !== filters.userTypeId
      ) {
        return false;
      }
      if (
        filters.userGroupId != null &&
        filters.userGroupId > 0 &&
        row['UserGroupId'] !== filters.userGroupId
      ) {
        return false;
      }
      if (
        filters.organizationId != null &&
        filters.organizationId > 0 &&
        row['OrganizationId'] !== filters.organizationId
      ) {
        return false;
      }
      if (filters.q && !matchesArabicQuery(searchParts, filters.q)) {
        return false;
      }
      return true;
    })
    .map(({ row }) => row);
}

function buildNafadhAppPages(snap: NafadhSnapshot): AnyRecord[] {
  return snap.permissions.map((p, idx) => {
    const permAr = arabizePermissionOrPage(p.description, p.permissionKey);
    const fullAr = `${permAr} (نفاذ)`;
    return {
      Id: 9000 + p.permissionId,
      Code: arabizeGroupCode(`NFD_${p.permissionKey}`, permAr),
      SystemCode: 'منصة نفاذ',
      Url: `/nafadh/${(p.permissionKey || '').toLowerCase()}`,
      NameEn: fullAr,
      NameAr: fullAr,
      SortOrder: 900 + idx,
      RequiredActionFlags: 1,
      DefaultDataScope: 1,
      IsActive: true,
    };
  });
}

function buildNafadhRolePagesDto(snap: NafadhSnapshot, roleOrGroupIdentifier: string): AnyRecord {
  let numericRoleId = 1;
  const tplMatch = roleOrGroupIdentifier.match(/nafadh-tpl-(\d+)/i);
  const grpMatch = roleOrGroupIdentifier.match(/^9(\d{3,})$/);
  if (tplMatch) {
    numericRoleId = Number(tplMatch[1]);
  } else if (grpMatch) {
    numericRoleId = Number(roleOrGroupIdentifier) - NAFADH_GROUP_BASE_ID;
  } else {
    numericRoleId = snap.roles[0]?.roleId ?? 1;
  }

  const role = snap.roles.find((r) => r.roleId === numericRoleId) ?? snap.roles[0];
  const roleEn = role?.roleName ?? 'دور نفاذ';
  const roleAr = `${translateRoleAr(roleEn)} (نفاذ)`;
  const assignedSet = new Set(
    snap.rolePermissions.filter((rp) => rp.roleId === numericRoleId).map((rp) => rp.permissionId),
  );

  const pages = snap.permissions
    .filter((p) => assignedSet.size === 0 || assignedSet.has(p.permissionId))
    .map((p) => {
      const permAr = `${arabizePermissionOrPage(p.description, p.permissionKey)} (نفاذ)`;
      return {
        AppPageId: 9000 + p.permissionId,
        PageId: 9000 + p.permissionId,
        Id: 9000 + p.permissionId,
        Code: arabizeGroupCode(`NFD_${p.permissionKey}`, permAr),
        SystemCode: 'منصة نفاذ',
        Url: `/nafadh/${(p.permissionKey || '').toLowerCase()}`,
        NameEn: permAr,
        NameAr: permAr,
        ActionFlags: 1,
        DataScope: 1,
        IsAssigned: true,
      };
    });

  return {
    RoleId: roleOrGroupIdentifier,
    RoleName: roleAr,
    DisplayNameEn: roleAr,
    DisplayNameAr: roleAr,
    GroupNameAr: roleAr,
    GroupNameEn: roleAr,
    IsTemplate: roleOrGroupIdentifier.includes('tpl'),
    IsLocked: true,
    Pages: pages,
    AssignedPages: pages,
  };
}

function buildNafadhOrganizations(snap: NafadhSnapshot, q: string): AnyRecord[] {
  const results: AnyRecord[] = [];
  for (const c of snap.companies) {
    const compAr = `${arabizePersonOrOrgName(c.companyName, c.companyName, null, `جهة #${c.companyId}`)} (نفاذ)`;
    const code = c.commercialRegister || `نفاذ-${c.companyId}`;
    if (
      q &&
      !matchesArabicQuery([compAr, c.companyName, c.workField, code, 'منصة نفاذ'], q)
    ) {
      continue;
    }
    results.push({
      Id: NAFADH_ORG_BASE_ID + c.companyId,
      Code: code,
      CrNumber: c.commercialRegister || '',
      NameEn: compAr,
      NameAr: compAr,
      IsActive: isStatusActive(c.status),
    });
  }
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// البحث الفوري التلقائي أثناء الكتابة (Live Search) في صفحات الهوية والصلاحيات
// ─────────────────────────────────────────────────────────────────────────────

function installIdentityLiveSearchOnce(): void {
  if (liveSearchInstalled || typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  liveSearchInstalled = true;

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const isOnIdentityRoute = (): boolean => {
    const path = window.location.pathname.toLowerCase();
    return path.includes('/identity');
  };

  const isInsideModalOrDrawer = (el: HTMLElement): boolean => {
    return Boolean(
      el.closest('[role="dialog"], [aria-modal="true"], .ia-modal, .ia-drawer, .modal, .drawer'),
    );
  };

  const findFilterBarSearchButton = (sourceEl: HTMLElement): HTMLButtonElement | null => {
    let container: HTMLElement | null = sourceEl.parentElement;
    while (container && container !== document.body) {
      const buttons = Array.from(container.querySelectorAll('button'));
      const searchBtn = buttons.find((btn) => {
        if (btn.disabled) return false;
        const txt = (btn.textContent ?? '').trim();
        return txt === 'بحث' || txt === 'Search';
      });
      if (searchBtn) return searchBtn;
      container = container.parentElement;
    }
    return null;
  };

  document.addEventListener(
    'input',
    (ev: Event) => {
      if (!isOnIdentityRoute()) return;
      const target = ev.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (target.type === 'checkbox' || target.type === 'radio' || target.type === 'password') {
        return;
      }
      if (isInsideModalOrDrawer(target)) return;

      const searchBtn = findFilterBarSearchButton(target);
      if (!searchBtn) return;

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        searchBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      }, 280);
    },
    true,
  );

  document.addEventListener(
    'change',
    (ev: Event) => {
      if (!isOnIdentityRoute()) return;
      const target = ev.target;
      if (!(target instanceof HTMLSelectElement)) return;
      if (isInsideModalOrDrawer(target)) return;

      const searchBtn = findFilterBarSearchButton(target);
      if (!searchBtn) return;

      if (debounceTimer) clearTimeout(debounceTimer);
      searchBtn.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    },
    true,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// استخراج وتغليف الاستجابات المرقّمة (Paged Envelope)
// ─────────────────────────────────────────────────────────────────────────────

function extractPagedEnvelope(body: unknown) {
  let envelopeKey: 'Data' | 'data' | null = null;
  let inner: AnyRecord | unknown = body;
  if (body && typeof body === 'object') {
    const obj = body as AnyRecord;
    if ('Data' in obj && obj['Data'] && typeof obj['Data'] === 'object') {
      envelopeKey = 'Data';
      lastEnvelopeKey = 'Data';
      inner = obj['Data'];
    } else if ('data' in obj && obj['data'] && typeof obj['data'] === 'object') {
      envelopeKey = 'data';
      lastEnvelopeKey = 'data';
      inner = obj['data'];
    }
  }

  const innerObj = inner && typeof inner === 'object' ? (inner as AnyRecord) : null;

  const rowsKey = innerObj
    ? 'rows' in innerObj
      ? 'rows'
      : 'Rows' in innerObj
        ? 'Rows'
        : 'items' in innerObj
          ? 'items'
          : 'rows'
    : 'rows';
  const totalKey =
    innerObj && 'Total' in innerObj && !('total' in innerObj) ? 'Total' : 'total';
  const pageIndexKey =
    innerObj && 'PageIndex' in innerObj && !('pageIndex' in innerObj)
      ? 'PageIndex'
      : 'pageIndex';
  const pageSizeKey =
    innerObj && 'PageSize' in innerObj && !('pageSize' in innerObj)
      ? 'PageSize'
      : 'pageSize';

  const rawRows = innerObj ? innerObj[rowsKey] : null;
  const rows: AnyRecord[] = Array.isArray(rawRows) ? (rawRows as AnyRecord[]) : [];
  const rawTotal = innerObj ? innerObj[totalKey] : null;
  const total = typeof rawTotal === 'number' ? rawTotal : rows.length;

  return { envelopeKey, inner: innerObj, rowsKey, totalKey, pageIndexKey, pageSizeKey, rows, total };
}

function resolveZeroBasedPage(requestedPageIndex: number): {
  firstPageParam: number;
  zeroBasedPage: number;
} {
  if (requestedPageIndex === 0) {
    detectedFirstPageIndex = 0;
  } else if (detectedFirstPageIndex === null) {
    detectedFirstPageIndex = requestedPageIndex === 1 ? 1 : 0;
  }
  const base = detectedFirstPageIndex ?? 0;
  return {
    firstPageParam: base,
    zeroBasedPage: Math.max(0, requestedPageIndex - base),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// نقطة الدخول الرئيسية لدمج وتعريب الهوية والصلاحيات والبحث الموحد
// ─────────────────────────────────────────────────────────────────────────────

export function handleNafadhIdentityMerge(
  originalReq: HttpRequest<unknown>,
  next: HttpHandlerFn,
  nafadhToken: string | null,
): Observable<HttpEvent<unknown>> {
  installIdentityLiveSearchOnce();

  if (typeof document !== 'undefined') {
    document.documentElement.lang = 'ar';
    document.documentElement.dir = 'rtl';
  }

  // إجبار ترويسة اللغة العربية في جميع الطلبات (GET / POST / PUT / DELETE)
  const req = originalReq.clone({
    setHeaders: {
      'Accept-Language': 'ar-OM,ar;q=0.9',
    },
  });

  if (req.method.toUpperCase() !== 'GET') {
    return next(req);
  }

  const cleanPath = req.url.replace(/^https?:\/\/[^/]+/i, '').split('?')[0].replace(/\/+$/, '');

  // 1) صلاحيات دور أو مجموعة تابعة لنفاذ مباشرة
  const nafadhRolePagesMatch = cleanPath.match(/\/roles\/(nafadh-[^/]+)\/pages$/i);
  const nafadhGroupPagesMatch = cleanPath.match(/\/(?:user-)?groups\/(9\d{3,})\/pages$/i);
  if (nafadhRolePagesMatch || nafadhGroupPagesMatch) {
    const targetId = (nafadhRolePagesMatch?.[1] ?? nafadhGroupPagesMatch?.[1])!;
    return from(fetchNafadhSnapshot(nafadhToken)).pipe(
      map((snap) => {
        const dto = snap
          ? buildNafadhRolePagesDto(snap, targetId)
          : { RoleId: targetId, Pages: [], AssignedPages: [] };
        return new HttpResponse({ status: 200, body: wrapSyntheticBody(dto) });
      }),
    );
  }

  // 1-ب) تعريب صلاحيات دور أو مجموعة قادمة من Bidding_API
  const biddingRoleOrGroupPagesMatch =
    /\/roles\/[^/]+\/pages$/i.test(cleanPath) ||
    /\/(?:user-)?groups\/[^/]+\/pages$/i.test(cleanPath);
  if (biddingRoleOrGroupPagesMatch) {
    return next(req).pipe(
      map((event) => {
        if (!(event instanceof HttpResponse) || !event.body || typeof event.body !== 'object') {
          return event;
        }
        const bodyObj = event.body as AnyRecord;
        const envKey =
          'Data' in bodyObj ? 'Data' : 'data' in bodyObj ? 'data' : null;
        const innerDto = envKey ? bodyObj[envKey] : bodyObj;
        if (!innerDto || typeof innerDto !== 'object') return event;
        const arabized = arabizeBiddingRolePagesEnvelope(innerDto as AnyRecord);
        return event.clone({
          body: envKey ? { ...bodyObj, [envKey]: arabized } : arabized,
        });
      }),
    );
  }

  const isUsersList = /\/(?:identity[^/]*|admin)\/users$/i.test(cleanPath);
  const isRolesList =
    /\/(?:identity[^/]*|admin)\/(?:roles|role-templates|custom-roles)$/i.test(cleanPath) ||
    /\/roles\/(?:templates|custom)$/i.test(cleanPath);
  const isGroupsList = /\/(?:identity[^/]*|admin)\/(?:user-)?groups$/i.test(cleanPath);
  const isPagesCatalog = /\/(?:identity[^/]*)\/pages$/i.test(cleanPath);
  const isOrganizationsList = /\/(?:identity[^/]*)\/organizations$/i.test(cleanPath);

  if (!isUsersList && !isRolesList && !isGroupsList && !isPagesCatalog && !isOrganizationsList) {
    return next(req);
  }

  // 2) المجموعات وأنواع المستخدمين (الجدول + القوائم المنسدلة للفلترة)
  if (isGroupsList) {
    const includeInactive = req.params.get('includeInactive') === 'true';
    return from(fetchNafadhSnapshot(nafadhToken)).pipe(
      switchMap((snap) =>
        next(req).pipe(
          map((event) => {
            if (!(event instanceof HttpResponse)) return event;
            const body = event.body;
            let envKey: 'Data' | 'data' | null = null;
            let payload: unknown = body;
            if (body && typeof body === 'object') {
              const bObj = body as AnyRecord;
              if ('Data' in bObj) {
                envKey = 'Data';
                lastEnvelopeKey = 'Data';
                payload = bObj['Data'];
              } else if ('data' in bObj) {
                envKey = 'data';
                lastEnvelopeKey = 'data';
                payload = bObj['data'];
              }
            }

            let mergedPayload: unknown = payload;

            if (Array.isArray(payload)) {
              const sample = (payload[0] as AnyRecord | undefined) ?? undefined;
              const isNestedByType =
                !sample || 'Groups' in sample || 'groups' in sample;

              if (isNestedByType) {
                const arabizedBiddingTypes = payload
                  .filter((t: AnyRecord) => (t?.['Id'] ?? t?.['id']) !== NAFADH_USER_TYPE_ID)
                  .map((t: AnyRecord) =>
                    t && typeof t === 'object' ? arabizeBiddingUserTypeItem(t) : t,
                  );

                if (snap) {
                  const { userType } = buildNafadhGroups(snap, includeInactive);
                  const adaptedType = adaptCase(userType, sample);
                  mergedPayload = [...arabizedBiddingTypes, adaptedType];
                } else {
                  mergedPayload = arabizedBiddingTypes;
                }
              } else {
                const arabizedBiddingGroups = payload
                  .filter((g: AnyRecord) => Number(g?.['Id'] ?? g?.['id'] ?? 0) < NAFADH_GROUP_BASE_ID)
                  .map((g: AnyRecord) =>
                    g && typeof g === 'object' ? arabizeBiddingGroupItem(g) : g,
                  );

                if (snap) {
                  const { groups } = buildNafadhGroups(snap, includeInactive);
                  const adaptedGroups = groups.map((g) => adaptCase(g, sample));
                  mergedPayload = [...arabizedBiddingGroups, ...adaptedGroups];
                } else {
                  mergedPayload = arabizedBiddingGroups;
                }
              }
            }

            const newBody =
              envKey && body && typeof body === 'object'
                ? { ...(body as AnyRecord), [envKey]: mergedPayload }
                : mergedPayload;
            return event.clone({ body: newBody });
          }),
          catchError((err) => {
            if (!snap) throw err;
            const { userType } = buildNafadhGroups(snap, includeInactive);
            return of(new HttpResponse({ status: 200, body: wrapSyntheticBody([userType]) }));
          }),
        ),
      ),
    );
  }

  // 3) كتالوج الصفحات العام (Pages)
  if (isPagesCatalog) {
    return from(fetchNafadhSnapshot(nafadhToken)).pipe(
      switchMap((snap) =>
        next(req).pipe(
          map((event) => {
            if (!(event instanceof HttpResponse)) return event;
            const body = event.body;
            const bObj = body && typeof body === 'object' ? (body as AnyRecord) : null;
            const envKey = bObj
              ? 'Data' in bObj
                ? 'Data'
                : 'data' in bObj
                  ? 'data'
                  : null
              : null;
            const list = envKey && bObj ? bObj[envKey] : body;
            if (!Array.isArray(list)) return event;

            const sample = (list[0] as AnyRecord | undefined) ?? undefined;
            const arabizedBiddingPages = list.map((p: AnyRecord) =>
              p && typeof p === 'object' ? arabizeBiddingPageItem(p) : p,
            );
            const nafadhPages = snap
              ? buildNafadhAppPages(snap).map((p) => adaptCase(p, sample))
              : [];
            const merged = [...arabizedBiddingPages, ...nafadhPages];

            return event.clone({
              body: envKey && bObj ? { ...bObj, [envKey]: merged } : merged,
            });
          }),
        ),
      ),
    );
  }

  // 4) القوائم المرقمة: المستخدمون / قوالب الأدوار / الأدوار المخصصة / الجهات
  const requestedPageIndex = Number(req.params.get('pageIndex') ?? 0);
  const requestedPageSize = Number(req.params.get('pageSize') ?? 5) || 5;
  const q = (req.params.get('q') ?? '').trim();
  const userTypeId = req.params.has('userTypeId') ? Number(req.params.get('userTypeId')) : null;
  const userGroupId = req.params.has('userGroupId') ? Number(req.params.get('userGroupId')) : null;
  const organizationId = req.params.has('organizationId')
    ? Number(req.params.get('organizationId'))
    : null;
  const isActiveParam = req.params.get('isActive');
  const isActive =
    isActiveParam === 'true' ? true : isActiveParam === 'false' ? false : null;

  const { firstPageParam, zeroBasedPage } = resolveZeroBasedPage(requestedPageIndex);

  const isExclusivelyNafadhFilter =
    userTypeId === NAFADH_USER_TYPE_ID ||
    (userGroupId !== null && userGroupId >= NAFADH_GROUP_BASE_ID) ||
    (organizationId !== null && organizationId >= NAFADH_ORG_BASE_ID);

  return from(fetchNafadhSnapshot(nafadhToken)).pipe(
    switchMap((snap) => {
      const computeNafadhList = (sampleRow?: AnyRecord): AnyRecord[] => {
        if (!snap) return [];
        if (isUsersList) {
          return buildNafadhUsers(snap, { q, userTypeId, userGroupId, isActive }).map((r) =>
            adaptCase(r, sampleRow),
          );
        }
        if (isOrganizationsList) {
          return buildNafadhOrganizations(snap, q).map((r) => adaptCase(r, sampleRow));
        }

        let templatesOnly = false;
        if (req.params.has('templatesOnly')) {
          templatesOnly = req.params.get('templatesOnly') === 'true';
        } else if (req.params.has('isTemplate')) {
          templatesOnly = req.params.get('isTemplate') === 'true';
        } else if (/template/i.test(cleanPath)) {
          templatesOnly = true;
        } else if (sampleRow && ('IsTemplate' in sampleRow || 'isTemplate' in sampleRow)) {
          templatesOnly = Boolean(sampleRow['IsTemplate'] ?? sampleRow['isTemplate']);
        }

        return buildNafadhRoles(snap, {
          templatesOnly,
          q,
          userTypeId,
          userGroupId,
          organizationId,
        }).map((r) => adaptCase(r, sampleRow));
      };

      // إذا اختار المستخدم فلتراً خاصاً بمنصة نفاذ فقط، نرجع النتائج فوراً
      if (isExclusivelyNafadhFilter) {
        const nafadhOnly = computeNafadhList();
        const start = zeroBasedPage * requestedPageSize;
        const slice = nafadhOnly.slice(start, start + requestedPageSize);
        const pagePayload = {
          rows: slice,
          total: nafadhOnly.length,
          pageIndex: requestedPageIndex,
          pageSize: requestedPageSize,
        };
        return of(new HttpResponse({ status: 200, body: wrapSyntheticBody(pagePayload) }));
      }

      // نحذف q من الطلب المرسل إلى Bidding_API لنجلب جميع السجلات ونطبق عليها التعريب والبحث العربي الموحد
      const cleanedParams = req.params
        .delete('q')
        .set('pageIndex', String(firstPageParam))
        .set('pageSize', '200');

      const expandedReq = req.clone({ params: cleanedParams });

      return next(expandedReq).pipe(
        map((event) => {
          if (!(event instanceof HttpResponse)) return event;

          // دعم حالة إرجاع قائمة المنظمات كمصفوفة مباشرة بدلاً من Paged Envelope
          const rawBody = event.body;
          const rawBodyObj = rawBody && typeof rawBody === 'object' ? (rawBody as AnyRecord) : null;
          const directArrayEnvKey = rawBodyObj
            ? Array.isArray(rawBodyObj['Data'])
              ? 'Data'
              : Array.isArray(rawBodyObj['data'])
                ? 'data'
                : null
            : null;

          if (isOrganizationsList && (Array.isArray(rawBody) || directArrayEnvKey)) {
            const rawArr = (directArrayEnvKey && rawBodyObj
              ? rawBodyObj[directArrayEnvKey]
              : rawBody) as AnyRecord[];
            const sampleOrg = rawArr[0];
            const biddingOrgs = rawArr
              .map((o) => arabizeBiddingOrganizationRow(o))
              .filter((item) => !q || matchesArabicQuery(item.searchParts, q))
              .map((item) => item.row);
            const nafadhOrgs = computeNafadhList(sampleOrg);
            const mergedOrgs = interleave(biddingOrgs, nafadhOrgs);
            return event.clone({
              body:
                directArrayEnvKey && rawBodyObj
                  ? { ...rawBodyObj, [directArrayEnvKey]: mergedOrgs }
                  : mergedOrgs,
            });
          }

          const {
            envelopeKey,
            inner,
            rowsKey,
            totalKey,
            pageIndexKey,
            pageSizeKey,
            rows: rawBiddingRows,
            total: biddingTotal,
          } = extractPagedEnvelope(event.body);

          const sampleRow = rawBiddingRows[0];

          // تعريب وفلترة صفوف Bidding_API بنفس محرك البحث العربي الموحد
          const filteredBiddingRows = rawBiddingRows
            .map((r) => {
              if (isUsersList) return arabizeBiddingUserRow(r);
              if (isOrganizationsList) return arabizeBiddingOrganizationRow(r);
              return arabizeBiddingRoleRow(r);
            })
            .filter((item) => !q || matchesArabicQuery(item.searchParts, q))
            .map((item) => item.row);

          const nafadhRows = computeNafadhList(sampleRow);
          const combined = interleave(filteredBiddingRows, nafadhRows);

          const mergedTotal = q
            ? combined.length
            : Math.max(combined.length, biddingTotal + nafadhRows.length);

          const start = zeroBasedPage * requestedPageSize;
          const pagedSlice = combined.slice(start, start + requestedPageSize);

          const updatedInner: AnyRecord = {
            ...(inner ?? {}),
            [rowsKey]: pagedSlice,
            [totalKey]: mergedTotal,
            [pageIndexKey]: requestedPageIndex,
            [pageSizeKey]: requestedPageSize,
          };

          const updatedBody =
            envelopeKey && event.body && typeof event.body === 'object'
              ? { ...(event.body as AnyRecord), [envelopeKey]: updatedInner }
              : updatedInner;

          return event.clone({ body: updatedBody });
        }),
        catchError((err) => {
          if (!snap) throw err;
          const fallbackRows = computeNafadhList();
          const start = zeroBasedPage * requestedPageSize;
          const pagePayload = {
            rows: fallbackRows.slice(start, start + requestedPageSize),
            total: fallbackRows.length,
            pageIndex: requestedPageIndex,
            pageSize: requestedPageSize,
          };
          return of(new HttpResponse({ status: 200, body: wrapSyntheticBody(pagePayload) }));
        }),
      );
    }),
  );
}