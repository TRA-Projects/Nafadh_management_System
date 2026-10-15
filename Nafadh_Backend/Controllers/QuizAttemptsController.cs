using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [Route("api/quiz-attempts")]
    [ApiController]
    public class QuizAttemptsController : ControllerBase
    {
        private readonly IQuizAttemptService _service;

        public QuizAttemptsController(IQuizAttemptService service)
        {
            _service = service;
        }

        // بدء محاولة اختبار جديدة
        [HttpPost("start")]
        public async Task<IActionResult> StartAttempt(
            [FromBody] StartQuizAttemptDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var attempt =
                    await _service.StartAttemptAsync(dto);

                return Ok(attempt);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new
                {
                    message = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
        }

        // حفظ إجابة المتدرب
        [HttpPost("{attemptId:int}/answers")]
        public async Task<IActionResult> SaveAnswer(
            int attemptId,
            [FromBody] SubmitQuizAnswerDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                await _service.SaveAnswerAsync(
                    attemptId,
                    dto);

                return Ok(new
                {
                    message = "تم حفظ الإجابة بنجاح."
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new
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
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
        }

        // تسليم الاختبار وحساب الدرجة
        [HttpPost("submit")]
        public async Task<IActionResult> SubmitAttempt(
            [FromBody] SubmitQuizDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                await _service.SubmitAttemptAsync(dto);

                return Ok(new
                {
                    message =
                        "تم تسليم الاختبار وحساب الدرجة بنجاح."
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new
                {
                    message = ex.Message
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
        }
        // تصحيح الإجابة المقالية من المدرب
        [HttpPost("grade-essay")]
        public async Task<IActionResult> GradeEssayAnswer(
            [FromBody] GradeQuizAnswerDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                await _service.GradeEssayAnswerAsync(dto);

                return Ok(new
                {
                    message = "تم تصحيح الإجابة المقالية وتحديث درجة المتدرب بنجاح."
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
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
        }
    }
}
