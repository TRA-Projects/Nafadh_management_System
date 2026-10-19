
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [Route("api/quizzes")]
    [ApiController]
    public class QuizQuestionsController : ControllerBase
    {
        private readonly IQuizQuestionService _service;

        public QuizQuestionsController(
            IQuizQuestionService service)
        {
            _service = service;
        }

        // إضافة أسئلة إلى الاختبار
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
                    quizId, dto, trainerId);

                return Ok(new
                {
                    message = "تمت إضافة الأسئلة إلى الاختبار بنجاح."
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // عرض أسئلة الاختبار
        [HttpGet("{quizId:int}/questions")]
        public async Task<IActionResult> GetQuizQuestions(
            int quizId,
            [FromQuery] int trainerId)
        {
            try
            {
                var questions =
                    await _service.GetQuizQuestionsAsync(
                        quizId, trainerId);

                return Ok(questions);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { message = ex.Message });
            }
        }

        // حذف سؤال من الاختبار
        [HttpDelete("{quizId:int}/questions/{quizQuestionId:int}")]
        public async Task<IActionResult> DeleteQuizQuestion(
            int quizId,
            int quizQuestionId,
            [FromQuery] int trainerId)
        {
            try
            {
                await _service.DeleteQuizQuestionAsync(
                    quizId,
                    quizQuestionId,
                    trainerId);

                return Ok(new
                {
                    message = "تم حذف السؤال من الاختبار بنجاح."
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // تعديل ترتيب السؤال ودرجته
        [HttpPut("{quizId:int}/questions/{quizQuestionId:int}")]
        public async Task<IActionResult> UpdateQuizQuestion(
            int quizId,
            int quizQuestionId,
            [FromBody] UpdateQuizQuestionDto dto,
            [FromQuery] int trainerId)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                await _service.UpdateQuizQuestionAsync(
                    quizId,
                    quizQuestionId,
                    dto,
                    trainerId);

                return Ok(new
                {
                    message = "تم تعديل ترتيب السؤال ودرجته بنجاح."
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }
    }
}
