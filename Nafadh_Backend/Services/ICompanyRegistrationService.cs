using Nafadh_Backend.DTOs;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Services
{
    public interface ICompanyRegistrationService
    {
        // Public: a new company registers itself (status PendingApproval, account not usable yet).
        Task<CompanyRegistrationResultDTO> RegisterAsync(CompanyRegistrationDTO dto);

        // Admin approval of a self-registered company: approves the company, activates its
        // supervisor account with a generated password and e-mails the credentials.
        // Returns false when the company has no pending self-registered account
        // (e.g. it was created by the Admin) so the caller keeps the legacy behaviour.
        Task<bool> TryApproveRegisteredCompanyAsync(int companyId);

        // Admin rejection: e-mails the reason to a self-registered company. Never throws on mail failure.
        Task NotifyRejectionAsync(int companyId, string reason);

        // Login gate: throws CompanyAccessDeniedException for a self-registered supervisor
        // whose company is still pending or was rejected. No-op for every other user.
        Task EnsureCompanyLoginAllowedAsync(NFD_User user);
    }
}
