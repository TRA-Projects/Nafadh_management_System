
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class QuizzesController : ControllerBase
    {
        private readonly IQuizService _quizService;

        public QuizzesController(IQuizService quizService)
        {
            _quizService = quizService;
        }

        // عرض اختبارات المدرب
        [HttpGet("trainer/{trainerId:int}")]
        public async Task<IActionResult> GetTrainerQuizzes(
            int trainerId)
        {
            var quizzes =
                await _quizService.GetTrainerQuizzesAsync(trainerId);

            return Ok(quizzes);
        }

        // عرض اختبارات المتدرب
        [HttpGet("trainee/{traineeId:int}")]
        public async Task<IActionResult> GetTraineeQuizzes(
            int traineeId)
        {
            var quizzes =
                await _quizService.GetTraineeQuizzesAsync(
                    traineeId);

            return Ok(quizzes);
        }

        // إنشاء اختبار
        [HttpPost]
        public async Task<IActionResult> CreateQuiz(
            [FromBody] CreateQuizDto dto,
            [FromQuery] int trainerId)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                await _quizService.CreateQuizAsync(
                    dto, trainerId);

                return Ok(new
                {
                    message = "تم إنشاء الاختبار بنجاح"
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
        }

        // تعديل اختبار
        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateQuiz(
            int id,
            [FromBody] UpdateQuizDto dto,
            [FromQuery] int trainerId)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                await _quizService.UpdateQuizAsync(
                    id, dto, trainerId);

                return Ok(new
                {
                    message = "تم تحديث الاختبار بنجاح"
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
                return StatusCode(403, new
                {
                    message = ex.Message
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new
                {
                    message = ex.Message
                });
            }
        }
    }
}
