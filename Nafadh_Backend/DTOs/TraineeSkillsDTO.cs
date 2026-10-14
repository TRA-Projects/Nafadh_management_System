using Microsoft.AspNetCore.Http;

namespace Nafadh_Backend.DTOs
{
    public class TraineeSkillInputDTO
    {
        public int TraineeId { get; set; }

        public string SkillName { get; set; }

        public string? SerialNumber { get; set; }

        public IFormFile? CertificateFile { get; set; }
    }

    public class TraineeSkillOutputDTO
    {
        public int TraineeSkillId { get; set; }

        public int TraineeId { get; set; }

        public string SkillName { get; set; }

        public string? SerialNumber { get; set; }

        public string? CertificateUrl { get; set; }
    }
}