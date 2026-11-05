using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Nafadh_Backend.Services;
using System.Security.Claims;

namespace Nafadh_Backend.Filters
{
    [AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
    public class RequirePagePermissionAttribute : Attribute, IAsyncAuthorizationFilter
    {
        private readonly string[] _pageCodes;
        private readonly string _requiredAction;

        public RequirePagePermissionAttribute(string pageCode, string requiredAction = "View")
        {
            _pageCodes = new[] { pageCode };
            _requiredAction = requiredAction;
        }

        public RequirePagePermissionAttribute(string[] pageCodes, string requiredAction = "View")
        {
            _pageCodes = pageCodes;
            _requiredAction = requiredAction;
        }

        public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
        {
            var user = context.HttpContext.User;
            if (user?.Identity?.IsAuthenticated != true)
            {
                context.Result = new UnauthorizedResult();
                return;
            }

            var email = user.FindFirst("email")?.Value
                     ?? user.FindFirst(ClaimTypes.Email)?.Value;

            var idStr = user.FindFirst("userId")?.Value
                     ?? user.FindFirst("UserId")?.Value
                     ?? user.FindFirst("sub")?.Value
                     ?? user.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            int? nfdUserId = int.TryParse(idStr, out var parsedId) ? parsedId : null;

            var permissionService = context.HttpContext.RequestServices
                .GetRequiredService<IPagePermissionService>();

            foreach (var code in _pageCodes)
            {
                var (allowed, dataScope) = await permissionService
                    .CheckAccessAsync(email, nfdUserId, code, _requiredAction);

                if (allowed)
                {
                    context.HttpContext.Items["PageDataScope"] = dataScope;
                    context.HttpContext.Items["MatchedPageCode"] = code;
                    return;
                }
            }

            context.Result = new ObjectResult(new
            {
                message = "ليس لديك صلاحية لتنفيذ هذا الإجراء على هذه الصفحة.",
                pageCodes = _pageCodes,
                requiredAction = _requiredAction
            })
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
        }
    }
}