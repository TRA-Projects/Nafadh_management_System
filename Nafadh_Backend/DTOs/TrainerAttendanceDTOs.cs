using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    // A trainer that works with the company (through the company's batches).
    public class CompanyTrainerDto
    {
        public int TrainerId { get; set; }
        public string? FullName { get; set; }
        public string? Specialty { get; set; }
        public string? ProfileImageUrl { get; set; }
        public NFD_TrainerStatus Status { get; set; }
    }

    public class TrainerAttendanceDto
    {
        public int TrainerAttendanceId { get; set; }
        public int CompanyId { get; set; }
        public int TrainerId { get; set; }
        public string? TrainerName { get; set; }
        public DateTime Date { get; set; }
        public NFD_TrainerAttendanceStatus Status { get; set; }
        public TimeSpan? CheckInTime { get; set; }
        public TimeSpan? CheckOutTime { get; set; }
        public string? Reason { get; set; }
        public string? ExcuseProofUrl { get; set; }
        public bool IsConfirmed { get; set; }
    }

    // Creates the record for (company, trainer, date) or updates it if it already exists.
    public class TrainerAttendanceUpsertDto
    {
        [Required]
        public int CompanyId { get; set; }

        [Required]
        public int TrainerId { get; set; }

        [Required]
        public DateTime Date { get; set; }

        [Required]
        public NFD_TrainerAttendanceStatus Status { get; set; }

        [MaxLength(500, ErrorMessage = "Reason cannot exceed 500 characters.")]
        public string? Reason { get; set; }

        public TimeSpan? CheckInTime { get; set; }
        public TimeSpan? CheckOutTime { get; set; }
    }

    public class TrainerAttendanceConfirmDto
    {
        [Required]
        public int CompanyId { get; set; }

        [Required]
        public DateTime Date { get; set; }
    }

    public class TrainerAttendanceProofUploadDto
    {
        [Required]
        public IFormFile File { get; set; } = null!;
    }
}