using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Services;
using System.Security.Claims;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/trainer/user-guide-progress")]
    [Authorize(Roles = "Trainer")]
    public class TrainerUserGuideProgressController : ControllerBase
    {
        private readonly IUserGuideProgressService _service;

        public TrainerUserGuideProgressController(
            IUserGuideProgressService service)
        {
            _service = service;
        }

        // Get the authenticated user's ID from JWT.
        private int? GetCurrentUserId()
        {
            var userIdValue =
                User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value;

            if (int.TryParse(userIdValue, out var userId) &&
                userId > 0)
            {
                return userId;
            }

            return null;
        }

        // GET: api/trainer/user-guide-progress
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var userId = GetCurrentUserId();

            if (userId == null)
                return Unauthorized();

            try
            {
                var result = await _service.GetTrainerAllAsync(
                    userId.Value);

                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound("Trainer profile was not found.");
            }
        }

        // GET: api/trainer/user-guide-progress/dashboard
        [HttpGet("{guideKey}")]
        public async Task<IActionResult> GetByGuide(string guideKey)
        {
            var userId = GetCurrentUserId();

            if (userId == null)
                return Unauthorized();

            if (string.IsNullOrWhiteSpace(guideKey) ||
                guideKey.Trim().Length > 100)
                return BadRequest("Invalid guide key.");

            try
            {
                var result = await _service.GetTrainerByGuideAsync(
                    userId.Value, guideKey);

                if (result == null)
                {
                    return Ok(new
                    {
                        GuideKey = guideKey.Trim(),
                        Status = "NotStarted"
                    });
                }

                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound("Trainer profile was not found.");
            }
        }

        // PUT: api/trainer/user-guide-progress/dashboard
        [HttpPut("{guideKey}")]
        public async Task<IActionResult> Save(
            string guideKey,
            [FromBody] SaveUserGuideProgressDto dto)
        {
            var userId = GetCurrentUserId();

            if (userId == null)
                return Unauthorized();

            if (string.IsNullOrWhiteSpace(guideKey) ||
                guideKey.Trim().Length > 100)
                return BadRequest("Invalid guide key.");

            if (dto == null)
                return BadRequest("Request body is required.");

            try
            {
                var result = await _service.SaveTrainerAsync(
                    userId.Value,
                    guideKey,
                    dto.Status);

                return Ok(result);
            }
            catch (KeyNotFoundException)
            {
                return NotFound("Trainer profile was not found.");
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
        }
    }
}