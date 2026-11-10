
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TrainerSkillController : ControllerBase
    {
        private readonly Nafadhcontext _context;

        public TrainerSkillController(Nafadhcontext context)
        {
            _context = context;
        }

        [HttpGet("trainer/{trainerId:int}")]
        public async Task<IActionResult> GetByTrainer(int trainerId)
        {
            var skills = await _context.NFD_TrainerSkills
                .Where(x => x.TrainerId == trainerId)
                .OrderBy(x => x.SkillName)
                .Select(x => new
                {
                    x.TrainerSkillId,
                    x.SkillName
                })
                .ToListAsync();

            return Ok(skills);
        }

        public class AddSkillRequest
        {
            public string SkillName { get; set; } = string.Empty;
        }

        [HttpPost("trainer/{trainerId:int}")]
        public async Task<IActionResult> Add(
            int trainerId,
            [FromBody] AddSkillRequest request)
        {
            var name = request.SkillName?.Trim();

            if (string.IsNullOrWhiteSpace(name))
                return BadRequest(new { message = "اسم المهارة مطلوب." });

            if (name.Length > 200)
                return BadRequest(new { message = "اسم المهارة طويل جدًا." });

            var trainerExists = await _context.NFD_Trainers
                .AnyAsync(x => x.TrainerId == trainerId);

            if (!trainerExists)
                return NotFound(new { message = "المدرب غير موجود." });

            var exists = await _context.NFD_TrainerSkills
                .AnyAsync(x => x.TrainerId == trainerId &&
                               x.SkillName == name);

            if (exists)
                return Conflict(new { message = "المهارة موجودة مسبقًا." });

            var skill = new NFD_TrainerSkill
            {
                TrainerId = trainerId,
                SkillName = name
            };

            _context.NFD_TrainerSkills.Add(skill);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                skill.TrainerSkillId,
                skill.SkillName
            });
        }

        [HttpDelete("{skillId:int}")]
        public async Task<IActionResult> Delete(int skillId)
        {
            var skill = await _context.NFD_TrainerSkills
                .FindAsync(skillId);

            if (skill == null)
                return NotFound();

            _context.NFD_TrainerSkills.Remove(skill);
            await _context.SaveChangesAsync();

            return NoContent();
        }
    }
}
