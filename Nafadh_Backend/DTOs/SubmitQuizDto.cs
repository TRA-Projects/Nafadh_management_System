using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class SubmitQuizDto
    {
        [Required]
        public int AttemptId { get; set; }
    }
}
