
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Services;
using Nafadh_Backend.Models;

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
    }
}
