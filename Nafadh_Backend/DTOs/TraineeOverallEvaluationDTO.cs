namespace Nafadh_Backend.DTOs
{
    public class TraineeOverallEvaluationDTO
    {
        public int EnrollmentId { get; set; }
        public int TraineeId { get; set; }

        // نسب العناصر الثلاثة
        public double AttendancePercentage { get; set; }
        public double TasksPercentage { get; set; }
        public double QuizzesPercentage { get; set; }

        // التقييم النهائي
        public double FinalScore { get; set; }
        public string FinalGrade { get; set; } = string.Empty;
    }
}