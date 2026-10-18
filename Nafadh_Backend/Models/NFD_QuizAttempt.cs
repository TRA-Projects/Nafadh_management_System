using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.Models
{
    public class NFD_QuizAttempt
    {
        [Key]
        public int AttemptId { get; set; }

        public int QuizId { get; set; }

        public int TraineeId { get; set; }

        public int AttemptNumber { get; set; } = 1;

        public DateTime StartedAt { get; set; }

        public DateTime? SubmittedAt { get; set; }

        public decimal Score { get; set; }

        public decimal Percentage { get; set; }
        // عدد مرات خروج المتدرب من صفحة الاختبار
        public int ViolationCount { get; set; } = 0;

        // هل انتهت المحاولة بسبب المخالفات؟
        public bool IsTerminatedByViolation { get; set; } = false;

        // Started / InProgress / Submitted / Expired
        [MaxLength(30)]
        public string Status { get; set; } = "Started";

        public DateTime CreatedAt { get; set; }
            = DateTime.UtcNow;
        public NFD_Quiz Quiz { get; set; } = null!;

        public NFD_Trainee Trainee { get; set; } = null!;

        public ICollection<NFD_AttemptQuestion> AttemptQuestions { get; set; }
            = new List<NFD_AttemptQuestion>();

    }
}
