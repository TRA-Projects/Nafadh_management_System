using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.Models
{
    public class NFD_TraineeSkill
    {
        [Key]
        public int TraineeSkillId { get; set; }

        public int TraineeId { get; set; }

        public string SkillName { get; set; }

        public string? SerialNumber { get; set; }

        public string? CertificateUrl { get; set; }

        public NFD_Trainee Trainee { get; set; }
    }
}
