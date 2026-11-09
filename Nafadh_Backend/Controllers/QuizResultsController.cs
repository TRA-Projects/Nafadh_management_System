
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
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

        // Company Portal: results for one enrollment only, scoped to the
        // authenticated supervisor's company and the enrollment's batch.
        [HttpGet("company/enrollment/{enrollmentId:int}")]
        [Authorize(Roles = "CompanySupervisor")]
        public async Task<IActionResult> GetCompanyEnrollmentResults(int enrollmentId)
        {
            if (enrollmentId <= 0)
                return BadRequest(new { message = "رقم التسجيل غير صالح." });

            var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub");
            if (!int.TryParse(userIdValue, out var userId))
                return Unauthorized();

            // Never trust a companyId from the URL or browser. Verify ownership
            // of this specific enrollment through the authenticated supervisor.
            var isAllowed = await _context.NFD_Enrollments
                .AsNoTracking()
                .AnyAsync(e => e.EnrollmentId == enrollmentId &&
                    _context.NFD_CompanySupervisors.Any(s =>
                        s.UserId == userId && s.CompanyId == e.CompanyId));
            if (!isAllowed)
                return Forbid();

            var results = await _service.GetCompanyEnrollmentResultsAsync(enrollmentId);
            return Ok(results);
        }

        // ==========================================
        // 1. نتائج اختبارات المدرب
        // ==========================================
        [HttpGet("trainer/{trainerId:int}")]
        [Authorize(Roles = "Trainer,Admin")]
        public async Task<IActionResult> GetTrainerResults(
            int trainerId,
            [FromQuery] int? quizId = null)
        {
            if (trainerId <= 0)
            {
                return BadRequest(new
                {
                    message = "رقم المدرب غير صالح."
                });
            }

            if (quizId.HasValue && quizId.Value <= 0)
            {
                return BadRequest(new
                {
                    message = "رقم الاختبار غير صالح."
                });
            }

            if (!await _access.TrainerOwnsTrainerIdAsync(
                    User,
                    trainerId))
            {
                return Forbid();
            }

            var results =
                await _service.GetTrainerResultsAsync(
                    trainerId,
                    quizId);

            return Ok(results);
        }

        // ==========================================
        // 2. تفاصيل محاولة الاختبار للمدرب
        // ==========================================
        [HttpGet("trainer/{trainerId:int}/attempts/{attemptId:int}")]
        [Authorize(Roles = "Trainer,Admin")]
        public async Task<IActionResult> GetTrainerAttemptDetails(
            int trainerId,
            int attemptId)
        {
            if (trainerId <= 0 || attemptId <= 0)
            {
                return BadRequest(new
                {
                    message = "رقم المدرب أو المحاولة غير صالح."
                });
            }

            if (!await _access.TrainerOwnsTrainerIdAsync(
                    User,
                    trainerId))
            {
                return Forbid();
            }

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
                return NotFound(new
                {
                    message = ex.Message
                });
            }
        }

        // ==========================================
        // 3. نتائج المتدرب للأدمن فقط
        // ==========================================
        [HttpGet("admin/trainee/{traineeId:int}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetAdminTraineeResults(
            int traineeId)
        {
            if (traineeId <= 0)
            {
                return BadRequest(new
                {
                    message = "رقم المتدرب غير صالح."
                });
            }

            var results =
                await _service.GetAdminTraineeResultsAsync(
                    traineeId);

            return Ok(results);
        }

        // ==========================================
        // 4. نتائج المتدرب لنفسه فقط
        // ==========================================
        [HttpGet("trainee/{traineeId:int}")]
        [Authorize(Roles = "Trainee")]
        public async Task<IActionResult> GetTraineeResults(
            int traineeId)
        {
            if (traineeId <= 0)
            {
                return BadRequest(new
                {
                    message = "رقم المتدرب غير صالح."
                });
            }

            if (!await _access.TraineeOwnsTraineeIdAsync(
                    User,
                    traineeId))
            {
                return Forbid();
            }

            var results =
                await _service.GetTraineeResultsAsync(
                    traineeId);

            return Ok(results);
        }
    }
}
