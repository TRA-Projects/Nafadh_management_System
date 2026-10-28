using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Services;
using System.Globalization;
using Microsoft.EntityFrameworkCore;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BatchController : ControllerBase
    {
        private readonly IBatchService _service;
        private readonly IEmailService _emailService;
        private readonly INotificationService _notificationService;
        private readonly Nafadhcontext _context;

        public BatchController(
            IBatchService service,
            IEmailService emailService,
            INotificationService notificationService,
            Nafadhcontext context)
        {
            _service = service;
            _emailService = emailService;
            _notificationService = notificationService;
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] int? programId,
            [FromQuery] string? status,
            [FromQuery] DateTime? from,
            [FromQuery] DateTime? to)
        {
            var result = await _service.GetAllAsync(programId, status, from, to);
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _service.GetByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateBatchDto dto)
        {
            var result = await _service.CreateAsync(dto);
            await NotifyCompanyOnNewBatchAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = result.BatchId }, result);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateBatchDto dto)
        {
            var success = await _service.UpdateAsync(id, dto);
            if (!success) return NotFound();
            return NoContent();
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var success = await _service.DeleteAsync(id);
            if (!success) return NotFound();
            return NoContent();
        }

        [HttpGet("{id}/trainees")]
        public async Task<IActionResult> GetTrainees(int id)
        {
            var result = await _service.GetTraineesAsync(id);
            return Ok(result);
        }

        [HttpGet("{id}/capacity")]
        public async Task<IActionResult> GetCapacity(int id)
        {
            var result = await _service.GetCapacityAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpGet("{id}/progress")]
        public async Task<IActionResult> GetProgress(int id)
        {
            var result = await _service.GetProgressAsync(id);

            if (result == null)
                return NotFound();
            return Ok(result);
        }

        private async Task NotifyCompanyOnNewBatchAsync(CreateBatchDto dto)
        {
            if (!dto.CompanyId.HasValue || dto.CompanyId.Value <= 0)
                return;

            var company = await _context.NFD_Companies
                .Include(c => c.User)
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.CompanyId == dto.CompanyId.Value);

            if (company == null)
                return;

            var programTitle = await _context.NFD_Programs
                .AsNoTracking()
                .Where(p => p.ProgramId == dto.ProgramId)
                .Select(p => p.Title)
                .FirstOrDefaultAsync() ?? "برنامج تدريبي";

            if (company.UserId.HasValue)
            {
                try
                {
                    await _notificationService.CreateAsync(new CreateNotificationDTO
                    {
                        UserId = company.UserId.Value,
                        Title = "إسناد دفعة تدريبية جديدة لشركتكم",
                        Message = $"تم إسناد الدفعة «{dto.BatchName}» ضمن برنامج «{programTitle}» لشركتكم (من {dto.StartDate:yyyy-MM-dd} إلى {dto.EndDate:yyyy-MM-dd}).",
                        RelatedEntity = "Batch"
                    });
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Failed to create batch notification: {ex.Message}");
                }
            }

            string? validEmail = PickValidEmail(company.Email, company.User?.Email);
            if (string.IsNullOrWhiteSpace(validEmail))
                return;

            try
            {
                await _emailService.SendBatchAssignedToCompanyAsync(
                    validEmail,
                    company.CompanyName,
                    dto.BatchName,
                    programTitle,
                    dto.StartDate,
                    dto.EndDate,
                    dto.Capacity);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to send batch assignment email: {ex.Message}");
            }
        }

        private static string? PickValidEmail(params string?[] candidates)
        {
            foreach (var raw in candidates)
            {
                if (string.IsNullOrWhiteSpace(raw))
                    continue;

                var cleaned = new string(raw
                    .Where(c => !char.IsWhiteSpace(c) &&
                                char.GetUnicodeCategory(c) != UnicodeCategory.Format)
                    .ToArray());

                if (!string.IsNullOrWhiteSpace(cleaned) &&
                    cleaned.Contains('@') &&
                    !cleaned.EndsWith(".test", StringComparison.OrdinalIgnoreCase))
                {
                    return cleaned;
                }
            }

            return null;
        }
    }
}