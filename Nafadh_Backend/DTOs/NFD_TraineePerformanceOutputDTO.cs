namespace Nafadh_Backend.DTOs
{
    public class NFD_TraineePerformanceOutputDTO
    {
        public int TraineeId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string Specialization { get; set; } = string.Empty; // التخصص
        public decimal AttendanceRate { get; set; } // نسبة الحضور
        public decimal TechnicalRate { get; set; }   // التقني
        public decimal BehavioralRate { get; set; }  // السلوكي
        public decimal LevelRate { get; set; }       // المستوى
    }
}