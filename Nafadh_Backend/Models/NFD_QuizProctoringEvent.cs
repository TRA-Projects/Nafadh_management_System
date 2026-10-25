using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.Models
{
    // حدث مراقبة أثناء الاختبار (للمراجعة البشرية فقط - لا يُستخدم كإدانة تلقائية)
    public class NFD_QuizProctoringEvent
    {
        [Key]
        public int EventId { get; set; }

        public int AttemptId { get; set; }

        // CameraStarted / CameraLost / CameraRestored / NoFaceDetected /
        // MultipleFaces / IdentityVerified / IdentityMismatch / Snapshot
        [Required, MaxLength(40)]
        public string EventType { get; set; } = string.Empty;

        [MaxLength(500)]
        public string? Details { get; set; }

        // اسم ملف اللقطة (يُخزَّن خارج wwwroot ولا يُعرض إلا عبر endpoint محمي)
        [MaxLength(100)]
        public string? SnapshotFileName { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public NFD_QuizAttempt Attempt { get; set; } = null!;
    }
}