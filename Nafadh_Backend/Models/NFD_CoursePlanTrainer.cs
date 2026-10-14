using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.Models
{
    /// <summary>
    /// Additive many-to-many assignment between a company course plan and its trainers.
    /// Existing single TrainerId fields remain for backward compatibility.
    /// </summary>
    public class NFD_CoursePlanTrainer
    {
        public int PlanId { get; set; }
        public int TrainerId { get; set; }

        public NFD_CoursePlan Plan { get; set; } = null!;
        public NFD_Trainer Trainer { get; set; } = null!;
    }
}
