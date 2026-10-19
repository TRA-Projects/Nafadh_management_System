using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [Route("api/quiz-results")]
    [ApiController]
    [Authorize]
    public class QuizResultsController
        : ControllerBase
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

        // نتائج اختبارات المدرب (المدرب نفسه أو الأدمن فقط)
        [HttpGet("trainer/{trainerId:int}")]
        [Authorize(Roles = "Trainer,Admin")]
        public async Task<IActionResult> GetTrainerResults(
            int trainerId,
            [FromQuery] int? quizId = null)
        {
            if (!await _access.TrainerOwnsTrainerIdAsync(User, trainerId))
            {
                return Forbid();
            }

            var results =
                await _service.GetTrainerResultsAsync(
                    trainerId,
                    quizId);

            return Ok(results);
        }

        // عرض نتائج اختبارات المتدرب (المتدرب نفسه فقط)
        [HttpGet("trainee/{traineeId:int}")]
        [Authorize(Roles = "Trainee")]
        public async Task<IActionResult> GetTraineeResults(
            int traineeId)
        {
            if (!await _access.TraineeOwnsTraineeIdAsync(User, traineeId))
            {
                return Forbid();
            }

            var results = await _service.GetTraineeResultsAsync(
                traineeId);

            return Ok(results);
        }
    }
}