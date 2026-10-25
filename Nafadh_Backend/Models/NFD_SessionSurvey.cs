
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.Models;

// Trainer Portal - Post-session surveys.
// Separate from quizzes and lesson feedback.
public class NFD_SessionSurvey
{
    [Key]
    public int SurveyId { get; set; }

    public int SessionId { get; set; }
    public NFD_Session Session { get; set; } = null!;

    [MaxLength(300)]
    public string Question { get; set; } =
        "How would you rate this session?";

    public bool IsPublished { get; set; }

    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    public ICollection<NFD_SessionSurveyResponse> Responses { get; set; }
        = new List<NFD_SessionSurveyResponse>();
}

// Trainer Portal - Store one rating and comment per trainee.
public class NFD_SessionSurveyResponse
{
    [Key]
    public int ResponseId { get; set; }

    public int SurveyId { get; set; }
    public NFD_SessionSurvey Survey { get; set; } = null!;

    public int TraineeId { get; set; }
    public NFD_Trainee Trainee { get; set; } = null!;

    [Range(1, 5)]
    public int Rating { get; set; }

    [MaxLength(1000)]
    public string? Comment { get; set; }

    public DateTime SubmittedAtUtc { get; set; } = DateTime.UtcNow;
}
