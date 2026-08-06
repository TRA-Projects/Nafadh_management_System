using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    public class TraineeDashboardSummaryDto
    {
        // Unique identifier of the trainee profile
        public int TraineeId { get; set; }

        // Trainee's display name
        public string? FullName { get; set; }

        // Current trainee status
        public NFD_TraineeStatus Status { get; set; }

        // Name of the host company, if assigned
        public string? CompanyName { get; set; }

        // Total number of program/track enrollments
        public int EnrollmentsCount { get; set; }

        // Number of modules the trainee has completed
        public int CompletedModulesCount { get; set; }

        // Total number of modules assigned to the trainee
        public int TotalModulesCount { get; set; }

        // Module completion percentage (0-100)
        public double ModuleProgressPercentage { get; set; }

        // Total number of sessions scheduled for the trainee
        public int TotalSessionsCount { get; set; }

        // Number of sessions the trainee actually attended
        public int AttendedSessionsCount { get; set; }

        // Attendance rate percentage (0-100)
        public double AttendanceRate { get; set; }

        // Total number of submissions made by the trainee
        public int SubmissionsCount { get; set; }

        // Number of submissions still pending review/grading
        public int PendingSubmissionsCount { get; set; }

        // Number of projects the trainee is currently a member of
        public int ActiveProjectsCount { get; set; }
    }
}
