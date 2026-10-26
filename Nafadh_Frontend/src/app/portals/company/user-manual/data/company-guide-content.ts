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
};
