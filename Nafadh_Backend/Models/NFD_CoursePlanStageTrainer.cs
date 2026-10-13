namespace Nafadh_Backend.Models
{
    /// <summary>
    /// Additive many-to-many assignment between a course-plan stage and trainers.
    /// Existing single TrainerId on the stage remains for backward compatibility.
    /// </summary>
    public class NFD_CoursePlanStageTrainer
    {
        public int StageId { get; set; }
        public int TrainerId { get; set; }

        public NFD_CoursePlanStage Stage { get; set; } = null!;
        public NFD_Trainer Trainer { get; set; } = null!;
    }
}
