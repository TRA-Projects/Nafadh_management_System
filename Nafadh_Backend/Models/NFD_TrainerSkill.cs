
namespace Nafadh_Backend.Models
{
    public class NFD_TrainerSkill
    {
        public int TrainerSkillId { get; set; }
        public int TrainerId { get; set; }
        public string SkillName { get; set; } = string.Empty;

        public NFD_Trainer Trainer { get; set; } = null!;
    }
}
