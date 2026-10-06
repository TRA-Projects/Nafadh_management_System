

using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Interfaces;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class LessonFeedbackController : ControllerBase
    {
        private readonly ILessonFeedbackService _service;

        public LessonFeedbackController(
            ILessonFeedbackService service)
        {
            _service = service;
        }

        [HttpGet("lesson/{lessonId:int}")]
        public async Task<IActionResult> Get(int lessonId)
        {
            var userId = GetCurrentUserId();

            var result = await _service.GetAsync(
                userId,
                lessonId);

            if (result == null)
            {
                return NotFound(new
                {
                    message = "No feedback found for this lesson."
                });
            }

            return Ok(result);
        }

        [HttpPost("lesson/{lessonId:int}")]
        public async Task<IActionResult> Create(
            int lessonId,
            [FromBody] LessonFeedbackCreateDTO dto)
        {
            var userId = GetCurrentUserId();

            var result = await _service.CreateAsync(
                userId,
                lessonId,
                dto);

            return CreatedAtAction(
                nameof(Get),
                new { lessonId },
                result);
        }

        [HttpPut("lesson/{lessonId:int}")]
        public async Task<IActionResult> Update(
            int lessonId,
            [FromBody] LessonFeedbackUpdateDTO dto)
        {
            var userId = GetCurrentUserId();

            var result = await _service.UpdateAsync(
                userId,
                lessonId,
                dto);

            return Ok(result);
        }

        private int GetCurrentUserId()
        {
            var userIdValue =
                User.FindFirstValue(ClaimTypes.NameIdentifier);

            if (!int.TryParse(userIdValue, out var userId))
            {
                throw new UnauthorizedAccessException(
                    "User ID was not found in the authentication token.");
            }

            return userId;
        }
    }
}