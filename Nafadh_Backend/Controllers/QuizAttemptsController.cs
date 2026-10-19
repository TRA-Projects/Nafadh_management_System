using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [Route("api/quiz-attempts")]
    [ApiController]
    [Authorize]
    public class QuizAttemptsController : ControllerBase
    {
        private readonly IQuizAttemptService _service;
        private readonly IQuizAccessService _access;

        public QuizAttemptsController(
            IQuizAttemptService service,
            IQuizAccessService access)
        {
            _service = service;
            _access = access;
        }

        // قائمة اختبارات المتدرب + أرقام البطاقات
        [HttpGet("trainee/{traineeId:int}/quizzes")]
        [Authorize(Roles = "Trainee")]
        public async Task<IActionResult> GetTraineeQuizzes(int traineeId)
        {
            if (!await _access.TraineeOwnsTraineeIdAsync(User, traineeId))
            {
                return Forbid();
            }

            var overview = await _service.GetTraineeQuizzesAsync(traineeId);

            return Ok(overview);
        }

        // استئناف محاولة جارية (بعد Refresh)
        [HttpGet("{attemptId:int}")]
        [Authorize(Roles = "Trainee")]
        public async Task<IActionResult> GetAttempt(
            int attemptId,
            [FromQuery] int traineeId)
        {
            if (!await _access.TraineeOwnsTraineeIdAsync(User, traineeId))
            {
                return Forbid();
            }

            try
            {
                var attempt =
                    await _service.GetAttemptAsync(attemptId, traineeId);

                return Ok(attempt);
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
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
        }

        // بدء محاولة اختبار جديدة (أو استئناف المحاولة الجارية)
        [HttpPost("start")]
        [Authorize(Roles = "Trainee")]
        public async Task<IActionResult> StartAttempt(
            [FromBody] StartQuizAttemptDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (!await _access.TraineeOwnsTraineeIdAsync(User, dto.TraineeId))
            {
                return Forbid();
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
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new
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
        [Authorize(Roles = "Trainee")]
        public async Task<IActionResult> SaveAnswer(
            int attemptId,
            [FromBody] SubmitQuizAnswerDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (!await _access.TraineeOwnsAttemptAsync(User, attemptId))
            {
                return Forbid();
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
        [Authorize(Roles = "Trainee")]
        public async Task<IActionResult> SubmitAttempt(
            [FromBody] SubmitQuizDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (!await _access.TraineeOwnsAttemptAsync(User, dto.AttemptId))
            {
                return Forbid();
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
        [Authorize(Roles = "Trainer")]
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

        // تسجيل مخالفة الخروج من صفحة الاختبار
        [HttpPost("{attemptId:int}/violation")]
        [Authorize(Roles = "Trainee")]
        public async Task<IActionResult> RegisterViolation(int attemptId)
        {
            if (!await _access.TraineeOwnsAttemptAsync(User, attemptId))
            {
                return Forbid();
            }

            try
            {
                var violationCount =
                    await _service.RegisterViolationAsync(attemptId);

                var isTerminated = violationCount >= 2;

                return Ok(new
                {
                    message = isTerminated
                        ? "تم إنهاء الاختبار بسبب تكرار المخالفات."
                        : "تم تسجيل المخالفة الأولى.",
                    violationCount,
                    isTerminated
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
    }
}