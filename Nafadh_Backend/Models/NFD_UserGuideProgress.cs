namespace Nafadh_Backend.Models
{
    public class NFD_UserGuideProgress
    {
        public int ProgressId { get; set; }

        public int TraineeId { get; set; }

        public string GuideKey { get; set; } = string.Empty;

        public string Status { get; set; } = string.Empty;

        public DateTime UpdatedAt { get; set; }
    }
}