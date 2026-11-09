using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Services
{
    public class JwtTokenService : IJwtTokenService
    {
        private readonly IConfiguration _configuration;
        private readonly Nafadhcontext _context;

        public JwtTokenService(
            IConfiguration configuration,
            Nafadhcontext context)
        {
            _configuration = configuration;
            _context = context;
        }

        public async Task<(string Token, DateTime ExpiresAtUtc)> GenerateTokenAsync(NFD_User user)
        {
            var jwtSection = _configuration.GetSection("Jwt");
            var key = jwtSection["Key"]
                ?? throw new InvalidOperationException("Jwt:Key is not configured.");
            var issuer = jwtSection["Issuer"];
            var audience = jwtSection["Audience"];
            var expiryMinutes = jwtSection.GetValue<int?>("ExpiryMinutes") ?? 60;

            var setting = await _context.SystemVariables
                .AsNoTracking()
                .FirstOrDefaultAsync(v => v.VariableKey == "SessionTimeoutMinutes");

            if (setting != null &&
                int.TryParse(setting.Value, out int configuredMinutes) &&
                configuredMinutes > 0)
            {
                expiryMinutes = configuredMinutes;
            }

            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                new(JwtRegisteredClaimNames.Sub, user.UserId.ToString()),
                new(JwtRegisteredClaimNames.Email, user.Email),
                new(ClaimTypes.Name, user.FullName),
                new(ClaimTypes.Role, user.Role?.RoleName ?? string.Empty),
                new("roleId", user.RoleId.ToString()),
                new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            // The company ID must come from the database, not from a client request.
            if (string.Equals(user.Role?.RoleName, "CompanySupervisor", StringComparison.Ordinal))
            {
                // Verify the entity name and properties against your project's actual model.
                var companyIds = await _context.Set<NFD_CompanySupervisor>()
                    .AsNoTracking()
                    .Where(s => s.UserId == user.UserId)
                    .Select(s => s.CompanyId)
                    .Distinct()
                    .Take(2)
                    .ToListAsync();

                if (companyIds.Count != 1)
                {
                    throw new InvalidOperationException(
                        "Company supervisor must belong to exactly one company.");
                }

                claims.Add(new Claim("companyId", companyIds[0].ToString()));
            }

            var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
            var credentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);
            var expires = DateTime.UtcNow.AddMinutes(expiryMinutes);

            var token = new JwtSecurityToken(
                issuer: issuer,
                audience: audience,
                claims: claims,
                expires: expires,
                signingCredentials: credentials);

            var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
            return (tokenString, expires);
        }
    }
}
