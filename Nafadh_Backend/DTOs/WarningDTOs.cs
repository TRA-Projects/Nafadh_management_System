using Nafadh_Backend.Enums;
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{

    // ================================
    // INPUT DTOs
    // Used to receive data from client
    // ================================


    // Used for creating a new warning
    // POST: /api/Warning
    // EDITED: now polymorphic — Scope determines which of EnrollmentId/CompanyId
    // must be supplied. Validated in WarningService.CreateWarningAsync.
    public class WarningInputDTO
    {

        // NEW: discriminates Company-scope vs Trainee-scope warning
        [Required(ErrorMessage = "Scope is required")]
        public NFD_WarningScope Scope { get; set; }

        // Related enrollment ID — required when Scope == Trainee
        public int? EnrollmentId { get; set; }

        // NEW: related company ID — required when Scope == Company
        public int? CompanyId { get; set; }



        // Warning type
        [Required(ErrorMessage = "Warning type is required")]
        public NFD_WarningType Type { get; set; }



        // Warning severity level
        [Required(ErrorMessage = "Warning level is required")]
        public NFD_WarningLevel Level { get; set; }



        // Evidence or description of the warning
        [MaxLength(500, ErrorMessage = "Evidence cannot exceed 500 characters")]
        public string? Evidence { get; set; }

        // Id of the user raising the warning (Admin, or a Company supervisor)
        [Required(ErrorMessage = "RaisedByUserId is required")]
        public int RaisedByUserId { get; set; }

    }




    // Used for updating warning status
    // PUT: /api/Warning/{id}/status
    public class WarningStatusInputDTO
    {

        // New status value
        // Example: UnderReview, Resolved, Escalated
        [Required(ErrorMessage = "Status is required")]
        public NFD_WarningStatus Status { get; set; }

    }




    // Used for resolving a warning
    // PUT: /api/Warning/{id}/resolve
    public class WarningResolveInputDTO
    {

        // Resolution explanation
        [Required(ErrorMessage = "Resolution is required")]

        [MaxLength(500, ErrorMessage = "Resolution cannot exceed 500 characters")]
        public string Resolution { get; set; } = string.Empty;

    }

    // ================================
    // OUTPUT DTO
    // Used to return warning list data
    // ================================


    // Used in:
    // GET /api/Warning (with scope/companyId/enrollmentId/status/level query filters)
    // GET /api/Warning/enrollment/{enrollmentId}
    // GET /api/Warning/pending
    // GET /api/Warning/level/{level}

    public class WarningOutputDTO
    {

        // Warning primary key
        public int WarningId { get; set; }

        // NEW: scope discriminator
        public NFD_WarningScope Scope { get; set; }

        // Related enrollment (Trainee-scope only)
        public int? EnrollmentId { get; set; }

        // NEW: related company (Company-scope only)
        public int? CompanyId { get; set; }

        // NEW: resolved display name of the target (trainee name or company name)
        public string? TargetName { get; set; }

        // Warning type
        public NFD_WarningType Type { get; set; }

        // Warning level
        public NFD_WarningLevel Level { get; set; }


        // Evidence information
        public string? Evidence { get; set; }


       // Current warning status
        public NFD_WarningStatus Status { get; set; }

      // Resolution information
        public string? Resolution { get; set; }

       // Warning creation date
        public DateTime IssuedDate { get; set; }

        // NEW: who raised it, and their resolved display name
        public int RaisedByUserId { get; set; }
        public string? RaisedByName { get; set; }

    }

    // ================================
    // DETAILS DTO
    // Used for single warning details
    // ================================


    // Used in:
    // GET /api/Warning/{id}

    public class WarningDetailsDTO
    {

        // Warning ID
        public int WarningId { get; set; }

        // NEW: scope discriminator
        public NFD_WarningScope Scope { get; set; }

        // Enrollment ID (Trainee-scope only)
        public int? EnrollmentId { get; set; }

        // NEW: Company ID (Company-scope only)
        public int? CompanyId { get; set; }

        // NEW: resolved display name of the target
        public string? TargetName { get; set; }

        // Warning type
        public NFD_WarningType Type { get; set; }

        // Warning severity level
        public NFD_WarningLevel Level { get; set; }

        // Evidence information
        public string? Evidence { get; set; }

        // Current status
        public NFD_WarningStatus Status { get; set; }

        // Resolution information
        public string? Resolution { get; set; }

        // Date when warning was issued
        public DateTime IssuedDate { get; set; }

        // NEW: who raised it, and their resolved display name
        public int RaisedByUserId { get; set; }
        public string? RaisedByName { get; set; }

    }

}
