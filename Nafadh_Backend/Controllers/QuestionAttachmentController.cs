using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class QuestionAttachmentController : ControllerBase
    {
        private readonly IQuestionAttachmentService _service;
        private readonly IConfiguration _configuration;

        public QuestionAttachmentController(
            IQuestionAttachmentService service,
            IConfiguration configuration)
        {
            _service = service;
            _configuration = configuration;
        }

        // =====================================================
        // GET ATTACHMENTS BY QUESTION
        // GET: api/QuestionAttachment/question/{questionId}
        // =====================================================

        [HttpGet("question/{questionId}")]
        public async Task<IActionResult> GetByQuestion(int questionId)
        {
            var attachments =
                await _service.GetByQuestionIdAsync(questionId);

            return Ok(attachments);
        }

        // =====================================================
        // UPLOAD QUESTION ATTACHMENT
        // POST: api/QuestionAttachment/upload
        // =====================================================

        [HttpPost("upload")]
        [RequestFormLimits(MultipartBodyLengthLimit = 209715200)]
        public async Task<IActionResult> Upload(
            [FromForm] CreateQuestionAttachmentDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            if (dto.File == null || dto.File.Length == 0)
            {
                return BadRequest(new
                {
                    message = "File is required."
                });
            }

            // -------------------------------------------------
            // Storage settings
            // -------------------------------------------------

            var uploadsFolder =
                _configuration["Storage:QuestionAttachmentsPath"];

            if (string.IsNullOrWhiteSpace(uploadsFolder))
            {
                return StatusCode(
                    StatusCodes.Status500InternalServerError,
                    new
                    {
                        message =
                            "Question attachments storage path is not configured."
                    });
            }

            Directory.CreateDirectory(uploadsFolder);

            // -------------------------------------------------
            // Generate unique file name
            // -------------------------------------------------

            var extension =
                Path.GetExtension(dto.File.FileName);

            var fileName =
                $"{Guid.NewGuid()}{extension}";

            var fullPath =
                Path.Combine(
                    uploadsFolder,
                    fileName);

            // -------------------------------------------------
            // Save physical file
            // -------------------------------------------------

            await using (
                var stream =
                    new FileStream(
                        fullPath,
                        FileMode.Create))
            {
                await dto.File.CopyToAsync(stream);
            }

            // -------------------------------------------------
            // Build URL
            // -------------------------------------------------

            var requestPath =
                _configuration[
                    "Storage:QuestionAttachmentsRequestPath"];

            if (string.IsNullOrWhiteSpace(requestPath))
            {
                requestPath =
                    "/uploads/question-attachments";
            }

            requestPath =
                requestPath.TrimEnd('/');

            var fileUrl =
                $"{requestPath}/{fileName}";

            // -------------------------------------------------
            // Create database record
            // -------------------------------------------------

            var userIdClaim =
                User.FindFirst(
                    System.Security.Claims.ClaimTypes.NameIdentifier);

            int userId = 0;

            if (userIdClaim != null)
            {
                int.TryParse(
                    userIdClaim.Value,
                    out userId);
            }

            dto = new CreateQuestionAttachmentDto
            {
                QuestionId = dto.QuestionId,
                File = dto.File,
                FileUrl = fileUrl
            };

            var result =
                await _service.CreateAsync(
                    dto,
                    userId);

           
            return CreatedAtAction(
                nameof(GetDownloadUrl),
                new
                {
                    id = result.QuestionAttachmentId
                },
                result);
        }

        // =====================================================
        // GET DOWNLOAD URL
        // GET: api/QuestionAttachment/{id}/download
        // =====================================================

        [HttpGet("{id}/download")]
        public async Task<IActionResult> GetDownloadUrl(int id)
        {
            var url =
                await _service.GetDownloadUrlAsync(id);

            if (url == null)
            {
                return NotFound();
            }

            return Ok(new
            {
                DownloadUrl = url
            });
        }

        // =====================================================
        // DELETE ATTACHMENT
        // DELETE: api/QuestionAttachment/{id}
        // =====================================================

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var deleted =
                await _service.DeleteAsync(id);

            if (!deleted)
            {
                return NotFound();
            }

            return NoContent();
        }
    }
}