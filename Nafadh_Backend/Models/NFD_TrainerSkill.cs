
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Nafadh_Backend.Models
{
    public class NFD_TrainerSkill
    {
        [Key]
        public int TrainerSkillId { get; set; }

        public int TrainerId { get; set; }

        [Required]
        [MaxLength(200)]
        public string SkillName { get; set; } = string.Empty;

        [ForeignKey(nameof(TrainerId))]
        public NFD_Trainer Trainer { get; set; } = null!;
    }
}
