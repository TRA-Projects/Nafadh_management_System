using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    public class TrainerFilterDto
    {
        // Filter trainers by specialty (partial match)
        public string? Specialty { get; set; }

        // Filter trainers by status
        public NFD_TrainerStatus? Status { get; set; }

        // Free-text search term (name/email)
        public string? SearchTerm { get; set; }

        // Page number for pagination (default: 1)
        public int PageNumber { get; set; } = 1;

        // Number of items per page (default: 20)
        public int PageSize { get; set; } = 20;
    }
}
