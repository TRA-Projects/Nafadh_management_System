namespace Nafadh_Backend.Services;

/// <summary>
/// Generated from the ORIGINAL Training SystemCatalogSeedData (37 groups) and
/// Management's reference enum inventory (47 groups). This catalog supplies
/// group metadata only: values always come from Training API / database.
/// New groups require updating this curated list or an approved upstream API.
/// </summary>
public static class TrainingConstantsCatalog
{
    public sealed record Group(string Code, string LabelEn, string LabelAr, bool ReadOnly);

    public static readonly IReadOnlyList<Group> Groups = new List<Group>
    {
        new("OPP_TYPE", "Opportunity type", "نوع الفرصة", false),
        new("APPL_METH", "Application method", "طريقة التقديم", false),
        new("WORK_MODE", "Work mode", "نمط العمل", false),
        new("TGT_GEND", "Target gender", "الجنس المستهدف", false),
        new("INTV_MODE", "Interview mode", "نمط المقابلة", false),
        new("CRDT_STAT", "Credential status", "حالة الاعتماد", false),
        new("EXAM_TYPE", "Exam type", "نوع الاختبار", false),
        new("CRDT_PROV", "Course provider", "مزود الدورة", false),
        new("EDUC_LVL", "Education level", "المستوى التعليمي", false),
        new("QUAL_DEGR", "Qualification degree", "درجة المؤهل", false),
        new("TRNG_TYPE", "Training program type", "نوع برنامج التدريب", false),
        new("STDY_FILDS", "Field of study", "مجال الدراسة", false),
        new("LANG", "Language", "اللغة", false),
        new("TGT_APPL", "Target applicant", "المتقدم المستهدف", false),
        new("DOC_TYPE", "Document file type", "نوع ملف المستند", false),
        new("SAL_DISP", "Salary display", "عرض الراتب", false),
        new("CURR", "Currency", "العملة", false),
        new("PAY_FREQ", "Pay frequency", "تكرار الدفع", false),
        new("BENEF", "Benefit", "المزايا", false),
        new("ALLOW", "Allowance", "البدلات", false),
        new("EDUC_INST", "Educational institution", "المؤسسة التعليمية", false),
        new("NAT", "Nationality", "الجنسية", false),
        new("PRIM_SPEC", "Primary specification", "التخصص الرئيسي", false),
        new("CONT_TYPE", "Contract type", "نوع العقد", false),
        new("OFFR_RJCT", "Offer rejection reason", "سبب رفض العرض", false),
        new("RJCT_RSN", "Interview rejection reason", "سبب رفض المقابلة", false),
        new("RJCT_SUB", "Interview rejection sub-reason", "سبب فرعي لرفض المقابلة", false),
        new("NSHW_RSN", "Interview no-show reason", "سبب عدم الحضور للمقابلة", false),
        new("RSCH_RSN", "Interview reschedule reason", "سبب إعادة جدولة المقابلة", false),
        new("WRK_SCOPE", "Opportunity field / Work scope", "مجال الفرصة / نطاقات العمل", false),
        new("JOB_CAT", "Job category (legacy)", "فئة الوظيفة (قديم)", false),
        new("OFFR_ENTY", "Offer entity", "جهة العرض", false),
        new("AOFF_RJCT", "Assessment offer rejection reason", "سبب رفض عرض التقييم", false),
        new("AOFF_SUB", "Assessment offer rejection sub-reason", "سبب فرعي لرفض عرض التقييم", false),
        new("WD_RSN", "Withdrawal reason category", "فئة سبب الانسحاب", false),
        new("BEHV", "Behavior", "السلوك", false),
        new("ATA_RJCT", "Ask-to-apply rejection reason", "سبب رفض طلب التقديم", false),
        new("NFD_ANN_SCOPE", "Announcement Scope Type", "نطاق الإعلان", true),
        new("NFD_ATT_STAT", "Attendance Status", "حالة الحضور", true),
        new("NFD_BAT_STAT", "Batch Status", "حالة الدفعة", true),
        new("NFD_BDG_COND", "Badge Condition Type", "شرط منح الشارة", true),
        new("NFD_CMP_STAT", "Company Status", "حالة الشركة", true),
        new("NFD_CNV_TYPE", "Conversation Type", "نوع المحادثة", true),
        new("NFD_CPA_STAT", "Course Plan Approval Status", "حالة اعتماد خطة الدورة", true),
        new("NFD_CPE_STAT", "Course Plan Execution Status", "حالة تنفيذ خطة الدورة", true),
        new("NFD_CPI_TYPE", "Course Plan Item Type", "نوع عنصر خطة الدورة", true),
        new("NFD_CPP_STAT", "Course Plan Progress Status", "حالة تقدم خطة الدورة", true),
        new("NFD_CRT_TYPE", "Certificate Type", "نوع الشهادة", true),
        new("NFD_ENR_STAT", "Enrollment Completion Status", "حالة إكمال الالتحاق", true),
        new("NFD_EVL_PER", "Evaluation Period", "فترة التقييم", true),
        new("NFD_EVL_TYPE", "Evaluation Type", "نوع التقييم", true),
        new("NFD_EXC_STAT", "Excuse Status", "حالة العذر", true),
        new("NFD_EXT_ACT", "Exit Limit Action", "إجراء تجاوز حد الخروج", true),
        new("NFD_FBK_TYPE", "Feedback Type", "نوع التغذية الراجعة", true),
        new("NFD_FIL_TYPE", "File Type", "نوع الملف", true),
        new("NFD_MOD_STAT", "Module Progress Status", "حالة تقدم الوحدة", true),
        new("NFD_MSG_STAT", "Message Status", "حالة الرسالة", true),
        new("NFD_PAY_STAT", "Payment Status", "حالة الدفع", true),
        new("NFD_PJT_ROLE", "Project Member Role", "دور عضو المشروع", true),
        new("NFD_PJT_STAT", "Project Status", "حالة المشروع", true),
        new("NFD_PRG_STAT", "Program Status", "حالة البرنامج", true),
        new("NFD_PYS_STAT", "Payment Schedule Status", "حالة جدول الدفع", true),
        new("NFD_QIZ_STAT", "Quiz Status", "حالة الاختبار", true),
        new("NFD_QUE_DIFF", "Question Difficulty", "صعوبة السؤال", true),
        new("NFD_QUE_TYPE", "Quiz Question Type", "نوع سؤال الاختبار", true),
        new("NFD_REM_STAT", "Remediation Status", "حالة المعالجة", true),
        new("NFD_RPT_TYPE", "Report Type", "نوع التقرير", true),
        new("NFD_SES_STAT", "Session Status", "حالة الجلسة", true),
        new("NFD_SUB_STAT", "Submission Status", "حالة التسليم", true),
        new("NFD_SUP_STAT", "Supervisor Status", "حالة المشرف", true),
        new("NFD_TAT_STAT", "Trainer Attendance Status", "حالة حضور المدرب", true),
        new("NFD_TIC_STAT", "Support Ticket Status", "حالة تذكرة الدعم", true),
        new("NFD_TRE_STAT", "Trainee Status", "حالة المتدرب", true),
        new("NFD_TRK_STAT", "Track Status", "حالة المسار", true),
        new("NFD_TRN_STAT", "Trainer Status", "حالة المدرب", true),
        new("NFD_TSK_PRI", "Task Priority", "أولوية المهمة", true),
        new("NFD_TSK_STAT", "Task Status", "حالة المهمة", true),
        new("NFD_USR_STAT", "User Status", "حالة المستخدم", true),
        new("NFD_VER_STAT", "Verification Status", "حالة التحقق", true),
        new("NFD_WDR_STAT", "Withdrawal Request Status", "حالة طلب الانسحاب", true),
        new("NFD_WRN_LVL", "Warning Level", "مستوى الإنذار", true),
        new("NFD_WRN_SCOPE", "Warning Scope", "نطاق الإنذار", true),
        new("NFD_WRN_STAT", "Warning Status", "حالة الإنذار", true),
        new("NFD_WRN_TYPE", "Warning Type", "نوع الإنذار", true),
    };

    private static readonly IReadOnlyDictionary<string, Group> ByCode =
        Groups.ToDictionary(x => x.Code, StringComparer.OrdinalIgnoreCase);

    public static bool IsKnown(string code) => ByCode.ContainsKey(code ?? string.Empty);

    public static bool IsReadOnly(string code) =>
        ByCode.TryGetValue(code ?? string.Empty, out var group) && group.ReadOnly;
}
