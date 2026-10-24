using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BiddingSsoController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly IUserRepository _userRepository;

        public BiddingSsoController(IConfiguration configuration, IUserRepository userRepository)
        {
            _configuration = configuration;
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

            // ProfileId يجب أن يكون رقماً صحيحاً موجباً
            var profileId = int.TryParse(userIdStr, out var validId) && validId > 0
                ? validId.ToString()
                : "1";

            // التحقق هل المستخدم Admin لإعطائه VendorType = "0"
            var isAdmin = string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase)
                       || string.Equals(role, "SuperAdmin", StringComparison.OrdinalIgnoreCase)
                       || string.Equals(email, "admin@nafadh.om", StringComparison.OrdinalIgnoreCase);

            // 2. قراءة إعدادات توقيع Bidding_API
            var secret = _configuration["BiddingJwtSettings:Secret"]
                ?? "TrainingModuleTrainingModuleTrainingModuleTrainingModuleTrainingModuleTrainingModule";
            var issuer = _configuration["BiddingJwtSettings:Issuer"]
                ?? "https://localhost:9494/";
            var audience = _configuration["BiddingJwtSettings:Audience"]
                ?? "https://localhost:9494/";
            var expiryMinutes = int.TryParse(_configuration["BiddingJwtSettings:ExpiryTimeInMinute"], out var mins)
                ? mins
                : 60;

            var securityKey = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(secret));
            var credentials = new SigningCredentials(securityKey, SecurityAlgorithms.HmacSha256);

            // 3. بناء الـ Claims المطلوبة من Bidding_API
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, profileId),
                new Claim(ClaimTypes.Name, email),
                new Claim(ClaimTypes.Email, email),
                new Claim(ClaimTypes.Role, isAdmin ? "Admin" : (string.IsNullOrWhiteSpace(role) ? "User" : role)),
                new Claim("ProfileId", profileId),
                new Claim("VendorType", isAdmin ? "0" : "1")
            };

            // استخدام UtcNow لأن ClockSkew = TimeSpan.Zero في Bidding_API
            var nowUtc = DateTime.UtcNow;
            var expiresUtc = nowUtc.AddMinutes(expiryMinutes);

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                notBefore: nowUtc,
                expires: expiresUtc,
                signingCredentials: credentials
            );

            return Ok(new
            {
                token = new JwtSecurityTokenHandler().WriteToken(token),
                expiresAtUtc = expiresUtc
            });
        }
    }
}