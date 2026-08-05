using System.ComponentModel.DataAnnotations;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{

    // ── Add Submission DTO ─────────────────────────────────────────
    public class AddSubmissionDto
    {

        [MaxLength(300)]
        public string? FileUrl { get; set; }


        [Required(ErrorMessage = "Task Id is required.")]
        public int TaskId { get; set; }


        [Required(ErrorMessage = "Trainee Id is required.")]
        public int TraineeId { get; set; }

    }





    // ── Grade Submission DTO ─────────────────────────────────────────
    public class GradeSubmissionDto
    {

        [Required(ErrorMessage = "Grade is required.")]
        [MaxLength(20)]
        public string Grade { get; set; } = string.Empty;



        public string? Feedback { get; set; }

    }





    // ── Response Submission DTO ─────────────────────────────────────────
    public class SubmissionResponseDto
    {

        public int SubmissionId { get; set; }


        public string? FileUrl { get; set; }


        public DateTime SubmittedAt { get; set; }


        public NFD_SubmissionStatus Status { get; set; }


        public string? Grade { get; set; }


        public string? Feedback { get; set; }


        public int TaskId { get; set; }


        public int TraineeId { get; set; }

    }

}