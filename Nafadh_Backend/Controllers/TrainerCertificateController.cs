using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TrainerCertificateController : ControllerBase
    {
        private readonly ITrainerCertificateService _service;

        public TrainerCertificateController(ITrainerCertificateService service)
        {
            _service = service;
        }

        [HttpGet("trainer/{trainerId:int}")]
        public async Task<IActionResult> GetByTrainer(int trainerId)
        {
            var result = await _service.GetByTrainerIdAsync(trainerId);
            return Ok(result);
        }

        [HttpPost("trainer/{trainerId:int}")]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(10 * 1024 * 1024)]
        public async Task<IActionResult> Add(
            int trainerId,
            [FromForm] CreateTrainerCertificateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                var result = await _service.AddAsync(
                    trainerId,
                    dto.CertificateName,
                    dto.Issuer,
                    dto.IssueDate,
                    dto.ExpiryDate,
                    dto.File);

                if (result == null)
                    return NotFound(new { message = "المدرب غير موجود." });

                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var deleted = await _service.DeleteAsync(id);
            if (!deleted)
                return NotFound(new { message = "الشهادة غير موجودة." });

            return NoContent();
        }
    }
}