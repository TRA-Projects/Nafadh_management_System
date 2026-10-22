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
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
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
                await _service.SaveAnswerAsync(attemptId, dto);

                return Ok(new { message = "تم حفظ الإجابة بنجاح." });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
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
                    message = "تم تسليم الاختبار وحساب الدرجة بنجاح."
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
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
                return BadRequest(new { message = ex.Message });
            }
        }

        // تسجيل مخالفة الخروج من صفحة الاختبار
        [HttpPost("{attemptId:int}/violation")]
        public async Task<IActionResult> RegisterViolation(int attemptId)
        {
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
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // ==========================================================
        // 🌟 الإضافات الجديدة هنا (قبل نهاية الكلاس):
        // ==========================================================

        // 1️⃣ جلب كافة محاولات المتدربين لاختبار معين (لكشف الدرجات ومؤشرات النزاهة في شاشة العرض)
        [HttpGet("by-quiz/{quizId:int}")]
        public async Task<IActionResult> GetAttemptsByQuiz(int quizId)
        {
            try
            {
                var attempts = await _service.GetAttemptsByQuizIdAsync(quizId);
                return Ok(attempts);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // 2️⃣ اعتماد أو رفض عذر المتدرب المتغيب (خاص بالمدرب/الإدارة من خلال زر الاعتماد في الشاشة)
        [HttpPost("decide-excuse")]
        public async Task<IActionResult> DecideExcuse([FromBody] ExcuseDecisionRequestDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                await _service.DecideExcuseAsync(dto.AttemptId, dto.Approve, dto.RejectionReason);

                return Ok(new
                {
                    message = dto.Approve
                        ? "تم اعتماد عذر المتدرب بنجاح وتحديث حالته إلى (معذور)."
                        : "تم رفض العذر وإبقاء الحالة (غائب)."
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        // 3️⃣ إضافة ملاحظة على التسليم من المتدرب (للمشاريع/الواجبات/الاختبار)
        [HttpPost("{attemptId:int}/submission-note")]
        public async Task<IActionResult> AddSubmissionNote(int attemptId, [FromBody] string note)
        {
            try
            {
                await _service.AddSubmissionNoteAsync(attemptId, note);
                return Ok(new { message = "تم حفظ ملاحظة التسليم بنجاح." });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        // 4️⃣ رفع وإرفاق عذر طبي/رسمي من المتدرب للغياب
        [HttpPost("{quizId:int}/submit-excuse")]
        public async Task<IActionResult> SubmitAbsenceExcuse(int quizId, [FromForm] string reason, IFormFile? attachment)
        {
            try
            {
                // يتم تمرير العذر والملف لخدمة المحاولات لحفظ المرفق وتعيين الحالة PendingReview
                await _service.SubmitExcuseAsync(quizId, reason, attachment);
                return Ok(new { message = "تم إرسال العذر بنجاح وهو قيد المراجعة والاعتماد." });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}