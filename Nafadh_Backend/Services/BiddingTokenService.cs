using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace Nafadh_Backend.Services
{
    public class BiddingTokenService : IBiddingTokenService
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<BiddingTokenService> _logger;

        public BiddingTokenService(IConfiguration configuration, ILogger<BiddingTokenService> logger)
        {
            _configuration = configuration;
            _logger = logger;
        }

        public (string Token, DateTime ExpiresAtUtc) Generate(int userId, string? email, string? role)
        {
            email ??= string.Empty;
            role ??= string.Empty;

            // ProfileId must be a positive integer for Bidding_API.
            var profileId = userId > 0 ? userId.ToString() : "1";

            var isAdmin = string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase)
                       || string.Equals(role, "SuperAdmin", StringComparison.OrdinalIgnoreCase)
                       || string.Equals(email, "admin@nafadh.om", StringComparison.OrdinalIgnoreCase);

            var secret = _configuration["BiddingJwtSettings:Secret"]
                ?? "TrainingModuleTrainingModuleTrainingModuleTrainingModuleTrainingModuleTrainingModule";
            var issuer = _configuration["BiddingJwtSettings:Issuer"] ?? "https://localhost:9494/";
            var audience = _configuration["BiddingJwtSettings:Audience"] ?? "https://localhost:9494/";
            var expiryMinutes = int.TryParse(_configuration["BiddingJwtSettings:ExpiryTimeInMinute"], out var mins) ? mins : 60;

            var key = new SymmetricSecurityKey(Encoding.ASCII.GetBytes(secret));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, profileId),
                new Claim(ClaimTypes.Name, email),
                new Claim(ClaimTypes.Email, email),
                new Claim(ClaimTypes.Role, isAdmin ? "Admin" : (string.IsNullOrWhiteSpace(role) ? "User" : role)),
                new Claim("ProfileId", profileId),
                new Claim("UserId", profileId),
                // 0 = Admin. Non-admin Nafadh users use 6 (Staff): 1 (FreeLancer) and 8 (JobSeeker)
                // push the caller through Bidding's JobSeekerOnboardingGate, which returns 403 EmailNotVerified.
                new Claim("VendorType", isAdmin ? "0" : "6")
            };

            // UtcNow: Bidding_API validates with ClockSkew = TimeSpan.Zero.
            var nowUtc = DateTime.UtcNow;
            var expiresUtc = nowUtc.AddMinutes(expiryMinutes);

            var jwt = new JwtSecurityToken(issuer, audience, claims, nowUtc, expiresUtc, credentials);
            return (new JwtSecurityTokenHandler().WriteToken(jwt), expiresUtc);
        }

        public (string Token, DateTime ExpiresAtUtc)? TryGenerate(int userId, string? email, string? role)
        {
            try { return Generate(userId, email, role); }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not issue Bidding token for user {UserId}", userId);
                return null;
            }
        }
    }
}
