
using System;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/trainer/project-grades")]
    [Authorize]
    public class TrainerProjectGradesController : ControllerBase
    {
        private readonly Nafadhcontext _context;

        public TrainerProjectGradesController(Nafadhcontext context)
        {
            _context = context;
        }

        [HttpGet("batch/{batchId:int}/project/{projectId:int}")]
        public async Task<IActionResult> GetProjectGrades(
    int batchId,
    int projectId)
        {
            var trainerId = await GetCurrentTrainerIdAsync();

            if (trainerId == null)
                return Forbid();

            var isAssigned = await _context.NFD_BatchTrainers
                .AnyAsync(x =>
                    x.BatchId == batchId &&
                    x.TrainerId == trainerId.Value);

            if (!isAssigned)
                return Forbid();

            // Verify that the project is explicitly linked
            // to the requested batch and belongs to its program.
            var projectExists = await _context.NFD_ProjectBatches
                .AnyAsync(pb =>
                    pb.ProjectId == projectId &&
                    pb.BatchId == batchId &&
                    pb.Project.ProgramId == pb.Batch.ProgramId);

            if (!projectExists)
            {
                return NotFound(new
                {
                    message = "Project is not linked to this batch."
                });
            }

            var grades = await _context.NFD_TrainerProjectGrades
                .AsNoTracking()
                .Where(g =>
                    g.ProjectId == projectId &&
                    g.Enrollment.BatchId == batchId)
                .Select(g => new
                {
                    g.TrainerProjectGradeId,
                    g.ProjectId,
                    g.EnrollmentId,
                    g.Enrollment.TraineeId,
                    g.TrainerId,
                    g.Score,
                    g.Feedback,
                    g.GradedAt,
                    g.UpdatedAt
                })
                .ToListAsync();

            return Ok(grades);
        }

        // Create or update a trainee's individual project grade.
        [HttpPut("project/{projectId:int}/enrollment/{enrollmentId:int}")]
        public async Task<IActionResult> SaveProjectGrade(
            int projectId,
            int enrollmentId,
            [FromBody] SaveTrainerProjectGradeDto dto)
        {
            if (!ModelState.IsValid)
                return ValidationProblem(ModelState);

            if (dto.Score < 0m || dto.Score > 100m)
                return BadRequest(new
                {
                    message = "Score must be between 0 and 100."
                });

            var trainerId = await GetCurrentTrainerIdAsync();

            if (trainerId == null)
                return Forbid();

            var enrollment = await _context.NFD_Enrollments
                .AsNoTracking()
                .Where(e => e.EnrollmentId == enrollmentId)
                .Select(e => new
                {
                    e.EnrollmentId,
                    e.TraineeId,
                    e.BatchId,
                    e.Batch.ProgramId
                })
                .FirstOrDefaultAsync();

            if (enrollment == null)
                return NotFound(new
                {
                    message = "Enrollment not found."
                });

            var isAssigned = await _context.NFD_BatchTrainers
                .AnyAsync(bt =>
                    bt.BatchId == enrollment.BatchId &&
                    bt.TrainerId == trainerId.Value);

            if (!isAssigned)
                return Forbid();

            var projectIsLinkedToBatch = await _context.NFD_ProjectBatches
     .AnyAsync(pb =>
         pb.ProjectId == projectId &&
         pb.BatchId == enrollment.BatchId &&
         pb.Project.ProgramId == enrollment.ProgramId);

            if (!projectIsLinkedToBatch)
            {
                return NotFound(new
                {
                    message = "Project is not linked to the trainee's batch."
                });
            }

            var isProjectMember = await _context.NFD_ProjectMembers
                .AnyAsync(pm =>
                    pm.ProjectId == projectId &&
                    pm.TraineeId == enrollment.TraineeId);

            if (!isProjectMember)
                return BadRequest(new
                {
                    message = "Trainee is not a member of this project."
                });

            var grade = await _context.NFD_TrainerProjectGrades
                .FirstOrDefaultAsync(g =>
                    g.ProjectId == projectId &&
                    g.EnrollmentId == enrollmentId);

            var now = DateTime.UtcNow;

            if (grade == null)
            {
                grade = new NFD_TrainerProjectGrade
                {
                    ProjectId = projectId,
                    EnrollmentId = enrollmentId,
                    TrainerId = trainerId.Value,
                    Score = dto.Score,
                    Feedback = dto.Feedback,
                    GradedAt = now
                };

                _context.NFD_TrainerProjectGrades.Add(grade);
            }
            else
            {
                // The original grader retains ownership of the grade.
                if (grade.TrainerId != trainerId.Value)
                    return Forbid();

                grade.Score = dto.Score;
                grade.Feedback = dto.Feedback;
                grade.UpdatedAt = now;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                grade.TrainerProjectGradeId,
                grade.ProjectId,
                grade.EnrollmentId,
                grade.TrainerId,
                grade.Score,
                grade.Feedback,
                grade.GradedAt,
                grade.UpdatedAt
            });
        }

        private async Task<int?> GetCurrentTrainerIdAsync()
        {
            var userIdValue =
                User.FindFirstValue("userId") ??
                User.FindFirstValue("UserId") ??
                User.FindFirstValue("sub") ??
                User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!int.TryParse(userIdValue, out var userId))
                return null;

            return await _context.NFD_Trainers
                .AsNoTracking()
                .Where(t =>
                    t.UserId == userId &&
                    t.User.Role.RoleName == "Trainer")
                .Select(t => (int?)t.TrainerId)
                .FirstOrDefaultAsync();
        }

    }

    public class SaveTrainerProjectGradeDto
    {
        [Required]
        [Range(typeof(decimal), "0", "100")]
        public decimal Score { get; set; }

        [MaxLength(1000)]
        public string? Feedback { get; set; }
    }
}
