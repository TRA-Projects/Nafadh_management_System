using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.Services;
using System.Security.Claims;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PagePermissionController : ControllerBase
    {
        private readonly IPagePermissionService _permissionService;

        public PagePermissionController(IPagePermissionService permissionService)
        {
            _permissionService = permissionService;
        }

        [HttpGet]
        public async Task<IActionResult> GetUserPermissions()
        {
            var (email, nfdUserId) = ExtractUserIdentity();
            var pages = await _permissionService.GetMyPermissionsAsync(email, nfdUserId);
            return Ok(pages);
        }

        [HttpGet("check")]
        public async Task<IActionResult> CheckPermission([FromQuery] string pageCode, [FromQuery] string action = "View")
        {
            var (email, nfdUserId) = ExtractUserIdentity();
            var (allowed, dataScope) = await _permissionService.CheckAccessAsync(email, nfdUserId, pageCode, action);

            return Ok(new
            {
                pageCode,
                action,
                allowed,
                dataScope
            });
        }

        private (string? Email, int? NfdUserId) ExtractUserIdentity()
        {
            var email = User.FindFirst("email")?.Value
                     ?? User.FindFirst(ClaimTypes.Email)?.Value;

            var idStr = User.FindFirst("userId")?.Value
                     ?? User.FindFirst("sub")?.Value
                     ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            int? nfdUserId = int.TryParse(idStr, out var parsedId) ? parsedId : null;
            return (email, nfdUserId);
        }
    }
}