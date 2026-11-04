namespace Nafadh_Backend.Services;

/// <summary>
/// Generated from the ORIGINAL Training SystemCatalogSeedData (37 groups) and
/// Management's reference enum inventory (47 groups). This catalog supplies
/// group metadata only: values always come from Training API / database.
/// New groups require updating this curated list or an approved upstream API.
/// </summary>
public static class TrainingConstantsCatalog
{
    /// <param name="ReadOnly">No writes at all (Training/legacy catalogs outside Nafadh stay as before).</param>
    /// <param name="LabelsOnly">Nafadh enum groups where only the display labels may change.
    /// Their stored activation flag is preserved, including for inactive historical values.</param>
    public sealed record Group(string Code, string LabelEn, string LabelAr, bool ReadOnly, bool LabelsOnly = false)
    {
        public bool CanEditLabels => !ReadOnly;
        public bool CanChangeActive => CanEditLabels && !LabelsOnly;
        // Low is the CLR default; Medium is the existing trainer/company form default.
        public IReadOnlyList<string>? ActivationKeys => Code == "NFD_TSK_PRI" ? ["High", "Critical"] : null;
        public bool CanChangeActiveFor(string key) => CanChangeActive && (ActivationKeys?.Contains(key) ?? true);
        public bool CanCreate => CanEditLabels && !Code.StartsWith("NFD_", StringComparison.OrdinalIgnoreCase);
    }

    public static Group? Find(string code) => ByCode.GetValueOrDefault(code);

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
        new("NFD_ANN_SCOPE", "Announcement Scope Type", "نطاق الإعلان", false, true),
        new("NFD_ATT_STAT", "Attendance Status", "حالة الحضور", true),
        new("NFD_BAT_STAT", "Batch Status", "حالة الدفعة", true),
        new("NFD_BDG_COND", "Badge Condition Type", "شرط منح الشارة", false, true),
        new("NFD_CMP_STAT", "Company Status", "حالة الشركة", false, true),
        new("NFD_CNV_TYPE", "Conversation Type", "نوع المحادثة", true),
        new("NFD_CPA_STAT", "Course Plan Approval Status", "حالة اعتماد خطة الدورة", false, true),
        new("NFD_CPE_STAT", "Course Plan Execution Status", "حالة تنفيذ خطة الدورة", false, true),
        new("NFD_CPI_TYPE", "Course Plan Item Type", "نوع عنصر خطة الدورة", false, true),
        new("NFD_CPP_STAT", "Course Plan Progress Status", "حالة تقدم خطة الدورة", false, true),
        new("NFD_CRT_TYPE", "Certificate Type", "نوع الشهادة", true),
        new("NFD_ENR_STAT", "Enrollment Completion Status", "حالة إكمال الالتحاق", true),
        new("NFD_EVL_PER", "Evaluation Period", "فترة التقييم", false, true),
        new("NFD_EVL_TYPE", "Evaluation Type", "نوع التقييم", false),
        new("NFD_EXC_STAT", "Excuse Status", "حالة العذر", true),
        new("NFD_EXT_ACT", "Exit Limit Action", "إجراء تجاوز حد الخروج", false, true),
        new("NFD_FBK_TYPE", "Feedback Type", "نوع التغذية الراجعة", false, true),
        new("NFD_FIL_TYPE", "File Type", "نوع الملف", false, true),
        new("NFD_MOD_STAT", "Module Progress Status", "حالة تقدم الوحدة", false, true),
        new("NFD_MSG_STAT", "Message Status", "حالة الرسالة", false, true),
        new("NFD_PAY_STAT", "Payment Status", "حالة الدفع", false, true),
        new("NFD_PJT_ROLE", "Project Member Role", "دور عضو المشروع", false, true),
        new("NFD_PJT_STAT", "Project Status", "حالة المشروع", true),
        new("NFD_PRG_STAT", "Program Status", "حالة البرنامج", false, true),
        new("NFD_PYS_STAT", "Payment Schedule Status", "حالة جدول الدفع", false, true),
        new("NFD_QIZ_STAT", "Quiz Status", "حالة الاختبار", true),
        new("NFD_QUE_DIFF", "Question Difficulty", "صعوبة السؤال", false),
        new("NFD_QUE_TYPE", "Quiz Question Type", "نوع سؤال الاختبار", false, true),
        new("NFD_REM_STAT", "Remediation Status", "حالة المعالجة", false, true),
        new("NFD_RPT_TYPE", "Report Type", "نوع التقرير", false, true),
        new("NFD_SES_STAT", "Session Status", "حالة الجلسة", true),
        new("NFD_SUB_STAT", "Submission Status", "حالة التسليم", true),
        new("NFD_SUP_STAT", "Supervisor Status", "حالة المشرف", true),
        new("NFD_TAT_STAT", "Trainer Attendance Status", "حالة حضور المدرب", true),
        new("NFD_TIC_STAT", "Support Ticket Status", "حالة تذكرة الدعم", false, true),
        new("NFD_TRE_STAT", "Trainee Status", "حالة المتدرب", true),
        new("NFD_TRK_STAT", "Track Status", "حالة المسار", false, true),
        new("NFD_TRN_STAT", "Trainer Status", "حالة المدرب", true),
        new("NFD_TSK_PRI", "Task Priority", "أولوية المهمة", false),
        new("NFD_TSK_STAT", "Task Status", "حالة المهمة", true),
        new("NFD_USR_STAT", "User Status", "حالة المستخدم", false, true),
        new("NFD_VER_STAT", "Verification Status", "حالة التحقق", false, true),
        new("NFD_WDR_STAT", "Withdrawal Request Status", "حالة طلب الانسحاب", false, true),
        new("NFD_WRN_LVL", "Warning Level", "مستوى الإنذار", false, true),
        new("NFD_WRN_SCOPE", "Warning Scope", "نطاق الإنذار", false, true),
        new("NFD_WRN_STAT", "Warning Status", "حالة الإنذار", true),
        new("NFD_WRN_TYPE", "Warning Type", "نوع الإنذار", false),
    };

    private static readonly IReadOnlyDictionary<string, Group> ByCode =
        Groups.ToDictionary(x => x.Code, StringComparer.OrdinalIgnoreCase);

    public static bool IsKnown(string code) => ByCode.ContainsKey(code ?? string.Empty);

    /// <summary>Nafadh enum-backed groups: keys are fixed by C# enums, labels are editable.</summary>
    public static bool IsManagedNafadh(string code) =>
        (code ?? string.Empty).StartsWith("NFD_", StringComparison.OrdinalIgnoreCase) && IsKnown(code);

    public static bool IsLabelsOnly(string code) =>
        ByCode.TryGetValue(code ?? string.Empty, out var group) && group.LabelsOnly;

    public static bool IsReadOnly(string code) =>
        ByCode.TryGetValue(code ?? string.Empty, out var group) && group.ReadOnly;
}
