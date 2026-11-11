using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace Nafadh_Backend.Controllers
{
    /// <summary>
    /// Company portal read/reply surface for existing Admin-issued Company-scope warnings.
    /// Does not create warning types or alter Admin warning routes or database schema.
    /// Enrollment/trainee warnings are intentionally excluded (they remain in Dashboard).
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "CompanySupervisor")]
    public class CompanyAdministrativeWarningsController : ControllerBase
    {
        private readonly Nafadhcontext _context;

        public CompanyAdministrativeWarningsController(Nafadhcontext context)
        {
            _context = context;
        }

        [HttpGet("{companyId:int}")]
        public async Task<IActionResult> Get(int companyId)
        {
            var access = await CheckCompanyAccessAsync(companyId);
            if (access is not null) return access;

            var warnings = await _context.NFD_Warnings
                .AsNoTracking()
                .Where(w => w.Scope == NFD_WarningScope.Company && w.CompanyId == companyId)
                .OrderByDescending(w => w.IssuedDate)
                .Select(w => new WarningDetailsDTO
                {
                    WarningId = w.WarningId,
                    Scope = w.Scope,
                    EnrollmentId = w.EnrollmentId,
                    CompanyId = w.CompanyId,
                    TargetName = w.Company != null ? w.Company.CompanyName : null,
                    Type = w.Type,
                    Level = w.Level,
                    Evidence = w.Evidence,
                    Status = w.Status,
                    Resolution = w.Resolution,
                    IssuedDate = w.IssuedDate,
                    RaisedByUserId = w.RaisedByUserId,
                    RaisedByName = w.User.FullName,
                    CompanyReply = w.CompanyReply
                })
                .ToListAsync();

            return Ok(warnings);
        }

        public sealed class CompanyReplyRequest
        {
            [Required]
            [MaxLength(500)]
            public string Reply { get; set; } = string.Empty;
        }

        [HttpPut("{companyId:int}/{warningId:int}/reply")]
        public async Task<IActionResult> Reply(int companyId, int warningId, [FromBody] CompanyReplyRequest input)
        {
            var access = await CheckCompanyAccessAsync(companyId);
            if (access is not null) return access;

            if (string.IsNullOrWhiteSpace(input.Reply))
                return BadRequest(new { message = "Reply is required." });

            var warning = await _context.NFD_Warnings.FirstOrDefaultAsync(w =>
                w.WarningId == warningId &&
                w.Scope == NFD_WarningScope.Company &&
                w.CompanyId == companyId);

            if (warning is null) return NotFound();

            // Same field and semantics as the existing Admin/Warning system.
            warning.CompanyReply = input.Reply.Trim();
            await _context.SaveChangesAsync();

            return Ok(new { message = "Company reply saved successfully." });
        }

        private async Task<IActionResult?> CheckCompanyAccessAsync(int companyId)
        {
            var userClaim = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue("sub");
            if (!int.TryParse(userClaim, out var userId)) return Unauthorized();

            var belongs = await _context.NFD_CompanySupervisors.AsNoTracking()
                .AnyAsync(s => s.UserId == userId && s.CompanyId == companyId &&
                    s.Status == NFD_SupervisorStatus.Active);
            return belongs ? null : Forbid();
        }
    }
}
