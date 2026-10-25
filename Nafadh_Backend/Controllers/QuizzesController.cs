
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
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

        [HttpGet("batch/{batchId:int}")]
        public async Task<IActionResult> GetBatchQuizzes(int batchId, [FromServices] Nafadhcontext context)
        {
            var quizzes = await context.NFD_Quizzes
                .Where(q => q.BatchId == batchId)
                .Select(q => new {
                    q.QuizId,
                    q.Title,
                    q.Description,
                    q.BatchId,
                    q.StartDateTime,
                    q.EndDateTime,
                    q.DurationMinutes,
                    q.Status,
                    q.PassingPercentage,
                    TrainerName = q.Trainer != null && q.Trainer.User != null
                        ? q.Trainer.User.FullName
                        : "المدرب المسؤول"
                })
                .ToListAsync();

            return Ok(quizzes);
        }

        // GET /api/Quizzes/{quizId}/attendance-details
        // كشف متكامل يربط بين درجات الاختبار وسجل حضور وعذر المتدرب اليومي المعتمد من المدرب
        [HttpGet("{quizId:int}/attendance-details")]
        public async Task<IActionResult> GetQuizAttendanceDetails(int quizId, [FromServices] Nafadhcontext context)
        {
            var quiz = await context.NFD_Quizzes
                .Include(q => q.Trainer)
                    .ThenInclude(t => t.User)
                .Include(q => q.Attempts)
                    .ThenInclude(a => a.Trainee)
                        .ThenInclude(tr => tr.User)
                .FirstOrDefaultAsync(q => q.QuizId == quizId);

            if (quiz == null)
                return NotFound(new { message = "الاختبار غير موجود" });

            // 1. جلب متدربي الدفعة من جدول التسجيل
            var enrollments = await context.NFD_Enrollments
                .Where(e => e.BatchId == quiz.BatchId)
                .Include(e => e.Trainee)
                    .ThenInclude(t => t.User)
                .ToListAsync();

            string trainerName = quiz.Trainer?.User?.FullName ?? "المدرب المسؤول";
            var attendeesList = new List<object>();
            var examDate = quiz.StartDateTime.Date;

            foreach (var enrollment in enrollments)
            {
                var trainee = enrollment.Trainee;

                // هل المتدرب دخل الاختبار وحل؟
                var attempt = quiz.Attempts
                    .Where(a => a.TraineeId == trainee.TraineeId)
                    .OrderByDescending(a => a.Score)
                    .FirstOrDefault();

                bool hasAttempt = attempt != null && (attempt.Status == "Submitted" || attempt.Status == "Started");

                // البحث عن حضور وغياب ذلك اليوم والعذر المرفوع من بورتل المتدرب
                var dailyAttendance = await context.NFD_DailyAttendances
                    .Where(da => da.EnrollmentId == enrollment.EnrollmentId && da.Date.Date == examDate)
                    .FirstOrDefaultAsync();

                NFD_Excuse? excuse = null;
                if (dailyAttendance != null)
                {
                    excuse = await context.NFD_Excuses
                        .Where(ex => ex.DailyAttendanceId == dailyAttendance.DailyAttendanceId)
                        .FirstOrDefaultAsync();
                }

                // تحديد الحالة بدقة متطابقة مع شاشتي المدرب والمتدرب
                string attendanceStatus = "حاضر";
                string excuseStatusLabel = "-";

                if (!hasAttempt)
                {
                    if (dailyAttendance != null && dailyAttendance.Status == NFD_AttendanceStatus.Excused && excuse != null)
                    {
                        attendanceStatus = "غائب بعذر";
                        excuseStatusLabel = excuse.Status == NFD_ExcuseStatus.Approved
                            ? "معتمد من المدرب ✔️"
                            : (excuse.Status == NFD_ExcuseStatus.Rejected ? "مرفوض ❌" : "قيد مراجعة المدرب ⏳");
                    }
                    else
                    {
                        attendanceStatus = "غائب دون عذر";
                    }
                }

                attendeesList.Add(new
                {
                    traineeId = trainee.TraineeId,
                    fullName = trainee.User?.FullName ?? "متدرب",
                    attendanceStatus = attendanceStatus,
                    hasExcuse = excuse != null,
                    excuseReason = excuse?.Reason,
                    excuseProofUrl = excuse?.ProofUrl,
                    excuseReviewStatus = excuseStatusLabel,
                    score = attempt != null ? (decimal?)attempt.Score : null,
                    percentage = attempt != null ? (decimal?)attempt.Percentage : null,
                    isPassed = attempt != null && attempt.Percentage >= quiz.PassingPercentage,
                    gradedBy = hasAttempt ? trainerName : "-"
                });
            }

            return Ok(new
            {
                quizId = quiz.QuizId,
                title = quiz.Title,
                startDateTime = quiz.StartDateTime,
                endDateTime = quiz.EndDateTime,
                durationMinutes = quiz.DurationMinutes,
                passingPercentage = quiz.PassingPercentage,
                trainerName = trainerName,
                totalTrainees = enrollments.Count,
                presentCount = attendeesList.Count(a => ((dynamic)a).attendanceStatus == "حاضر"),
                excusedCount = attendeesList.Count(a => ((dynamic)a).attendanceStatus == "غائب بعذر"),
                absentCount = attendeesList.Count(a => ((dynamic)a).attendanceStatus == "غائب دون عذر"),
                trainees = attendeesList
            });
        }
    }
}
