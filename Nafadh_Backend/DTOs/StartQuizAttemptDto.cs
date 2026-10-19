using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class StartQuizAttemptDto
    {
        [Required]
        public int QuizId { get; set; }

        [Required]
        public int TraineeId { get; set; }

        // موافقة المتدرب على تشغيل الكاميرا (مطلوبة إذا كان الاختبار يتطلب كاميرا)
        public bool CameraConsent { get; set; }

        // Passed / Failed / Skipped (نتيجة فحص الهوية على الواجهة)
        public string? IdentityCheckStatus { get; set; }
    }
}
