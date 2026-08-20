#nullable enable
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "CompanySupervisor")]
    public class CompanyAccountController : ControllerBase
    {
        private readonly Nafadhcontext _context;

        public CompanyAccountController(Nafadhcontext context)
        {
            _context = context;
        }

        [HttpGet("me")]
        [ProducesResponseType(typeof(CompanyAccountDto), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status401Unauthorized)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<CompanyAccountDto>> GetCurrentAccount()
        {
            var userIdValue = User.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? User.FindFirstValue(ClaimTypes.NameIdentifier.ToString())
                ?? User.FindFirstValue("sub");

            if (!int.TryParse(userIdValue, out var userId))
                return Unauthorized();

            var supervisor = await _context.NFD_CompanySupervisors
                .AsNoTracking()
                .Include(s => s.User)
                    .ThenInclude(u => u.Role)
                        .ThenInclude(r => r.RolePermissions)
                            .ThenInclude(rp => rp.Permission)
                .Include(s => s.Company)
                .FirstOrDefaultAsync(s => s.UserId == userId);

            if (supervisor is null || supervisor.User is null || supervisor.Company is null)
                return NotFound(new { message = "Company supervisor profile was not found for the authenticated user." });

            var logs = await _context.NFD_AuditLogs
                .AsNoTracking()
                .Where(x => x.UserId == userId)
                .OrderByDescending(x => x.Timestamp)
                .Take(5)
                .Select(x => new CompanyAccountActivityDto
                {
                    LogId = x.LogId,
                    Action = x.Action,
                    EntityName = x.EntityName,
                    EntityId = x.EntityId,
                    Details = x.Details,
                    Timestamp = x.Timestamp
                })
                .ToListAsync();

            var permissions = supervisor.User.Role?.RolePermissions
                .Select(rp => rp.Permission)
                .Where(p => p != null)
                .GroupBy(p => p!.PermissionId)
                .Select(g => g.First()!)
                .OrderBy(p => p.PermissionKey)
                .Select(p => new CompanyAccountPermissionDto
                {
                    PermissionId = p.PermissionId,
                    PermissionKey = p.PermissionKey,
                    Description = p.Description
                })
                .ToList() ?? new List<CompanyAccountPermissionDto>();

            var dto = new CompanyAccountDto
            {
                UserId = supervisor.User.UserId,
                FullName = supervisor.User.FullName,
                Email = supervisor.User.Email,
                Phone = supervisor.User.Phone,
                UserStatus = supervisor.User.Status.ToString(),
                CreatedAt = supervisor.User.CreatedAt,
                SupervisorId = supervisor.SupervisorId,
                CompanyId = supervisor.CompanyId,
                Department = supervisor.Department,
                Position = supervisor.Position,
                SupervisorStatus = supervisor.Status.ToString(),
                CompanyName = supervisor.Company.CompanyName,
                CompanyStatus = supervisor.Company.Status.ToString(),
                RoleName = supervisor.User.Role?.RoleName ?? string.Empty,
                Permissions = permissions,
                RecentActivities = logs,
                LastActivityAt = logs.Count > 0 ? logs[0].Timestamp : null
            };

            return Ok(dto);
        }
    }
}
