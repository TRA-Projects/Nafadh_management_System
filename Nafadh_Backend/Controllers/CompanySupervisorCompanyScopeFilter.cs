using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.Controllers;

/// <summary>Scopes legacy company supervisor endpoints to the authenticated company.</summary>
public sealed class CompanySupervisorCompanyScopeFilter : IAsyncActionFilter
{
    private readonly Nafadhcontext _db;
    public CompanySupervisorCompanyScopeFilter(Nafadhcontext db) => _db = db;

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var user = context.HttpContext.User;
        if (user.IsInRole("Admin") || user.IsInRole("SuperAdmin"))
        {
            await next();
            return;
        }
        if (!user.IsInRole("CompanySupervisor") ||
            !int.TryParse(user.FindFirstValue(ClaimTypes.NameIdentifier), out var currentUserId))
        {
            context.Result = new ForbidResult();
            return;
        }

        var companyIds = await _db.NFD_CompanySupervisors.AsNoTracking()
            .Where(x => x.UserId == currentUserId && x.Status == NFD_SupervisorStatus.Active)
            .Select(x => x.CompanyId).Distinct().Take(2).ToListAsync();
        if (companyIds.Count != 1)
        {
            context.Result = new ForbidResult();
            return;
        }
        var companyId = companyIds[0];
        var action = context.ActionDescriptor.RouteValues.TryGetValue("action", out var actionName) ? actionName : "";

        // Old unrestricted list and create endpoints are admin-only. Company creation uses /api/company-staff/supervisors.
        if (action is "GetAllSupervisors" or "AddSupervisor")
        {
            context.Result = new ForbidResult();
            return;
        }

        if (context.ActionArguments.TryGetValue("companyId", out var companyValue) &&
            (companyValue is not int requestedCompany || requestedCompany != companyId))
        {
            context.Result = new ForbidResult();
            return;
        }

        object? possibleId = null;
        if (context.ActionArguments.TryGetValue("supervisorId", out var supervisorId))
            possibleId = supervisorId;
        else if (context.ActionArguments.TryGetValue("id", out var id))
            possibleId = id;
        if (possibleId is int supervisorKey)
        {
            var belongs = await _db.NFD_CompanySupervisors.AsNoTracking()
                .AnyAsync(x => x.SupervisorId == supervisorKey && x.CompanyId == companyId);
            if (!belongs)
            {
                context.Result = new NotFoundResult();
                return;
            }
        }
        await next();
    }
}
