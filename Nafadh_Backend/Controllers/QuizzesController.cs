
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

        // عرض اختبارات المتدرب - الوظيفة الحالية
        [HttpGet("trainee/{traineeId:int}")]
        public async Task<IActionResult> GetTraineeQuizzes(
            int traineeId)
        {
            var quizzes =
                await _quizService.GetTraineeQuizzesAsync(traineeId);

            return Ok(quizzes);
        }

        // تفاصيل الاختبار ومعاينته للمدرب
        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetQuizDetails(
            int id, [FromQuery] int trainerId)
        {
            try
            {
                var quiz = await _quizService
                    .GetQuizDetailsAsync(id, trainerId);

                return Ok(quiz);
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

        // إنشاء اختبار كمسودة
        [HttpPost]
        public async Task<IActionResult> CreateQuiz(
            [FromBody] CreateQuizDto dto,
            [FromQuery] int trainerId)
        {
            try
            {
                await _quizService.CreateQuizAsync(dto, trainerId);

                return Ok(new
                {
                    message = "تم إنشاء الاختبار كمسودة بنجاح"
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { message = ex.Message });
            }
        }

        // تعديل إعدادات المسودة
        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateQuiz(
            int id,
            [FromBody] UpdateQuizDto dto,
            [FromQuery] int trainerId)
        {
            try
            {
                await _quizService.UpdateQuizAsync(id, dto, trainerId);

                return Ok(new
                {
                    message = "تم تحديث الاختبار بنجاح"
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

        // نشر الاختبار
        [HttpPost("{id:int}/publish")]
        public async Task<IActionResult> PublishQuiz(
            int id, [FromQuery] int trainerId)
        {
            try
            {
                await _quizService.PublishQuizAsync(id, trainerId);

                return Ok(new
                {
                    message = "تم نشر الاختبار بنجاح"
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

        // إغلاق الاختبار
        [HttpPost("{id:int}/close")]
        public async Task<IActionResult> CloseQuiz(
            int id, [FromQuery] int trainerId)
        {
            try
            {
                await _quizService.CloseQuizAsync(id, trainerId);

                return Ok(new
                {
                    message = "تم إغلاق الاختبار بنجاح"
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

        // أرشفة الاختبار
        [HttpPost("{id:int}/archive")]
        public async Task<IActionResult> ArchiveQuiz(
            int id, [FromQuery] int trainerId)
        {
            try
            {
                await _quizService.ArchiveQuizAsync(id, trainerId);

                return Ok(new
                {
                    message = "تمت أرشفة الاختبار بنجاح"
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

        // نسخ اختبار موجود إلى مسودة جديدة
        [HttpPost("{id:int}/duplicate")]
        public async Task<IActionResult> DuplicateQuiz(
            int id, [FromQuery] int trainerId)
        {
            try
            {
                var newQuizId = await _quizService
                    .DuplicateQuizAsync(id, trainerId);

                return Ok(new
                {
                    message = "تم نسخ الاختبار بنجاح",
                    quizId = newQuizId
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
        }
    }
}
