
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;

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

        // Legacy Admin project scores are read-only.
        // New project grades will be submitted by trainers.
        [HttpGet("batch/{batchId:int}")]
        public async Task<IActionResult> GetBatchProjectScores(int batchId)
        {
            var batchExists = await _context.NFD_Batches
                .AnyAsync(b => b.BatchId == batchId);

            if (!batchExists)
            {
                return NotFound(new
                {
                    message = "الدفعة غير موجودة."
                });
            }

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
