
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Middleware
{
    public class MaintenanceModeMiddleware
    {
        private readonly RequestDelegate _next;

        public MaintenanceModeMiddleware(RequestDelegate next)
        {
            _next = next;
        }

        public async Task InvokeAsync(
            HttpContext context,
            Nafadhcontext db)
        {
            var path = context.Request.Path;

            // Allow login so administrators can access the system.
            if (path.Equals(
     "/api/User/login",
     StringComparison.OrdinalIgnoreCase))
            {
                await _next(context);
                return;
            }

            var setting = await db.SystemVariables
                .AsNoTracking()
                .FirstOrDefaultAsync(v =>
                    v.VariableKey == "MaintenanceMode");

            bool isMaintenance =
                string.Equals(
                    setting?.Value?.Trim(),
                    "true",
                    StringComparison.OrdinalIgnoreCase);

            if (!isMaintenance)
            {
                await _next(context);
                return;
            }

            // Administrators can access the system during maintenance.
            if (context.User.Identity?.IsAuthenticated == true &&
                context.User.IsInRole("Admin"))
            {
                await _next(context);
                return;
            }

            context.Response.StatusCode =
                StatusCodes.Status503ServiceUnavailable;

            await context.Response.WriteAsJsonAsync(new
            {
                message = "النظام تحت الصيانة حاليًا. يرجى المحاولة لاحقًا."
            });
        }
    }
}
