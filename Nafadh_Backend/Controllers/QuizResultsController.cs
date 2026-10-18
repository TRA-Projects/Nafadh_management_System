
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [Route("api/quiz-results")]
    [ApiController]
    public class QuizResultsController : ControllerBase
    {
        private readonly IQuizResultService _service;

        public QuizResultsController(IQuizResultService service)
        {
            _service = service;
        }

        // عرض نتائج جميع اختبارات المدرب
        // مع إمكانية التصفية حسب الاختبار
        [HttpGet("trainer/{trainerId:int}")]
        public async Task<IActionResult> GetTrainerResults(
            int trainerId,
            [FromQuery] int? quizId = null)
        {
            if (trainerId <= 0)
                return BadRequest("رقم المدرب غير صالح.");

            if (quizId.HasValue && quizId.Value <= 0)
                return BadRequest("رقم الاختبار غير صالح.");

            var results = await _service.GetTrainerResultsAsync(
                trainerId, quizId);

            return Ok(results);
        }

        // عرض تفاصيل محاولة متدرب للمدرب
        [HttpGet("trainer/{trainerId:int}/attempts/{attemptId:int}")]
        public async Task<IActionResult> GetTrainerAttemptDetails(
            int trainerId,
            int attemptId)
        {
            if (trainerId <= 0 || attemptId <= 0)
                return BadRequest("رقم المدرب أو المحاولة غير صالح.");

            try
            {
                var result =
                    await _service.GetTrainerAttemptDetailsAsync(
                        attemptId, trainerId);

                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        // الحفاظ على عرض نتائج المتدرب
        [HttpGet("trainee/{traineeId:int}")]
        public async Task<IActionResult> GetTraineeResults(
            int traineeId)
        {
            if (traineeId <= 0)
                return BadRequest("رقم المتدرب غير صالح.");

            var results = await _service.GetTraineeResultsAsync(
                traineeId);

            return Ok(results);
        }
    }
}
