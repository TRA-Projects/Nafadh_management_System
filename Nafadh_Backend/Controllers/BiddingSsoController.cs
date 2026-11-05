using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Nafadh_Backend.Repositories;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BiddingSsoController : ControllerBase
    {
        private readonly IBiddingTokenService _biddingTokenService;
        private readonly IUserRepository _userRepository;

        public BiddingSsoController(IBiddingTokenService biddingTokenService, IUserRepository userRepository)
        {
            _biddingTokenService = biddingTokenService;
            _userRepository = userRepository;
        }

        [HttpGet("token")]
        [Authorize]
        public async Task<IActionResult> GetBiddingToken()
        {
            // 1. قراءة بيانات المستخدم المسجل حالياً في نظام نفاذ
            var userIdStr = User.FindFirstValue(ClaimTypes.NameIdentifier)
                         ?? User.FindFirstValue("sub")
                         ?? User.FindFirstValue("userId")
                         ?? User.FindFirstValue("UserId");

            var email = User.FindFirstValue(ClaimTypes.Email)
                     ?? User.FindFirstValue("email")
                     ?? string.Empty;

            var role = User.FindFirstValue(ClaimTypes.Role)
                    ?? User.FindFirstValue("role")
                    ?? string.Empty;

            // احتياط: جلب الدور والإيميل من قاعدة نفاذ إذا لم تكن في الـ Claims
            if ((string.IsNullOrEmpty(role) || string.IsNullOrEmpty(email)) && int.TryParse(userIdStr, out var uid))
            {
                var dbUser = await _userRepository.GetByIdWithRoleAsync(uid);
                if (dbUser != null)
                {
                    if (string.IsNullOrEmpty(email)) email = dbUser.Email;
                    if (string.IsNullOrEmpty(role)) role = dbUser.Role?.RoleName ?? string.Empty;
                }
            }

            var id = int.TryParse(userIdStr, out var validId) ? validId : 0;
            var (token, expiresUtc) = _biddingTokenService.Generate(id, email, role);
            return Ok(new { token, expiresAtUtc = expiresUtc });
        }
    }
}