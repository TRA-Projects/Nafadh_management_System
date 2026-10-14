using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [Route("api/quizzes")]
    [ApiController]
    public class QuizQuestionsController
        : ControllerBase
    {
        private readonly IQuizQuestionService _service;

        public QuizQuestionsController(
            IQuizQuestionService service)
        {
            _service = service;
        }

        [HttpPost("{quizId:int}/questions")]
        public async Task<IActionResult> AddQuestionsToQuiz(
            int quizId,
            [FromBody] AddQuizQuestionsDto dto,
            [FromQuery] int trainerId)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                await _service.AddQuestionsToQuizAsync(
                    quizId,
                    dto,
                    trainerId);

                return Ok(new
                {
                    message = "تمت إضافة الأسئلة إلى الاختبار بنجاح."
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new
                {
                    message = ex.Message
                });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid(ex.Message);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
        }
    }
}
