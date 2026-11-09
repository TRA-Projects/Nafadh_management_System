
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/admin/project-scores")]
    [Authorize(Roles = "Admin")]
    public class AdminProjectScoresController : ControllerBase
    {
        private readonly Nafadhcontext _context;

        public AdminProjectScoresController(Nafadhcontext context)
        {
            _context = context;
        }

        // Get all trainees in a batch and their Admin project scores.
        [HttpGet("batch/{batchId:int}")]
        public async Task<IActionResult> GetBatchProjectScores(int batchId)
        {
            var batchExists = await _context.NFD_Batches
                .AnyAsync(b => b.BatchId == batchId);

            if (!batchExists)
                return NotFound(new { message = "الدفعة غير موجودة." });

            var trainees = await _context.NFD_Enrollments
                .AsNoTracking()
                .Where(e => e.BatchId == batchId)
                .Include(e => e.Trainee)
                    .ThenInclude(t => t.User)
                .Include(e => e.AdminProjectScore)
                .Select(e => new AdminProjectScoreDto
                {
                    EnrollmentId = e.EnrollmentId,
                    TraineeId = e.TraineeId,
                    FullName = e.Trainee.User.FullName,
                    Score = e.AdminProjectScore == null
                        ? null
                        : e.AdminProjectScore.Score,
                    Notes = e.AdminProjectScore == null
                        ? null
                        : e.AdminProjectScore.Notes,
                    UpdatedAt = e.AdminProjectScore == null
                        ? null
                        : e.AdminProjectScore.UpdatedAt
                })
                .ToListAsync();

            return Ok(trainees);
        }

        // Add or update a trainee's project score.
        [HttpPut("enrollment/{enrollmentId:int}")]
        public async Task<IActionResult> SaveProjectScore(
            int enrollmentId,
            [FromBody] SaveAdminProjectScoreDto dto)
        {
            if (dto.Score < 0 || dto.Score > 100)
            {
                return BadRequest(new
                {
                    message = "درجة المشروع يجب أن تكون بين 0 و100."
                });
            }

            var enrollment = await _context.NFD_Enrollments
                .Include(e => e.AdminProjectScore)
                .FirstOrDefaultAsync(e => e.EnrollmentId == enrollmentId);

            if (enrollment == null)
                return NotFound(new { message = "تسجيل المتدرب غير موجود." });

            if (enrollment.AdminProjectScore == null)
            {
                enrollment.AdminProjectScore = new NFD_AdminProjectScore
                {
                    EnrollmentId = enrollmentId,
                    Score = dto.Score,
                    Notes = dto.Notes?.Trim(),
                    UpdatedAt = DateTime.UtcNow
                };
            }
            else
            {
                enrollment.AdminProjectScore.Score = dto.Score;
                enrollment.AdminProjectScore.Notes = dto.Notes?.Trim();
                enrollment.AdminProjectScore.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "تم حفظ درجة المشروع بنجاح.",
                enrollmentId,
                score = dto.Score
            });
        }
    }

    public class SaveAdminProjectScoreDto
    {
        [Range(0, 100)]
        public decimal Score { get; set; }

        [MaxLength(1000)]
        public string? Notes { get; set; }
    }

    public class AdminProjectScoreDto
    {
        public int EnrollmentId { get; set; }
        public int TraineeId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public decimal? Score { get; set; }
        public string? Notes { get; set; }
        public DateTime? UpdatedAt { get; set; }
    }
}
