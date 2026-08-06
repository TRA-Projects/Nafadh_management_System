using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    public class EnrollmentDTO
    {
        // POST /api/Enrollment  -> enroll a trainee into a batch/company/department
        public class CreateEnrollmentDto
        {
            public int BatchId { get; set; }
            public int TraineeId { get; set; }
            public int CompanyId { get; set; }
            public int? DepartmentId { get; set; }
            public int? SupervisorId { get; set; }
        }

        // PUT /api/Enrollment/{id}  -> update department/supervisor assignment
        public class UpdateEnrollmentAssignmentDto
        {
            public int? DepartmentId { get; set; }
            public int? SupervisorId { get; set; }
        }

        // PUT /api/Enrollment/{id}/status  -> update completion status
        public class UpdateEnrollmentStatusDto
        {
            public NFD_EnrollmentCompletionStatus CompletionStatus { get; set; }
        }

        // GET /api/Enrollment?batchId=&traineeId=&companyId=&status=  (all filters optional)
        public class EnrollmentFilterDto
        {
            public int? BatchId { get; set; }
            public int? TraineeId { get; set; }
            public int? CompanyId { get; set; }
            public NFD_EnrollmentCompletionStatus? Status { get; set; }
        }

        // GET /api/Enrollment/{id}/progress-summary
        public class ProgressSummaryDto
        {
            public int EnrollmentId { get; set; }
            public int TotalModules { get; set; }
            public int CompletedModules { get; set; }
            public double ProgressPercentage { get; set; }
        }
    }
}
