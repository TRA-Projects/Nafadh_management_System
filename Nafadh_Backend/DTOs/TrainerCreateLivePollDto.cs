
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    // Trainer Portal - Create a live poll during a session.
    public class TrainerCreateLivePollDto
    {
        [Required]
        [MaxLength(300)]
        public string Question { get; set; } = string.Empty;

        [Required]
        [MinLength(2)]
        public List<string> Options { get; set; } = new();
    }
}
