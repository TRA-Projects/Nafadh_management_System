
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Services
{
   
    public interface IJwtTokenService
    {
        
        (string Token, DateTime ExpiresAtUtc) GenerateToken(NFD_User user);
    }
}
