using Microsoft.AspNetCore.Http;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    public class ExcuseDto
    {
        // =====================================================
        // READ EXCUSE
        // =====================================================

        // Used when returning excuse data to the frontend.
        public class ExcuseReadDto
        {
            public int ExcuseId { get; set; }

            public string Reason { get; set; } =
                string.Empty;

            public string? ProofUrl { get; set; }

            public NFD_ExcuseStatus Status { get; set; }

            public int DailyAttendanceId { get; set; }

            public int? ReviewedByUserId { get; set; }
        }


        // =====================================================
        // CREATE EXCUSE - SERVICE DTO
        // =====================================================

        // Used internally by the service after
        // the proof file has been saved.
        public class CreateExcuseDto
        {
            public string Reason { get; set; } =
                string.Empty;

            public string? ProofUrl { get; set; }

            public int DailyAttendanceId { get; set; }
        }


        // =====================================================
        // CREATE EXCUSE - MULTIPART FORM
        // =====================================================

        // Used by the controller to receive
        // the excuse reason and optional proof file.
        public class CreateExcuseFormDto
        {
            public int DailyAttendanceId { get; set; }

            public string Reason { get; set; } =
                string.Empty;

            // Optional proof attachment:
            // PDF, JPG, JPEG, PNG or WEBP.
            public IFormFile? File { get; set; }
        }


        // =====================================================
        // REVIEW EXCUSE
        // =====================================================

        // Used when approving or rejecting an excuse.
        public class ReviewExcuseDto
        {
            public bool IsApproved { get; set; }

            public int ReviewedByUserId { get; set; }
        }
    }
}