import { GuidePage } from '../models/company-guide.models';

/** Company-specific copy: texts describe the CURRENT screens, not future Admin integration. */
export const COMPANY_GUIDE_CONTENT: Record<string, GuidePage> = {
  dashboard: {
    pageKey: 'dashboard',
    title: 'لوحة تحكم الشركة',
    description: 'متابعة المؤشرات وإعلانات الهيئة والطاقة الاستيعابية وحالة البرامج من مكان واحد.',
    faqs: [
      { question: 'كيف أحدث البيانات المعروضة؟', answer: 'استخدم زر «تحديث البيانات» أعلى لوحة التحكم لطلب أحدث المعلومات المتاحة.' },
      { question: 'أين أجد الخطط التي تنتظر الاعتماد؟', answer: 'من بطاقة «خطط الكورسات (المهام والمشروعات)» يمكنك مراجعة الحالات والانتقال إلى الخطط.' },
      { question: 'هل يمكن تعديل المتدربين من لوحة التحكم؟', answer: 'هذه اللوحة للمتابعة؛ تسجيل المتدربين وربطهم بالدفعات يتم من خلال الإدارة.' },
    ],
    steps: [
      { target: '[data-guide="company-dashboard-header"]', title: 'لوحة التحكم وتحديث البيانات', description: 'راجع اسم الشركة واستخدم تحديث البيانات عند الحاجة.', order: 1 },
      { target: '[data-guide="company-dashboard-kpis"]', title: 'مؤشرات الأداء', description: 'تعرف على متوسط الحضور والأداء والحالات التي تحتاج متابعة.', order: 2 },
      { target: '[data-guide="company-dashboard-announcements"]', title: 'إعلانات الهيئة', description: 'اطلع على إعلانات الهيئة والمنصة. قد لا يظهر القسم إذا تم إخفاؤه.', order: 3 },
      { target: '[data-guide="company-dashboard-capacity"]', title: 'الطاقة الاستيعابية', description: 'راقب المقاعد المستخدمة والمتبقية ضمن بيانات شركتك.', order: 4 },
      { target: '[data-guide="company-dashboard-plans"]', title: 'ملخص البرامج والخطط', description: 'راجع عدد الخطط قيد الاعتماد والتنفيذ وانتقل للتفاصيل.', order: 5 },
    ],
  },
  programs: {
    pageKey: 'programs',
    title: 'البرامج التدريبية',
    description: 'استعرض البرامج المتاحة للشركة وتخصصاتها وحالة الاعتماد والطاقة الاستيعابية.',
    faqs: [
      { question: 'كيف أبحث عن برنامج؟', answer: 'اكتب اسم البرنامج أو التخصص في حقل البحث، ويمكنك تغيير الترتيب والفلاتر.' },
      { question: 'كيف أعرف حالة البرنامج؟', answer: 'حالة الاعتماد موضحة على بطاقة البرنامج، إلى جانب المقاعد المشغولة والمتاحة.' },
      { question: 'كيف أفتح تفاصيل برنامج معين؟', answer: 'اضغط على بطاقة البرنامج أو زر «التفاصيل» داخلها.' },
      { question: 'من المسؤول عن تسجيل المتدربين؟', answer: 'الإدارة هي المسؤولة عن تسجيل المتدربين وربطهم بالدفعات؛ بوابة الشركة تعرض البيانات للمتابعة فقط.' },
    ],
    steps: [
      { target: '[data-guide="company-programs-header"]', title: 'نظرة عامة', description: 'تعرف على الغرض من صفحة البرامج التدريبية.', order: 1 },
      { target: '[data-guide="company-programs-stats"]', title: 'ملخص البرامج', description: 'راجع أعداد التخصصات والطاقة الاستيعابية والمؤشرات المتاحة.', order: 2 },
      { target: '[data-guide="company-programs-filters"]', title: 'البحث والتصفية', description: 'ابحث أو صفِّ حسب حالة البرنامج ثم اختر الترتيب المناسب.', order: 3 },
      { target: '[data-guide="company-programs-list"]', title: 'بطاقات البرامج', description: 'افتح بطاقة للاطلاع على التفاصيل وحالة البرنامج ومقاعده.', order: 4 },
    ],
  },
  'program-details': {
    pageKey: 'program-details',
    title: 'تفاصيل البرنامج',
    description: 'تابع بيانات البرنامج ومراحله ومؤشراته والتقارير المتاحة دون تعديل تسجيل المتدربين.',
    faqs: [
      { question: 'كيف أرجع إلى قائمة البرامج؟', answer: 'اضغط على «العودة للبرامج» أعلى الصفحة.' },
      { question: 'كيف أراجع مراحل البرنامج؟', answer: 'انتقل إلى قسم مراحل أو خطة التدريب داخل تفاصيل البرنامج لعرض المراحل المتاحة.' },
      { question: 'هل أستطيع تصدير تفاصيل البرنامج؟', answer: 'توفر الواجهة أزرار Excel وPDF؛ يتوقف نجاح التصدير على توفر بيانات وخدمة التصدير.' },
    ],
    steps: [
      { target: '[data-guide="company-program-detail-actions"]', title: 'التنقل والتقارير', description: 'ارجع لقائمة البرامج أو استخدم خيارات تصدير النتائج.', order: 1 },
      { target: '[data-guide="company-program-detail-hero"]', title: 'بيانات البرنامج', description: 'راجع الاسم والتخصص والحالة والوصف.', order: 2 },
      { target: '[data-guide="company-program-detail-stats"]', title: 'ملخص المؤشرات', description: 'اطلع على الأرقام الإجمالية المرتبطة بالبرنامج.', order: 3 },
      { target: '[data-guide="company-program-detail-stages"]', title: 'مراحل البرنامج', description: 'راجع تقسيم البرنامج التدريبي إلى مراحله.', order: 4 },
    ],
  },
  tasks: {
    pageKey: 'tasks',
    title: 'المهام والمشروعات',
    description: 'استعرض خطط تنفيذ البرامج المرتبطة بالشركة، وابحث عنها وتابع حالتها.',
    faqs: [
      { question: 'أين أجد مهام ومشروعات كل برنامج؟', answer: 'افتح الخطة المعنية من القائمة، وستجد المراحل وبداخلها عناصر المهام والمشروعات.' },
      { question: 'كيف أتابع حالة الاعتماد؟', answer: 'تظهر حالة اعتماد كل خطة ضمن بطاقتها، وتوجد إحصاءات للحالات أعلى الصفحة.' },
      { question: 'كيف أصفي الخطط؟', answer: 'استخدم أزرار الحالة وحقل البحث باسم الكورس أو التصنيف.' },
      { question: 'من يعتمد الخطة ومن يدير الدفعات؟', answer: 'الإدارة تراجع وتعتمد الخطة، وهي المسؤولة عن تسجيل المتدربين وربطهم بالدفعات.' },
    ],
    steps: [
      { target: '[data-guide="company-tasks-header"]', title: 'المهام والمشروعات', description: 'هنا تبدأ متابعة خطط البرامج والدخول إلى مساحات العمل.', order: 1 },
      { target: '[data-guide="company-tasks-stats"]', title: 'إحصاءات الخطط', description: 'راجع الإجمالي والخطط بانتظار الاعتماد والمعتمدة والمتأخرة.', order: 2 },
      { target: '[data-guide="company-tasks-filters"]', title: 'البحث وحالة الخطة', description: 'حدد الحالة أو اكتب اسم البرنامج للعثور على الخطة المطلوبة.', order: 3 },
      { target: '[data-guide="company-tasks-approved"]', title: 'البرامج المعتمدة', description: 'عند توفر برنامج معتمد، يمكن الدخول إلى مسار خطة تنفيذه من هذه البطاقات.', order: 4 },
      { target: '[data-guide="company-tasks-list"]', title: 'الخطط', description: 'اختر بطاقة الخطة لعرض مراحلها ومدربيها ومهامها ومشروعاتها.', order: 5 },
    ],
  },
  workspace: {
    pageKey: 'workspace',
    title: 'مراحل البرنامج والمهام والمشروعات',
    description: 'مساحة العمل لعرض مراحل البرنامج وتعيين مدربيها ومتابعة مهامها ومشروعاتها وحالة الاعتماد.',
    faqs: [
      { question: 'كيف أعيّن مدربًا أو أكثر لمرحلة؟', answer: 'افتح «تعديل مدربي المرحلة» بجانب المرحلة، ثم حدد المدربين المتاحين واحفظ التعيين وفق الصلاحيات.' },
      { question: 'كيف أضيف مهمة أو مشروعًا إلى مرحلة؟', answer: 'عندما تكون بنية الخطة قابلة للتعديل، استخدم «مهمة جديدة» أو «مشروع جديد» من داخل المرحلة.' },
      { question: 'لماذا لا أستطيع تعديل بعض العناصر؟', answer: 'قد تتوقف صلاحية التعديل على حالة اعتماد الخطة أو تقدم التنفيذ؛ راجع الحالة الظاهرة أعلى الصفحة.' },
      { question: 'من يعتمد الخطة؟', answer: 'بعد إرسالها، تتم مراجعة واعتماد الخطة من جانب Admin؛ الشركة تتابع حالتها وتتعامل مع ملاحظات المراجعة.' },
    ],
    steps: [
      { target: '[data-guide="company-workspace-header"]', title: 'بيانات الخطة والإجراءات', description: 'راجع الخطة وأزرارها المتاحة حسب الحالة والصلاحية.', order: 1 },
      { target: '[data-guide="company-workspace-approval"]', title: 'دورة الاعتماد', description: 'تعرف على وضع الخطة في مراحل الاعتماد قبل البدء بالتنفيذ.', order: 2 },
      { target: '[data-guide="company-workspace-timeline"]', title: 'الجدول الزمني', description: 'استعرض توقيت مراحل البرنامج ونسب إنجازها.', order: 3 },
      { target: '[data-guide="company-workspace-stages"]', title: 'المراحل والمدربون', description: 'داخل كل مرحلة تجد المدربين المعيّنين والأعمال التابعة لها.', order: 4 },
      { target: '[data-guide="company-workspace-items"]', title: 'المهام والمشروعات', description: 'تظهر تفاصيل المهام والمشروعات وحالاتها داخل جدول المرحلة.', order: 5 },
      { target: '[data-guide="company-workspace-new-project"]', title: 'إضافة مشروع', description: 'عند السماح بالتعديل، أضف مشروعًا للمرحلة من هنا.', order: 6 },
      { target: '[data-guide="company-workspace-notes"]', title: 'الملاحظات', description: 'سجل أو راجع ملاحظات التنفيذ والمراجعة.', order: 7 },
    ],
  },
  profile: {
    pageKey: 'profile',
    title: 'ملف الشركة',
    description: 'راجع بيانات الشركة وفروعها ومجالات عملها وبرامجها المعتمدة وطاقتها الاستيعابية ونقاط الاتصال.',
    faqs: [
      { question: 'كيف أعدّل بيانات التواصل؟', answer: 'من بطاقة «معلومات الشركة» اضغط «تعديل بيانات التواصل»، عدّل الحقول ثم اضغط «حفظ التغييرات».' },
      { question: 'كيف أضيف فرعًا جديدًا؟', answer: 'من بطاقة «الفروع» اضغط «+ إضافة فرع»، أدخل موقع الفرع ورقم هاتفه ثم اضغط «حفظ».' },
      { question: 'كيف أضيف مجال عمل أو أحذفه؟', answer: 'اكتب اسم المجال في بطاقة «مجالات العمل» واضغط «إضافة»، ولحذف مجال اضغط علامة ✕ بجانبه.' },
      { question: 'كيف أنتقل إلى قائمة المتدربين؟', answer: 'من بطاقة «الطاقة الاستيعابية» اضغط زر «المتدربون» للانتقال إلى صفحة المتدربين.' },
      { question: 'هل يمكنني إضافة نقاط اتصال أو تغيير التخصصات المعتمدة من هذه الصفحة؟', answer: 'لا، المشرفون ونقاط الاتصال والتخصصات المعتمدة تُعرض للمتابعة فقط، وأي تعديل عليها يتم عبر الإدارة.' },
    ],
    steps: [
      { target: '[data-guide="company-profile-header"]', title: 'ملف الشركة', description: 'هنا تجد كل بيانات شركتك الرسمية في مكان واحد.', order: 1 },
      { target: '[data-guide="company-profile-hero"]', title: 'بطاقة الشركة', description: 'تعرض شعار الشركة وغلافها واسمها وحالتها.', order: 2 },
      { target: '[data-guide="company-profile-kpis"]', title: 'مؤشرات الشركة', description: 'أرقام سريعة عن الشركة والمتدربين والبرامج.', order: 3 },
      { target: '[data-guide="company-profile-details"]', title: 'معلومات الشركة', description: 'البيانات الرسمية ووسائل التواصل، ويمكنك تعديل بيانات التواصل من هنا.', order: 4 },
      { target: '[data-guide="company-profile-workfields"]', title: 'مجالات العمل', description: 'أضف مجالات عمل شركتك أو احذف ما لا ينطبق منها.', order: 5 },
      { target: '[data-guide="company-profile-branches"]', title: 'الفروع', description: 'أضف فروع الشركة بموقعها ورقم هاتفها وتابعها من هنا.', order: 6 },
      { target: '[data-guide="company-profile-specialties"]', title: 'التخصصات المعتمدة', description: 'التخصصات المعتمدة لشركتك والطاقة المخصصة لكل منها وحالتها.', order: 7 },
      { target: '[data-guide="company-profile-capacity"]', title: 'الطاقة الاستيعابية', description: 'تابع المقاعد المستخدمة والمتبقية، ومنها يمكنك الانتقال إلى المتدربين.', order: 8 },
      { target: '[data-guide="company-profile-supervisors"]', title: 'المشرفون المعتمدون', description: 'المشرفون المعتمدون على التدريب في شركتك.', order: 9 },
      { target: '[data-guide="company-profile-contacts"]', title: 'نقاط الاتصال', description: 'جهات الاتصال المسجلة للشركة وبياناتها.', order: 10 },
    ],
  },
  trainees: {
    pageKey: 'trainees',
    title: 'المتدربون',
    description: 'استعرض متدربي شركتك وابحث عنهم وصفِّهم حسب الدفعة والبرنامج والحالة والمشرف والتواريخ.',
    faqs: [
      { question: 'كيف أبحث عن متدرب؟', answer: 'اكتب الاسم أو رقم التسجيل أو اسم المشرف في حقل «بحث عن متدرب»، وتتحدث النتائج مباشرة.' },
      { question: 'كيف أصفّي القائمة؟', answer: 'استخدم قوائم الدفعة والبرنامج والحالة والمشرف، أو حدد تاريخ المباشرة والانتهاء، ثم اضغط «مسح التصفية» للعودة للكل.' },
      { question: 'كيف أصدّر القائمة إلى Excel؟', answer: 'اضغط «تصدير Excel» لتنزيل ملف .xlsx يحتوي على المتدربين الظاهرين بعد التصفية.' },
      { question: 'كيف أفتح صفحة متدرب معين؟', answer: 'اضغط أيقونة العين في عمود «إجراءات» لفتح صفحة المتدرب وتقييماته ونتائج اختباراته.' },
      { question: 'لماذا زر GitHub أو LinkedIn معطّل؟', answer: 'يعمل الزر فقط إذا كان المتدرب قد أضاف الرابط في بياناته.' },
      { question: 'هل يمكنني تسجيل متدرب جديد من هنا؟', answer: 'لا، تسجيل المتدربين وربطهم بالدفعات يتم من خلال الإدارة، وهذه الصفحة للمتابعة.' },
    ],
    steps: [
      { target: '[data-guide="company-trainees-header"]', title: 'قائمة المتدربين', description: 'هنا تتابع كل المتدربين المرتبطين بشركتك.', order: 1 },
      { target: '[data-guide="company-trainees-export"]', title: 'تصدير Excel', description: 'نزّل القائمة الحالية كملف Excel.', order: 2 },
      { target: '[data-guide="company-trainees-overview"]', title: 'ملخص المتدربين', description: 'إجمالي المتدربين والنشطين ومن يحتاجون متابعة ومتوسط الحضور.', order: 3 },
      { target: '[data-guide="company-trainees-filters"]', title: 'البحث والتصفية', description: 'ابحث أو صفِّ حسب الدفعة والبرنامج والحالة والمشرف والتواريخ.', order: 4 },
      { target: '[data-guide="company-trainees-table"]', title: 'جدول المتدربين', description: 'بيانات كل متدرب: الدفعة والبرنامج والمشرف والحضور والحالة والتواريخ.', order: 5 },
      { target: '[data-guide="company-trainees-actions"]', title: 'إجراءات المتدرب', description: 'افتح حساب GitHub أو LinkedIn للمتدرب، أو اضغط العين لعرض صفحته وتقييماته.', order: 6 },
      { target: '[data-guide="company-trainees-pagination"]', title: 'التنقل بين الصفحات', description: 'غيّر عدد المتدربين في الصفحة وتنقل بين الصفحات.', order: 7 },
    ],
  },
  'trainee-progress': {
    pageKey: 'trainee-progress',
    title: 'صفحة المتدرب',
    description: 'اطلع على بيانات المتدرب وتقييمات وحداته ومتوسط أدائه ونسبة إنجازه ونتائج اختباراته.',
    faqs: [
      { question: 'كيف أرجع إلى قائمة المتدربين؟', answer: 'اضغط «العودة إلى قائمة المتدربين» أعلى الصفحة.' },
      { question: 'كيف أغيّر الصورة الشخصية للمتدرب؟', answer: 'اضغط على صورة المتدرب واختر صورة بصيغة PNG أو JPEG أو WebP.' },
      { question: 'ما معنى «متوسط التقييم»؟', answer: 'هو متوسط تقييمات الوحدات التي تم تقييمها للمتدرب، ويظهر مع توزيعها على المحاور.' },
      { question: 'لماذا لا تظهر نتائج اختبارات؟', answer: 'تظهر النتائج بعد أن يؤدي المتدرب اختبارات دفعته، وإن لم يوجد أداء تظهر رسالة بعدم وجود نتائج.' },
      { question: 'لماذا توجد وحدات بانتظار التقييم؟', answer: 'هي وحدات لم يُسجَّل لها تقييم بعد.' },
    ],
    steps: [
      { target: '[data-guide="company-trainee-view-back"]', title: 'العودة للقائمة', description: 'ارجع إلى قائمة المتدربين في أي وقت.', order: 1 },
      { target: '[data-guide="company-trainee-view-profile"]', title: 'بيانات المتدرب', description: 'الاسم والحالة وبيانات التواصل، ويمكن تغيير الصورة بالضغط عليها.', order: 2 },
      { target: '[data-guide="company-trainee-view-groups"]', title: 'تفاصيل التدريب', description: 'البرنامج والمسار والدفعة وبقية بيانات التسجيل.', order: 3 },
      { target: '[data-guide="company-trainee-view-modules"]', title: 'الوحدات والتقييمات', description: 'تقييم كل وحدة وتفاصيله وعدد الوحدات المقيّمة.', order: 4 },
      { target: '[data-guide="company-trainee-view-summary"]', title: 'متوسط التقييم', description: 'المتوسط العام لتقييمات المتدرب وتوزيعه على المحاور.', order: 5 },
      { target: '[data-guide="company-trainee-view-status"]', title: 'حالة المتدرب', description: 'نسبة الإنجاز والوحدات المكتملة والمنتظرة وتاريخ آخر تقييم.', order: 6 },
      { target: '[data-guide="company-trainee-view-quizzes"]', title: 'نتائج الاختبارات', description: 'محاولات المتدرب في اختبارات دفعته ودرجاته.', order: 7 },
    ],
  },
  contact: {
    pageKey: 'contact',
    title: 'المراسلات',
    description: 'تواصل مع الهيئة وتابع محادثاتك ورسائلك من مكان واحد.',
    faqs: [
      { question: 'كيف أبدأ محادثة جديدة مع الهيئة؟', answer: 'اضغط «محادثة جديدة»، اختر التصنيف واكتب تفاصيل طلبك ثم أرسلها.' },
      { question: 'كيف أجد محادثة سابقة؟', answer: 'اكتب في حقل «ابحث عن محادثة»، أو اضغط «غير المقروءة» لعرض المحادثات الجديدة فقط.' },
      { question: 'كيف أرد على رسالة؟', answer: 'افتح المحادثة من القائمة، اكتب ردك في مربع الرسالة واضغط «إرسال الرسالة» أو Ctrl + Enter.' },
      { question: 'كيف أعرف أن لدي رسائل لم أقرأها؟', answer: 'يظهر عداد بجانب المحادثة وفي بطاقة «الرسائل غير المقروءة» أعلى الصفحة.' },
      { question: 'ما أقصى طول للرسالة؟', answer: 'يمكن أن تصل الرسالة إلى 5000 حرف.' },
    ],
    steps: [
      { target: '[data-guide="company-contact-header"]', title: 'المراسلات', description: 'مساحة موحدة للتواصل مع الهيئة ومتابعة استفساراتك.', order: 1 },
      { target: '[data-guide="company-contact-new"]', title: 'محادثة جديدة', description: 'ابدأ محادثة جديدة مع الهيئة من هنا.', order: 2 },
      { target: '[data-guide="company-contact-stats"]', title: 'إحصائيات المحادثات', description: 'إجمالي المحادثات والرسائل غير المقروءة والمحادثات المقروءة.', order: 3 },
      { target: '[data-guide="company-contact-sidebar"]', title: 'قائمة المحادثات', description: 'كل مراسلاتك مع الهيئة، وزر التحديث لجلب الجديد.', order: 4 },
      { target: '[data-guide="company-contact-filters"]', title: 'البحث والتصفية', description: 'ابحث عن محادثة أو اعرض غير المقروءة فقط.', order: 5 },
      { target: '[data-guide="company-contact-list"]', title: 'المحادثات', description: 'اختر محادثة لفتحها ومتابعة رسائلها.', order: 6 },
      { target: '[data-guide="company-contact-chat"]', title: 'نافذة المحادثة', description: 'تظهر هنا رسائل المحادثة المفتوحة.', order: 7 },
      { target: '[data-guide="company-contact-composer"]', title: 'كتابة الرد', description: 'عند فتح محادثة تكتب ردك هنا وترسله للهيئة.', order: 8 },
    ],
  },
  notifications: {
    pageKey: 'notifications',
    title: 'الإشعارات',
    description: 'تابع كل التحديثات والتنبيهات الخاصة ببوابة الشركة وصفِّها حسب الحالة والنوع والتاريخ.',
    faqs: [
      { question: 'كيف أعلّم كل الإشعارات كمقروءة؟', answer: 'اضغط «تعليم الكل كمقروء» أعلى الصفحة، ويكون الزر متاحًا فقط عند وجود إشعارات غير مقروءة.' },
      { question: 'كيف أعرض غير المقروءة فقط؟', answer: 'اضغط تبويب «غير مقروءة» في شريط الفلاتر.' },
      { question: 'كيف أبحث في الإشعارات أو أصفّيها؟', answer: 'استخدم البحث والتاريخ والترتيب وأنواع الإشعارات، ويمسح زر المسح كل الفلاتر دفعة واحدة.' },
      { question: 'كيف أحدّث القائمة؟', answer: 'اضغط زر «تحديث» أعلى الصفحة لجلب أحدث الإشعارات.' },
      { question: 'لماذا لا يظهر شريط أنواع الإشعارات؟', answer: 'يظهر عند وجود أكثر من نوع واحد من الإشعارات فقط.' },
    ],
    steps: [
      { target: '[data-guide="company-notifications-header"]', title: 'مركز الإشعارات', description: 'كل تحديثات بوابة الشركة في مكان واحد.', order: 1 },
      { target: '[data-guide="company-notifications-actions"]', title: 'تحديث وتعليم كمقروء', description: 'حدّث القائمة أو علّم كل الإشعارات كمقروءة.', order: 2 },
      { target: '[data-guide="company-notifications-stats"]', title: 'ملخص الإشعارات', description: 'الإجمالي وغير المقروءة وإشعارات اليوم والتحذيرات.', order: 3 },
      { target: '[data-guide="company-notifications-filters"]', title: 'الفلاتر', description: 'ابحث أو اختر تاريخًا أو رتّب أو صفِّ حسب الكل وغير المقروءة والمقروءة.', order: 4 },
      { target: '[data-guide="company-notifications-categories"]', title: 'أنواع الإشعارات', description: 'صفِّ الإشعارات حسب نوعها مثل المهام والرسائل والتحذيرات.', order: 5 },
      { target: '[data-guide="company-notifications-list"]', title: 'قائمة الإشعارات', description: 'كل إشعار بعنوانه ووقته، ويمكنك تعليمه كمقروء.', order: 6 },
    ],
  },
  'daily-attendance': {
    pageKey: 'daily-attendance',
    title: 'سجل حضور المدربين',
    description: 'سجّل حضور المدربين وتابع السجل اليومي والأسبوعي والشهري وصدّره عند الحاجة.',
    faqs: [
      { question: 'من يستطيع تسجيل الحضور؟', answer: 'تسجيل الحضور والتعديل متاح لمشرف الشركة فقط، وبقية المستخدمين يشاهدون السجل دون تعديل.' },
      { question: 'كيف أسجّل حالة مدرب في اليوم؟', answer: 'في تبويب «سجل اليوم» اختر الحالة من أزرار حاضر أو متأخر أو غائب أو انصراف مبكر أمام اسم المدرب، وتُحفظ مباشرة.' },
      { question: 'كيف أسجّل وقت التأخر أو الانصراف المبكر؟', answer: 'عند اختيار «متأخر» يظهر حقل وقت الوصول، وعند «انصراف مبكر» يظهر حقل وقت الانصراف، فاختر الوقت وسيُحفظ.' },
      { question: 'كيف أضيف سببًا أو إثبات عذر؟', answer: 'بعد تسجيل حالة غير «حاضر» اضغط «+ إضافة سبب» واكتب السبب (حتى 500 حرف)، ثم «إثبات» لرفع صورة أو PDF لا يتجاوز 5 ميجابايت.' },
      { question: 'لماذا زر السبب والإثبات معطّل؟', answer: 'يتعطل إذا كانت الحالة «حاضر» أو لم تُسجَّل حالة بعد أو تم تأكيد سجل اليوم أو لم تكن مشرف الشركة.' },
      { question: 'ماذا يحدث عند تأكيد سجل اليوم؟', answer: 'يُحفظ المدربون غير المسجلين كـ«حاضر» افتراضيًا ثم يُقفل السجل ولا يمكن تعديله بعد التأكيد.' },
      { question: 'كيف أبحث عن مدرب معين؟', answer: 'اضغط أيقونة التصفية بجانب عنوان «المدرب» واكتب الاسم أو اختره، ولعرض الجميع اختر «جميع المدربين».' },
      { question: 'ما الذي أراه في السجل الأسبوعي؟', answer: 'يعرض أيام الأحد إلى الخميس للأسبوع الحالي مع رمز حالة كل مدرب ونسبة التزامه وملخص الأسبوع.' },
      { question: 'ماذا تعني رموز الجدول الأسبوعي؟', answer: 'ح = حاضر، ت = متأخر، غ = غائب، م = انصراف مبكر، و«—» يعني لم يُسجّل بعد.' },
      { question: 'كيف أضيف سببًا من السجل الأسبوعي؟', answer: 'في الأسبوع الحالي اضغط «+ سبب / إثبات» تحت حالة التأخر أو الغياب أو الانصراف المبكر، ثم احفظ، ولا يتاح التعديل للأيام المنتهية أسبوعها.' },
      { question: 'كيف أقرأ السجل الشهري؟', answer: 'يعرض معدل التزام الشركة للشهر الحالي، وأسابيع الشهر كقوائم اضغط على أي أسبوع لفتح جدوله.' },
      { question: 'هل أستطيع تعديل الأسباب من السجل الشهري؟', answer: 'لا، السجل الشهري للعرض فقط، ويمكنك الضغط على «عرض السبب / الإثبات» لقراءة السبب وفتح الإثبات.' },
      { question: 'كيف تُحسب نسبة الالتزام؟', answer: 'الحاضر يُحتسب 100% والمتأخر والانصراف المبكر 75% والغائب 0%، ويُؤخذ المتوسط على السجلات المسجلة.' },
      { question: 'كيف أصدّر السجل الأسبوعي أو الشهري؟', answer: 'من أعلى الصفحة اضغط «تصدير السجل الأسبوعي» أو «تصدير السجل الشهري» ثم اختر Excel أو PDF.' },
    ],
    steps: [
      { target: '[data-guide="company-attendance-header"]', title: 'سجل حضور المدربين', description: 'هنا تسجّل وتتابع حضور مدربي شركتك يوميًا وأسبوعيًا وشهريًا.', order: 1 },
      { target: '[data-guide="company-attendance-export"]', title: 'تصدير السجلات', description: 'صدّر السجل الأسبوعي أو الشهري بصيغة Excel أو PDF.', order: 2 },
      { target: '[data-guide="company-attendance-tabs"]', title: 'عرض اليوم والأسبوع والشهر', description: 'بدّل بين سجل اليوم والأسبوعي والشهري. أعد تشغيل الجولة بعد التبديل لتشاهد خطوات كل عرض.', order: 3 },
      { target: '[data-guide="company-attendance-day-stats"]', title: 'ملخص اليوم', description: 'عدد الحاضرين والمتأخرين والغائبين والمنصرفين مبكرًا ونسبة الالتزام.', order: 4 },
      { target: '[data-guide="company-attendance-confirm"]', title: 'تأكيد سجل اليوم', description: 'بعد مراجعة السجل اضغط تأكيد لقفله، ولا يمكن تعديله بعدها.', order: 5 },
      { target: '[data-guide="company-attendance-trainer-filter"]', title: 'تصفية المدربين', description: 'ابحث عن مدرب بالاسم أو اعرض جميع المدربين.', order: 6 },
      { target: '[data-guide="company-attendance-day-table"]', title: 'جدول حضور اليوم', description: 'يعرض كل مدرب مع تخصصه وحالة يومه والسبب وإثبات العذر.', order: 7 },
      { target: '[data-guide="company-attendance-status"]', title: 'حالة اليوم', description: 'اختر حاضر أو متأخر أو غائب أو انصراف مبكر، وحدد الوقت عند التأخر أو الانصراف المبكر.', order: 8 },
      { target: '[data-guide="company-attendance-note"]', title: 'السبب أو الملاحظة', description: 'أضف سبب التأخر أو الغياب أو الانصراف المبكر بعد تسجيل الحالة.', order: 9 },
      { target: '[data-guide="company-attendance-proof"]', title: 'إثبات العذر', description: 'ارفع صورة أو PDF لا يتجاوز 5 ميجابايت، ويمكن حذف الإثبات قبل التأكيد.', order: 10 },
      { target: '[data-guide="company-attendance-week-summary"]', title: 'ملخص الأسبوع', description: 'أعداد الحالات ونسبة الالتزام للأسبوع الحالي.', order: 11 },
      { target: '[data-guide="company-attendance-week-legend"]', title: 'رموز الحالات', description: 'ح حاضر، ت متأخر، غ غائب، م انصراف مبكر، و«—» لم يُسجّل.', order: 12 },
      { target: '[data-guide="company-attendance-week-table"]', title: 'الجدول الأسبوعي', description: 'حالة كل مدرب من الأحد إلى الخميس مع نسبة الالتزام، واضغط «+ سبب / إثبات» لإضافة السبب.', order: 13 },
      { target: '[data-guide="company-attendance-month-summary"]', title: 'معدل الالتزام الشهري', description: 'نسبة التزام الشركة للشهر الحالي.', order: 14 },
      { target: '[data-guide="company-attendance-month-weeks"]', title: 'أسابيع الشهر', description: 'يُقسَّم الشهر إلى أسابيع، واضغط على أي أسبوع لعرض جدوله.', order: 15 },
      { target: '[data-guide="company-attendance-month-toggle"]', title: 'فتح أسبوع', description: 'اضغط عنوان الأسبوع لعرض الجدول، وللأسباب والإثباتات اضغط «عرض السبب / الإثبات» للقراءة فقط.', order: 16 },
    ],
  },
  
  'quiz-results': {
    pageKey: 'quiz-results',
    title: 'نتائج الاختبارات',
    description: 'متابعة نتائج اختبارات المتدربين في البرنامج، وتحليل درجاتهم ومعرفة المتفوقين والمتعثرين.',
    faqs: [
      {
        question: 'كيف أبحث عن نتيجة متدرب أو اختبار؟',
        answer: 'اكتب اسم المتدرب أو الاختبار في حقل البحث، وستظهر النتائج المطابقة.'
      },
      {
        question: 'كيف أحدد نتائج فترة زمنية معينة؟',
        answer: 'استخدم حقلي تاريخ تسليم الاختبار من وإلى لتحديد الفترة المطلوبة.'
      },
      {
        question: 'كيف أعرف أفضل المتدربين؟',
        answer: 'راجع قسم «أفضل المتدربين» الذي يرتب المتدربين حسب متوسط نتائج محاولات اختباراتهم.'
      },
      {
        question: 'من هم المتدربون المتعثرون؟',
        answer: 'هم المتدربون الذين يقل متوسط نتائج اختباراتهم عن 60%.'
      },
      {
        question: 'لماذا لا تظهر أي نتائج؟',
        answer: 'قد لا تكون هناك اختبارات تم تسليمها بعد، أو قد لا توجد نتائج مطابقة للفلاتر الحالية. جرّب إعادة ضبط الفلاتر.'
      },
      {
        question: 'هل النتائج المعروضة هي تقييمات المتدربين؟',
        answer: 'لا، هذه الصفحة تعرض نتائج محاولات الاختبارات المسجلة، وليست تقييمات الأداء أو الحضور.'
      }
    ],
    steps: [
      {
        target: '[data-guide="company-quiz-results-header"]',
        title: 'نتائج الاختبارات',
        description: 'تعرف على البرنامج الحالي وتابع نتائج اختبارات المتدربين فيه.',
        order: 1
      },
      {
        target: '[data-guide="company-quiz-results-stats"]',
        title: 'ملخص النتائج',
        description: 'راجع عدد النتائج والمتدربين أصحاب النتائج ومتوسط درجات الاختبارات.',
        order: 2
      },
      {
        target: '[data-guide="company-quiz-results-top"]',
        title: 'أفضل المتدربين',
        description: 'تعرف على المتدربين أصحاب أعلى متوسط نتائج في الاختبارات.',
        order: 3
      },
      {
        target: '[data-guide="company-quiz-results-at-risk"]',
        title: 'المتدربون المتعثرون',
        description: 'تابع المتدربين الذين يقل متوسط نتائج اختباراتهم عن 60%.',
        order: 4
      },
      {
        target: '[data-guide="company-quiz-results-filters"]',
        title: 'البحث والتصفية',
        description: 'ابحث باسم المتدرب أو الاختبار وحدد تواريخ التسليم، ويمكنك إعادة ضبط الفلاتر.',
        order: 5
      },
      {
        target: '[data-guide="company-quiz-results-list"]',
        title: 'سجل نتائج الاختبارات',
        description: 'استعرض محاولات الاختبارات ودرجات المتدربين وتواريخ التسليم والحالات.',
        order: 6
      }
    ]
  },
  
  warnings: {
    pageKey: 'warnings',
    title: 'إدارة الإنذارات',
    description: 'متابعة الإنذارات الواردة إلى الشركة، والبحث عنها حسب النوع والخطورة والحالة، ومراجعة تفاصيلها وإرسال رد الشركة إلى الإدارة.',

    faqs: [
      {
        question: 'كيف أحدث قائمة الإنذارات؟',
        answer: 'اضغط على زر «تحديث البيانات» أعلى الصفحة لجلب أحدث الإنذارات الواردة إلى الشركة.'
      },
      {
        question: 'كيف أبحث عن إنذار معين؟',
        answer: 'استخدم حقل البحث للعثور على الإنذار باستخدام رقمه أو نوعه أو التفاصيل المرتبطة به.'
      },
      {
        question: 'كيف أصفي الإنذارات؟',
        answer: 'يمكنك اختيار نوع الإنذار أو مستوى الخطورة أو الحالة، ثم الضغط على «مسح الفلاتر» لإظهار جميع الإنذارات.'
      },
      {
        question: 'كيف أعرف حالة الإنذار؟',
        answer: 'تظهر حالة كل إنذار في الجدول، مثل مفتوح أو قيد المراجعة أو تم الحل أو تم التصعيد.'
      },
      {
        question: 'كيف أطلع على تفاصيل الإنذار؟',
        answer: 'اضغط زر «التفاصيل» بجانب الإنذار لعرض نوعه ومستوى خطورته وحالته وتاريخ إصداره وملاحظاته.'
      },
      {
        question: 'كيف أرد على إنذار؟',
        answer: 'افتح تفاصيل الإنذار، ثم اكتب توضيح الشركة في حقل «نص الرد» واضغط «إرسال الرد».'
      },
      {
        question: 'هل أستطيع الاطلاع على رد الشركة السابق؟',
        answer: 'نعم، إذا كان هناك رد محفوظ فسيظهر داخل نافذة تفاصيل الإنذار تحت عنوان «الرد السابق للشركة».'
      },
      {
        question: 'ما الحد الأقصى لطول الرد؟',
        answer: 'يمكن كتابة رد يصل إلى 500 حرف.'
      },
      {
        question: 'لماذا لا تظهر أي إنذارات؟',
        answer: 'قد لا تكون هناك إنذارات واردة للشركة، أو قد لا توجد نتائج مطابقة للفلاتر. جرّب مسح الفلاتر أو تحديث البيانات.'
      }
    ],

    steps: [
      {
        target: '[data-guide="company-warnings-header"]',
        title: 'إدارة الإنذارات',
        description: 'تعرف على صفحة متابعة الإنذارات الواردة إلى الشركة.',
        order: 1
      },
      {
        target: '[data-guide="company-warnings-refresh"]',
        title: 'تحديث البيانات',
        description: 'اضغط هنا لجلب أحدث الإنذارات من النظام.',
        order: 2
      },
      {
        target: '[data-guide="company-warnings-stats"]',
        title: 'إحصائيات الإنذارات',
        description: 'راجع إجمالي الإنذارات والمفتوحة وقيد المراجعة والحرجة.',
        order: 3
      },
      {
        target: '[data-guide="company-warnings-filters"]',
        title: 'البحث والتصفية',
        description: 'ابحث عن الإنذارات وحدد النوع أو مستوى الخطورة أو الحالة.',
        order: 4
      },
      {
        target: '[data-guide="company-warnings-list"]',
        title: 'قائمة الإنذارات',
        description: 'استعرض أرقام الإنذارات وأنواعها ومستويات خطورتها وتواريخ إصدارها وحالاتها.',
        order: 5
      }
    ]
  },
  
  'my-account': {
    pageKey: 'my-account',
    title: 'حسابي',
    description: 'عرض البيانات الشخصية لمشرف الشركة، وتعديل رقم الجوال، ومراجعة الصلاحيات وسجل النشاطات وتصدير بيانات الحساب بصيغة PDF.',

    faqs: [
      {
        question: 'كيف أطلع على بيانات حسابي؟',
        answer: 'افتح تبويب «البيانات الشخصية» لعرض الاسم والبريد الإلكتروني ورقم الجوال والمسمى الوظيفي والقسم والشركة وحالة الحساب.'
      },
      {
        question: 'كيف أعدل رقم الجوال؟',
        answer: 'من تبويب «البيانات الشخصية»، اضغط «تعديل» بجانب رقم الجوال، ثم أدخل الرقم الجديد واضغط «حفظ».'
      },
      {
        question: 'كيف ألغي تعديل رقم الجوال؟',
        answer: 'اضغط «إلغاء» أثناء التعديل للرجوع دون حفظ التغييرات.'
      },
      {
        question: 'هل أستطيع تعديل الاسم أو البريد الإلكتروني؟',
        answer: 'لا، الاسم والبريد الإلكتروني وبقية بيانات الحساب معروضة للقراءة فقط. التعديل المتاح في هذه الصفحة هو رقم الجوال.'
      },
      {
        question: 'كيف أعرف الصلاحيات الممنوحة لي؟',
        answer: 'اضغط تبويب «الصلاحيات الممنوحة» لعرض الصلاحيات المسجلة لحسابك ووصف كل صلاحية.'
      },
      {
        question: 'كيف أراجع سجل نشاطاتي؟',
        answer: 'اضغط تبويب «سجل النشاطات» للاطلاع على الأنشطة والتقييمات الأخيرة وسجل النظام.'
      },
      {
        question: 'كيف أحذف نشاطًا من القائمة؟',
        answer: 'من تبويب «سجل النشاطات»، اضغط علامة × بجانب النشاط لإزالته من القائمة المعروضة.'
      },
      {
        question: 'كيف أصدر بيانات حسابي إلى PDF؟',
        answer: 'اضغط زر «تصدير PDF» أعلى الصفحة لإنشاء ملف PDF من بيانات الحساب.'
      },
      {
        question: 'لماذا لا تظهر بيانات الحساب؟',
        answer: 'قد تكون البيانات قيد التحميل أو حدث خطأ في الاتصال بالخادم. عند ظهور رسالة خطأ، اضغط «إعادة المحاولة».'
      }
    ],

    steps: [
      {
        target: '[data-guide="company-account-header"]',
        title: 'صفحة حسابي',
        description: 'تعرف على صفحة إدارة بياناتك الشخصية وصلاحياتك وسجل نشاطاتك.',
        order: 1
      },
      {
        target: '[data-guide="company-account-export"]',
        title: 'تصدير PDF',
        description: 'استخدم هذا الزر لتصدير بيانات الحساب بصيغة PDF.',
        order: 2
      },
      {
        target: '[data-guide="company-account-profile"]',
        title: 'بطاقة المستخدم',
        description: 'راجع اسمك ومسمّاك الوظيفي وشركتك ورقم المشرف وحالة الحساب والصلاحيات الرئيسية.',
        order: 3
      },
      {
        target: '[data-guide="company-account-tabs"]',
        title: 'تبويبات الحساب',
        description: 'تنقل بين البيانات الشخصية والصلاحيات الممنوحة وسجل النشاطات. أعد تشغيل الجولة بعد تغيير التبويب لاستعراض محتواه.',
        order: 4
      },
      {
        target: '[data-guide="company-account-info"]',
        title: 'البيانات الشخصية',
        description: 'راجع معلومات حسابك، ويمكنك تعديل رقم الجوال وحفظ التغييرات من هذا القسم.',
        order: 5
      },
      {
        target: '[data-guide="company-account-permissions"]',
        title: 'الصلاحيات الممنوحة',
        description: 'استعرض الصلاحيات المسجلة لحسابك ووصف كل صلاحية.',
        order: 6
      },
      {
        target: '[data-guide="company-account-activities"]',
        title: 'سجل النشاطات',
        description: 'راجع التقييمات والأنشطة الأخيرة وسجل النظام.',
        order: 7
      }
    ]
  },


};
