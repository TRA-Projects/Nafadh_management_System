
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
                .Select(q => new
                {
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

            // 1. جلب متدربي الدفعة
            var enrollments = await context.NFD_Enrollments
                .Where(e => e.BatchId == quiz.BatchId)
                .Include(e => e.Trainee)
                    .ThenInclude(t => t.User)
                .ToListAsync();

            var enrollmentIds = enrollments.Select(e => e.EnrollmentId).ToList();
            var examDate = quiz.StartDateTime.Date;

            // 2. تحسين الأداء: جلب الحضور اليومي والأعذار دفعة واحدة في استعلام واحد بدلاً من تكراره باللوب
            var dailyAttendances = await context.NFD_DailyAttendances
                .Where(da => enrollmentIds.Contains(da.EnrollmentId) && da.Date.Date == examDate)
                .ToListAsync();

            var attendanceIds = dailyAttendances.Select(da => da.DailyAttendanceId).ToList();
            var excuses = await context.NFD_Excuses
                .Where(ex => attendanceIds.Contains(ex.DailyAttendanceId))
                .ToListAsync();

            string trainerName = quiz.Trainer?.User?.FullName ?? "المدرب المسؤول";
            var attendeesList = new List<object>();

            foreach (var enrollment in enrollments)
            {
                var trainee = enrollment.Trainee;

                // المحاولة: هل دخل الاختبار؟
                var attempt = quiz.Attempts
                    .Where(a => a.TraineeId == trainee.TraineeId)
                    .OrderByDescending(a => a.Score)
                    .FirstOrDefault();

                // 🟢 فحص سليم يشمل InProgress و Submitted معاً
                bool hasAttempt = attempt != null && (
                    attempt.Status == "Submitted" ||
                    attempt.Status == "InProgress" ||
                    attempt.Status == "Started" ||
                    attempt.SubmittedAt != null
                );

                var dailyAttendance = dailyAttendances.FirstOrDefault(da => da.EnrollmentId == enrollment.EnrollmentId);
                var excuse = dailyAttendance != null
                    ? excuses.FirstOrDefault(ex => ex.DailyAttendanceId == dailyAttendance.DailyAttendanceId)
                    : null;

                // تحديد الحالة الأكاديمية بدقة
                string attendanceStatus = "حاضر";
                string excuseStatusEnum = "None";

                if (!hasAttempt)
                {
                    if (dailyAttendance != null && dailyAttendance.Status == NFD_AttendanceStatus.Excused && excuse != null)
                    {
                        attendanceStatus = "غائب بعذر";
                        excuseStatusEnum = excuse.Status == NFD_ExcuseStatus.Approved ? "Approved" :
                                          (excuse.Status == NFD_ExcuseStatus.Rejected ? "Rejected" : "PendingReview");
                    }
                    else
                    {
                        attendanceStatus = "غائب دون عذر";
                    }
                }

                // تحديد حالة النتيجة (Passed / Failed / Absent)
                string resultStatus = "Absent";
                if (hasAttempt && attempt != null)
                {
                    resultStatus = attempt.Percentage >= quiz.PassingPercentage ? "Passed" : "Failed";
                }

                attendeesList.Add(new
                {
                    attemptId = attempt?.AttemptId ?? 0,
                    traineeId = trainee.TraineeId,
                    traineeName = trainee.User?.FullName ?? "متدرب",
                    traineeAvatar = (string?)null,
                    attendanceStatus = attendanceStatus,
                    status = resultStatus,
                    submittedAt = attempt?.SubmittedAt,
                    score = attempt != null ? (decimal?)attempt.Score : null,
                    totalScore = 100,
                    percentage = attempt != null ? (decimal?)attempt.Percentage : null,

                    // رصد النزاهة من ViolationCount الحقيقي في قاعدة البيانات
                    cheatingRiskPercentage = attempt != null ? Math.Min(attempt.ViolationCount * 25, 100) : 0,
                    tabSwitchCount = attempt?.ViolationCount ?? 0,
                    cameraDisconnectionsCount = 0,

                    // العذر
                    hasExcuse = excuse != null,
                    excuseReason = excuse?.Reason,
                    excuseAttachmentUrl = excuse?.ProofUrl,
                    excuseStatus = excuseStatusEnum,

                    notes = attempt != null ? (attempt.IsTerminatedByViolation ? "تم إنهاء المحاولة لتكرار المخالفات." : null) : null,
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
