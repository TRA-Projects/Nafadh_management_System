
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Nafadh_Backend.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [Route("api/quiz-results")]
    [ApiController]
    [Authorize]
    public class QuizResultsController : ControllerBase
    {
        private readonly IQuizResultService _service;
        private readonly IQuizAccessService _access;
        private readonly Nafadhcontext _context;

        public QuizResultsController(
            IQuizResultService service,
            IQuizAccessService access,
            Nafadhcontext context)
        {
            _service = service;
            _access = access;
            _context = context;
        }

        [HttpGet("company/enrollment/{enrollmentId:int}")]
        [Authorize(Roles = "CompanySupervisor,Admin")]
        public async Task<IActionResult> GetCompanyEnrollmentResults(int enrollmentId)
        {
            if (enrollmentId <= 0)
                return BadRequest(new { message = "رقم التسجيل غير صالح." });

            var enrollment = await _context.NFD_Enrollments
                .AsNoTracking()
                .Where(e => e.EnrollmentId == enrollmentId)
                .Select(e => new { e.TraineeId, e.BatchId, e.CompanyId })
                .FirstOrDefaultAsync();

            if (enrollment == null)
                return NotFound(new { message = "التسجيل غير موجود." });

            if (!User.IsInRole("Admin"))
            {
                var rawUserId = User.FindFirstValue(ClaimTypes.NameIdentifier)
                    ?? User.FindFirstValue("sub");
                if (!int.TryParse(rawUserId, out var userId))
                    return Forbid();

                var belongsToCompany = await _context.Set<NFD_CompanySupervisor>()
                    .AnyAsync(s => s.UserId == userId && s.CompanyId == enrollment.CompanyId);
                if (!belongsToCompany)
                    return Forbid();
            }

            // Project only stored result fields; do not materialize the attempt entity
            // or load answers/proctoring fields that are absent from this database.
            var results = await _context.NFD_QuizAttempts
                .AsNoTracking()
                .Where(a => a.TraineeId == enrollment.TraineeId
                    && a.Quiz.BatchId == enrollment.BatchId
                    && (a.Status == "Submitted" || a.Status == "Expired"
                        || a.Status == "Terminated"))
                .OrderByDescending(a => a.SubmittedAt)
                .ThenByDescending(a => a.AttemptId)
                .Select(a => new
                {
                    a.AttemptId,
                    a.QuizId,
                    QuizTitle = a.Quiz.Title,
                    a.TraineeId,
                    a.AttemptNumber,
                    a.SubmittedAt,
                    a.Score,
                    a.Percentage,
                    a.Status
                })
                .ToListAsync();

            return Ok(results);
        }

        // عرض نتائج اختبارات المدرب مع إمكانية التصفية حسب الاختبار
        [HttpGet("trainer/{trainerId:int}")]
        [Authorize(Roles = "Trainer,Admin")]
        public async Task<IActionResult> GetTrainerResults(
            int trainerId,
            [FromQuery] int? quizId = null)
        {
            if (trainerId <= 0)
                return BadRequest("رقم المدرب غير صالح.");

            if (quizId.HasValue && quizId.Value <= 0)
                return BadRequest("رقم الاختبار غير صالح.");

            if (!await _access.TrainerOwnsTrainerIdAsync(User, trainerId))
                return Forbid();

            var results = await _service.GetTrainerResultsAsync(
                trainerId,
                quizId);

            return Ok(results);
        }

        // عرض تفاصيل محاولة متدرب للمدرب
        [HttpGet("trainer/{trainerId:int}/attempts/{attemptId:int}")]
        [Authorize(Roles = "Trainer,Admin")]
        public async Task<IActionResult> GetTrainerAttemptDetails(
            int trainerId,
            int attemptId)
        {
            if (trainerId <= 0 || attemptId <= 0)
                return BadRequest("رقم المدرب أو المحاولة غير صالح.");

            if (!await _access.TrainerOwnsTrainerIdAsync(User, trainerId))
                return Forbid();

            try
            {
                var result =
                    await _service.GetTrainerAttemptDetailsAsync(
                        attemptId,
                        trainerId);

                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        // عرض نتائج اختبارات متدرب محدد للأدمن فقط
        [HttpGet("admin/trainee/{traineeId:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAdminTraineeResults(
            int traineeId)
        {
            if (traineeId <= 0)
                return BadRequest(new
                {
                    message = "رقم المتدرب غير صالح."
                });

            var results = await _service.GetTraineeResultsAsync(
                traineeId);

            return Ok(results);
        }

        // عرض نتائج المتدرب نفسه فقط
        [HttpGet("trainee/{traineeId:int}")]
        [Authorize(Roles = "Trainee")]
        public async Task<IActionResult> GetTraineeResults(
            int traineeId)
        {
            if (traineeId <= 0)
                return BadRequest("رقم المتدرب غير صالح.");

            if (!await _access.TraineeOwnsTraineeIdAsync(User, traineeId))
                return Forbid();

            var results = await _service.GetTraineeResultsAsync(
                traineeId);

            return Ok(results);
        }
    }
}
