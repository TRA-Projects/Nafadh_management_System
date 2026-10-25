
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs;

// Trainer Portal - Survey creation and update request.
public sealed class CreateTrainerSessionSurveyDto
{
    [Required]
    [StringLength(300, MinimumLength = 5)]
    public string Question { get; set; } =
        "How would you rate this session?";

    public bool IsPublished { get; set; } = true;
}

// Trainer Portal - Trainee rating and feedback.
public sealed class SubmitSessionSurveyDto
{
    [Range(1, 5)]
    public int Rating { get; set; }

    [MaxLength(1000)]
    public string? Comment { get; set; }
}

// Trainer Portal - Individual survey response.
public sealed record TrainerSurveyResponseDto(
    int TraineeId,
    int Rating,
    string? Comment,
    DateTime SubmittedAtUtc
);

// Trainer Portal - Survey statistics for the trainer.
public sealed record TrainerSurveyReportDto(
    int SurveyId,
    int SessionId,
    string Question,
    bool IsPublished,
    int EnrolledCount,
    int ResponseCount,
    decimal ResponseRatePercent,
    decimal? AverageRating,
    IReadOnlyList<TrainerSurveyResponseDto> Responses
);
