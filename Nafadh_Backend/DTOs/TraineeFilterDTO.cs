using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    public class TraineeFilterDto
    {
        // Filter trainees by host company
        public int? CompanyId { get; set; }

        // Filter trainees by status
        public NFD_TraineeStatus? Status { get; set; }

        // Filter trainees by university (partial match)
        public string? University { get; set; }

        // Free-text search term (name/email/major)
        public string? SearchTerm { get; set; }

        // Page number for pagination (default: 1)
        public int PageNumber { get; set; } = 1;

        // Number of items per page (default: 20)
        public int PageSize { get; set; } = 20;
    }
}
