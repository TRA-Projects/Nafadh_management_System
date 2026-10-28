
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

        public QuizResultsController(
            IQuizResultService service,
            IQuizAccessService access)
        {
            _service = service;
            _access = access;
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
