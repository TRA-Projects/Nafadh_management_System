using System;
using System.Collections.Generic;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    public class QuizAttemptDto
    {
        public int AttemptId { get; set; }

        public int QuizId { get; set; }

        public string QuizTitle { get; set; } = string.Empty;

        public int DurationMinutes { get; set; }
        public bool CameraRequired { get; set; }

        public DateTime StartedAt { get; set; }

        public DateTime ExpectedEndAt { get; set; }

        public string Status { get; set; } = string.Empty; // Passed, Failed, NotAttempted, InProgress

        // ==========================================
        // 1. بيانات المتدرب والدرجات (لجدول التدقيق وكشف الدرجات)
        // ==========================================
        public int TraineeId { get; set; }
        public string TraineeName { get; set; } = string.Empty;
        public string CivilId { get; set; } = string.Empty;
        public string? TraineeAvatarUrl { get; set; }

        public DateTime? SubmittedAt { get; set; }
        public decimal? Score { get; set; }
        public decimal MaxScore { get; set; }
        public decimal? Percentage { get; set; }
        public bool IsPassed { get; set; }

        // ==========================================
        // 2. مؤشرات الغش والنزاهة الأكاديمية (Cheating Detection)
        // ==========================================
        public decimal CheatingRiskPercentage { get; set; } // نسبة الشك/الغش (0% إلى 100%)
        public string CheatingStatusText { get; set; } = "نزاهة تامة"; // "نزاهة تامة", "اشتباه بسيط", "اشتباه عالي"
        public int TabSwitchCount { get; set; } // عدد مرات مغادرة تبويب الاختبار
        public int CameraDisconnectionsCount { get; set; } // عدد مرات انقطاع الكاميرا
        public bool MultipleFacesDetected { get; set; } // رصد أكثر من وجه
        public string? ProctoringRemarks { get; set; } // ملاحظات نظام المراقبة

        // ==========================================
        // 3. حالة الغياب وإدارة الأعذار الطبية/الرسمية (Excused Absences)
        // ==========================================
        public string AttendanceStatus { get; set; } = "Attended"; // "Attended", "Absent", "Excused"
        public string? ExcuseReason { get; set; } // نص سبب العذر المرفوع
        public string? ExcuseAttachmentUrl { get; set; } // رابط ملف العذر (صورة أو PDF)
        public string ExcuseStatus { get; set; } = "None"; // "None", "PendingReview", "Approved", "Rejected"
        public string? ExcuseDecisionBy { get; set; } // اسم المعتمد (المدرب أو الإدارة)
        public DateTime? ExcuseDecisionAt { get; set; } // وقت الاعتماد
        public string? ExcuseRejectionReason { get; set; } // سبب الرفض إن وُجد

        // ==========================================
        // 4. ملاحظات المتدرب والمدرب (المشاريع والواجبات والاختبار)
        // ==========================================
        public string? TraineeSubmissionNote { get; set; } // ملاحظة المتدرب على اختباره أو مشروعه
        public string? TrainerFeedback { get; set; } // تغذية راجعة من المدرب

        // أسئلة المحاولة الأصلية
        public List<AttemptQuestionDto> Questions { get; set; } = new();
    }

    public class AttemptQuestionDto
    {
        public int AttemptQuestionId { get; set; }

        public int QuestionId { get; set; }

        public int QuestionOrder { get; set; }

        public string QuestionText { get; set; } = string.Empty;

        public NFD_QuizQuestionType QuestionType { get; set; }

        public decimal Points { get; set; }

        public List<QuestionOptionDto> Options { get; set; } = new();
    }

    // ==========================================
    // 5. DTOs إضافية لزر الاعتماد وأحداث التقويم الشهري
    // ==========================================

    /// <summary>
    /// نموذج استقبال قرار اعتماد أو رفض العذر الطبي
    /// </summary>
    public class ExcuseDecisionRequestDto
    {
        public int AttemptId { get; set; }
        public bool Approve { get; set; } // true = اعتماد العذر, false = رفض العذر
        public string? RejectionReason { get; set; }
    }

    /// <summary>
    /// أحداث التقويم المعتمد للدفعة (جدول الاختبارات + التقييمات الشهرية)
    /// </summary>
    public class BatchCalendarEventDto
    {
        public int EventId { get; set; }
        public int BatchId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Type { get; set; } = "quiz"; // "quiz", "project", "task", "interview"
        public string TypeLabel { get; set; } = "اختبار معتمد";
        public DateTime EventDate { get; set; }
        public string TimeString { get; set; } = string.Empty;
        public int? LinkedQuizId { get; set; }
        public bool IsCompleted { get; set; }
        public string? TraineeSubmissionNote { get; set; }
    }
}