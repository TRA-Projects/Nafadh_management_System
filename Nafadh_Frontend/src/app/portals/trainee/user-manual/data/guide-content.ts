
import { GuidePage } from '../models/guide.models';

export const GUIDE_CONTENT: Record<string, GuidePage> = {
  dashboard: {
    pageKey: 'dashboard',
    title: 'الرئيسية',
    description: 'تابعي ملخص التدريب وأهم التحديثات والمهام من مكان واحد.',
    faqs: [
      {
        question: 'ما الذي تعرضه الصفحة الرئيسية؟',
        answer: 'تعرض ملخص المعلومات والتحديثات المتاحة في بوابة المتدرب.',
      },
      {
        question: 'أين أجد بقية خدمات البوابة؟',
        answer: 'استخدمي القائمة الجانبية للانتقال إلى صفحات البوابة المختلفة.',
      },
    ],
    steps: [
      {
        target: '[data-guide="dashboard-summary"]',
        title: 'ملخص التدريب',
        description: 'راجعي المعلومات الملخصة المعروضة في هذه المنطقة.',
        order: 1,
      },
    ],
  },

  profile: {
    pageKey: 'profile',
    title: 'الملف الشخصي',
    description: 'راجعي بياناتك الشخصية والمعلومات المسجلة في حسابك.',
    faqs: [
      {
        question: 'كيف أراجع بياناتي؟',
        answer: 'افتحي صفحة الملف الشخصي وراجعي البيانات المعروضة.',
      },
    ],
    steps: [
      {
        target: '[data-guide="profile-info"]',
        title: 'بيانات الملف الشخصي',
        description: 'راجعي معلومات حسابك من هذه المنطقة.',
        order: 1,
      },
    ],
  },

  program: {
    pageKey: 'program',
    title: 'البرنامج التدريبي',
    description: 'استعرضي البرنامج التدريبي والدروس والمواد المتاحة.',
    faqs: [
      {
        question: 'أين أجد محتوى البرنامج؟',
        answer: 'افتحي صفحة البرنامج التدريبي واستعرضي المحتوى المتاح لك.',
      },
    ],
    steps: [
      {
        target: '[data-guide="training-program"]',
        title: 'محتوى البرنامج',
        description: 'من هنا يمكنك استعراض عناصر البرنامج المتاحة.',
        order: 1,
      },
    ],
  },

  tasks: {
    pageKey: 'tasks',
    title: 'المهام والمشاريع',
    description: 'راجعي المهام ومواعيد التسليم وحالة الإنجاز.',
    faqs: [
      {
        question: 'أين أجد المهام المطلوبة؟',
        answer: 'من صفحة المهام والمشاريع، راجعي تفاصيل المهام المتاحة.',
      },
      {
        question: 'كيف أتابع موعد التسليم؟',
        answer: 'راجعي تاريخ التسليم الموضح في تفاصيل المهمة.',
      },
    ],
    steps: [
      {
        target: '[data-guide="tasks-list"]',
        title: 'قائمة المهام',
        description: 'استعرضي المهام وحالة كل مهمة من هنا.',
        order: 1,
      },
    ],
  },

  attendance: {
    pageKey: 'attendance',
    title: 'الحضور',
    description: 'راجعي سجلات الحضور والغياب والتأخيرات المسجلة.',
    faqs: [
      {
        question: 'كيف أراجع سجل الحضور؟',
        answer: 'افتحي صفحة الحضور وراجعي السجلات المتاحة.',
      },
    ],
    steps: [
      {
        target: '[data-guide="attendance-records"]',
        title: 'سجل الحضور',
        description: 'راجعي سجلات حضورك المعروضة في الصفحة.',
        order: 1,
      },
    ],
  },

  notifications: {
    pageKey: 'notifications',
    title: 'التنبيهات',
    description: 'تابعي الإشعارات والتحديثات الواردة إلى حسابك.',
    faqs: [
      {
        question: 'أين أجد التنبيهات؟',
        answer: 'ستجدين التنبيهات المتاحة في صفحة التنبيهات.',
      },
    ],
    steps: [
      {
        target: '[data-guide="notifications-list"]',
        title: 'قائمة التنبيهات',
        description: 'راجعي التنبيهات والتفاصيل المتاحة لكل تنبيه.',
        order: 1,
      },
    ],
  },

  support: {
    pageKey: 'support',
    title: 'التواصل والمراسلات',
    description: 'استخدمي صفحة التواصل للوصول إلى قنوات الدعم المتاحة.',
    faqs: [
      {
        question: 'كيف أتواصل مع جهة الدعم؟',
        answer: 'راجعي خيارات التواصل المتاحة في صفحة الدعم.',
      },
    ],
    steps: [
      {
        target: '[data-guide="support-options"]',
        title: 'خيارات التواصل',
        description: 'استعرضي قنوات التواصل المتاحة لك.',
        order: 1,
      },
    ],
  },

  achievements: {
    pageKey: 'achievements',
    title: 'الإنجازات والشهادات',
    description: 'راجعي الإنجازات والتقييمات والشهادات المتاحة لك.',
    faqs: [
      {
        question: 'أين أجد إنجازاتي؟',
        answer: 'افتحي صفحة الإنجازات والشهادات لمراجعة البيانات المتاحة.',
      },
    ],
    steps: [
      {
        target: '[data-guide="achievements-list"]',
        title: 'الإنجازات',
        description: 'راجعي الإنجازات والتقييمات المعروضة في هذه الصفحة.',
        order: 1,
      },
    ],
  },
};
