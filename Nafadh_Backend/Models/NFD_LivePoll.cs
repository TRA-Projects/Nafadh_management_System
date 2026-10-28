
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.Models
{
    // Trainer Portal - Live polls during a classroom session.
    // Separate from post-session surveys.
    public class NFD_LivePoll
    {
        [Key]
        public int PollId { get; set; }

        public int SessionId { get; set; }
        public NFD_Session Session { get; set; } = null!;

        [Required]
        [MaxLength(300)]
        public string Question { get; set; } = string.Empty;

        // Trainer controls when voting is available.
        public bool IsOpen { get; set; } = false;

        public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

        public DateTime? ClosedAtUtc { get; set; }

        public ICollection<NFD_LivePollOption> Options { get; set; }
            = new List<NFD_LivePollOption>();

        public ICollection<NFD_LivePollVote> Votes { get; set; }
            = new List<NFD_LivePollVote>();
    }

    // Trainer Portal - Available answers for each live poll.
    public class NFD_LivePollOption
    {
        [Key]
        public int OptionId { get; set; }

        public int PollId { get; set; }
        public NFD_LivePoll Poll { get; set; } = null!;

        [Required]
        [MaxLength(200)]
        public string OptionText { get; set; } = string.Empty;

        public int SortOrder { get; set; }

        public ICollection<NFD_LivePollVote> Votes { get; set; }
            = new List<NFD_LivePollVote>();
    }

    // Trainer Portal - One vote per trainee for each poll.
    public class NFD_LivePollVote
    {
        [Key]
        public int VoteId { get; set; }

        public int PollId { get; set; }
        public NFD_LivePoll Poll { get; set; } = null!;

        public int OptionId { get; set; }
        public NFD_LivePollOption Option { get; set; } = null!;

        public int TraineeId { get; set; }
        public NFD_Trainee Trainee { get; set; } = null!;

        public DateTime SubmittedAtUtc { get; set; } = DateTime.UtcNow;
    }
}
