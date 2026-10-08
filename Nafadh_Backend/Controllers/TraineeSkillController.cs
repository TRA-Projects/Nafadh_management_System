using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TraineeSkillController : ControllerBase
    {
        private readonly ITraineeSkillService _service;

        public TraineeSkillController(
            ITraineeSkillService service)
        {
            _service = service;
        }

        [HttpGet("trainee/{traineeId}")]
        public async Task<IActionResult> GetByTraineeId(
            int traineeId)
        {
            var skills =
                await _service.GetByTraineeId(traineeId);

            return Ok(skills);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var skill =
                await _service.GetById(id);

            if (skill == null)
            {
                return NotFound("Skill not found");
            }

            return Ok(skill);
        }

        [HttpPost]
        public async Task<IActionResult> Add(
            [FromForm] TraineeSkillInputDTO dto)
        {
            var result =
                await _service.Add(dto);

            return Ok(result);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(
            int id,
            [FromForm] TraineeSkillInputDTO dto)
        {
            var result =
                await _service.Update(id, dto);

            if (result == null)
            {
                return NotFound("Skill not found");
            }

            return Ok(result);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var result =
                await _service.Delete(id);

            if (!result)
            {
                return NotFound("Skill not found");
            }

            return Ok("Skill deleted successfully");
        }
    }
}