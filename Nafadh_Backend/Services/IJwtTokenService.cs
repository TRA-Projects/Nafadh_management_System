
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Services
{
   
    public interface IJwtTokenService
    {

        Task<(string Token, DateTime ExpiresAtUtc)> GenerateTokenAsync(NFD_User user);
    }
}
