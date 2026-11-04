namespace Nafadh_Backend.Services
{
    /// <summary>
    /// Issues a token that Bidding_API accepts, signed with BiddingJwtSettings.
    /// One Nafadh login can therefore carry both tokens, so no second login is needed.
    /// </summary>
    public interface IBiddingTokenService
    {
        (string Token, DateTime ExpiresAtUtc) Generate(int userId, string? email, string? role);

        /// <summary>Same as Generate but returns null instead of throwing (used at login so a Bidding config problem never blocks Nafadh login).</summary>
        (string Token, DateTime ExpiresAtUtc)? TryGenerate(int userId, string? email, string? role);
    }
}
