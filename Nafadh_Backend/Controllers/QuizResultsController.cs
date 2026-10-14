using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [Route("api/quiz-results")]
    [ApiController]
    public class QuizResultsController
        : ControllerBase
    {
        private readonly IQuizResultService _service;

        public QuizResultsController(
            IQuizResultService service)
        {
            _service = service;
        }

        [HttpGet("trainer/{trainerId:int}")]
        public async Task<IActionResult> GetTrainerResults(
            int trainerId,
            [FromQuery] int? quizId = null)
        {
            var results =
                await _service.GetTrainerResultsAsync(
                    trainerId,
                    quizId);

            return Ok(results);
        }
    }
}
