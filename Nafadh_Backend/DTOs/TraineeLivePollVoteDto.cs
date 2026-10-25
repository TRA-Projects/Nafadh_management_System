
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    // Trainee Portal - Submit a vote in a live poll.
    public class TraineeLivePollVoteDto
    {
        [Range(1, int.MaxValue)]
        public int OptionId { get; set; }
    }
}
