using Nafadh_Backend.Enums;
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{

    // Returned to the client
    public class TrackDto
    {
        public int TrackId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Status { get; set; } = string.Empty;
    }

    // POST /api/Track
    public class CreateTrackDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
    }

    // PUT /api/Track/{id}
    public class UpdateTrackDto
    {
        public string Name { get; set; } = string.Empty;
        public string? Description { get; set; }
        public NFD_TrackStatus Status { get; set; }
    }

    // GET /api/Track/{id}/programs
    public class ProgramSummaryDto
    {
        public int ProgramId { get; set; }
        public string Title { get; set; } = string.Empty;
        public string? Description { get; set; }
        public string Status { get; set; } = string.Empty;
    }
}