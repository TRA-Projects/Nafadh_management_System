namespace Nafadh_Backend.DTOs
{
    public class TraineeOverallEvaluationDTO
    {
        public int EnrollmentId { get; set; }
        public int TraineeId { get; set; }

        // Evaluation components
        public double AttendancePercentage { get; set; }
        public double TasksPercentage { get; set; }
        public double QuizzesPercentage { get; set; }
        public double ProjectsPercentage { get; set; }

        // Final evaluation
        public double FinalScore { get; set; }
        public string FinalGrade { get; set; } = string.Empty;
    }
}