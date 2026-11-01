using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using System.Security.Claims;

namespace Nafadh_Backend.Controllers;

[ApiController]
[Route("api/CompanyDashboard")]
[Authorize(Roles = "CompanySupervisor")]
public class CompanyDashboardAnnouncementsController : ControllerBase
{
    private readonly Nafadhcontext _context;
    public CompanyDashboardAnnouncementsController(Nafadhcontext context) => _context = context;

    [HttpGet("{companyId:int}/announcements")]
    [ResponseCache(NoStore = true, Location = ResponseCacheLocation.None)]
    public async Task<ActionResult<List<AnnouncementDTO>>> Get(int companyId, CancellationToken cancellationToken)
    {
        var subject = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
        if (!int.TryParse(subject, out var userId)) return Unauthorized();
        if (companyId <= 0 || !await _context.NFD_CompanySupervisors.AsNoTracking()
            .AnyAsync(s => s.UserId == userId && s.CompanyId == companyId, cancellationToken))
            return Forbid();

        // Only announcements authored by an administrator, addressed to everyone,
        // all companies (null ScopeId), or this particular company.
        var items = await _context.NFD_Announcements.AsNoTracking()
            .Where(a => a.User.Role.RoleName == "Admin" &&
                ((a.ScopeType == NFD_AnnouncementScopeType.Platform && a.ScopeId == null) ||
                 (a.ScopeType == NFD_AnnouncementScopeType.Company &&
                    (a.ScopeId == null || a.ScopeId == companyId))))
            .OrderByDescending(a => a.Date).ThenByDescending(a => a.AnnouncementId)
            .Select(a => new AnnouncementDTO
            {
                AnnouncementId = a.AnnouncementId,
                ScopeType = a.ScopeType,
                ScopeId = a.ScopeId,
                Message = a.Message,
                Date = a.Date,
                CreatedByUserId = a.CreatedByUserId
            }).ToListAsync(cancellationToken);
        return Ok(items);
    }
}
