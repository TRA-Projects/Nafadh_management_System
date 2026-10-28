
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TraineeEvaluationsController : ControllerBase
    {
        private readonly ITraineeEvaluationService _service;

        public TraineeEvaluationsController(
            ITraineeEvaluationService service)
        {
            _service = service;
        }

        // المدرب يحفظ التقييم كمسودة أو يعتمده
        [HttpPost("{attemptId:int}")]
        public async Task<IActionResult> SaveEvaluation(
            int attemptId,
            [FromQuery] int trainerId,
            [FromBody] SaveTraineeEvaluationDto dto)
        {
            try
            {
                await _service.SaveEvaluationAsync(
                    attemptId, trainerId, dto);

                return Ok(new
                {
                    message = dto.IsCompleted
                        ? "تم اعتماد تقييم المتدرب بنجاح"
                        : "تم حفظ التقييم كمسودة بنجاح"
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403,
                    new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return Conflict(new { message = ex.Message });
            }
        }

        // المتدرب يعرض تقييمه بعد الاعتماد
        [HttpGet("{attemptId:int}/trainee/{traineeId:int}")]
        public async Task<IActionResult> GetTraineeEvaluation(
            int attemptId,
            int traineeId)
        {
            try
            {
                var evaluation =
                    await _service.GetTraineeEvaluationAsync(
                        attemptId, traineeId);

                if (evaluation == null)
                {
                    return NotFound(new
                    {
                        message = "التقييم غير متاح بعد."
                    });
                }

                return Ok(evaluation);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403,
                    new { message = ex.Message });
            }
        }

        // المتدرب أو الإدارة تعرض التقييم الكلي (ملف الإنجاز)
        [HttpGet("{enrollmentId:int}/overall-evaluation")]
        public async Task<IActionResult> GetOverallEvaluation(int enrollmentId)
        {
            try
            {
                var result = await _service.GetTraineeOverallEvaluationAsync(enrollmentId);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "حدث خطأ أثناء جلب التقييم الكلي.", details = ex.Message });
            }
        }


    }
}
