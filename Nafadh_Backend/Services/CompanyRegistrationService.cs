using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Exceptions;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Services
{
    public class CompanyRegistrationService : ICompanyRegistrationService
    {
        private const string SupervisorRoleName = "CompanySupervisor";

        private readonly Nafadhcontext _context;
        private readonly IEmailService _emailService;
        private readonly ILogger<CompanyRegistrationService> _logger;

        public CompanyRegistrationService(
            Nafadhcontext context,
            IEmailService emailService,
            ILogger<CompanyRegistrationService> logger)
        {
            _context = context;
            _emailService = emailService;
            _logger = logger;
        }

        // ---------------------------------------------------------------------
        // Registration
        // ---------------------------------------------------------------------
        public async Task<CompanyRegistrationResultDTO> RegisterAsync(CompanyRegistrationDTO dto)
        {
            var email = dto.Email.Trim().ToLower();
            var companyName = dto.CompanyName.Trim();
            var commercialRegister = dto.CommercialRegister.Trim();
            var contactName = dto.ContactName.Trim();

            // Role is forced here — never taken from the client.
            var role = await _context.NFD_Roles
                .FirstOrDefaultAsync(r => r.RoleName == SupervisorRoleName)
                ?? throw new NotFoundException($"Role '{SupervisorRoleName}' is not configured.");

            var existingUser = await _context.NFD_Users
                .FirstOrDefaultAsync(u => u.Email == email);

            // A previously REJECTED self-registration may re-apply with the same e-mail.
            NFD_Company? rejectedCompany = null;
            NFD_CompanySupervisor? rejectedSupervisor = null;
            if (existingUser != null)
            {
                rejectedSupervisor = await _context.NFD_CompanySupervisors
                    .Include(s => s.Company)
                    .FirstOrDefaultAsync(s => s.UserId == existingUser.UserId);

                if (existingUser.Status == NFD_UserStatus.PendingVerification
                    && rejectedSupervisor?.Company.Status == NFD_CompanyStatus.Rejected)
                {
                    rejectedCompany = rejectedSupervisor.Company;
                }
                else if (existingUser.Status == NFD_UserStatus.PendingVerification
                    && rejectedSupervisor?.Company.Status == NFD_CompanyStatus.PendingApproval)
                {
                    throw new ConflictException("A registration request for this email is already waiting for approval.");
                }
                else
                {
                    throw new ConflictException($"An account with email '{dto.Email.Trim()}' already exists.");
                }
            }

            var crLower = commercialRegister.ToLower();
            var crTaken = await _context.NFD_Companies.AnyAsync(c =>
                c.CommercialRegister != null
                && c.CommercialRegister.ToLower() == crLower
                && (rejectedCompany == null || c.CompanyId != rejectedCompany.CompanyId));
            if (crTaken)
            {
                throw new ConflictException("A company with this commercial register is already registered.");
            }

            await using var tx = await _context.Database.BeginTransactionAsync();

            NFD_Company company;
            if (rejectedCompany != null)
            {
                // Re-application: refresh the same records and put them back in the queue.
                company = rejectedCompany;
                var user = existingUser!;
                user.FullName = contactName;
                user.Phone = dto.Phone;
            }
            else
            {
                var user = new NFD_User
                {
                    FullName = contactName,
                    Email = email,
                    // Unusable random password: the real one is generated on approval.
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(GeneratePassword(32)),
                    Phone = dto.Phone,
                    RoleId = role.RoleId,
                    Status = NFD_UserStatus.PendingVerification,
                    CreatedAt = DateTime.UtcNow
                };

                company = new NFD_Company();
                _context.NFD_Companies.Add(company);

                var supervisor = new NFD_CompanySupervisor
                {
                    User = user,
                    Company = company,
                    Position = "Company Supervisor",
                    Status = NFD_SupervisorStatus.Inactive
                };
                _context.NFD_CompanySupervisors.Add(supervisor);
                company.User = user;
            }

            company.CompanyName = companyName;
            company.CommercialRegister = commercialRegister;
            company.WorkField = dto.WorkField.Trim();
            company.Address = dto.Address?.Trim();
            company.Phone = dto.Phone;
            company.Email = email;
            company.Logo = dto.Logo;
            company.Capacity = dto.Capacity;
            company.Status = NFD_CompanyStatus.PendingApproval;
            company.ApprovalDate = null;
            company.RejectionReason = null;

            await _context.SaveChangesAsync();
            await tx.CommitAsync();

            return new CompanyRegistrationResultDTO
            {
                CompanyId = company.CompanyId,
                CompanyName = company.CompanyName,
                Email = email,
                Status = NFD_CompanyStatus.PendingApproval.ToString(),
                Message = "تم استلام طلب التسجيل وسيتم مراجعته. سيصلك قرار القبول أو الرفض على البريد الإلكتروني."
            };
        }

        // ---------------------------------------------------------------------
        // Approval
        // ---------------------------------------------------------------------
        public async Task<bool> TryApproveRegisteredCompanyAsync(int companyId)
        {
            var supervisor = await FindPendingSupervisorAsync(companyId);
            if (supervisor == null)
                return false;

            var company = supervisor.Company;
            var user = supervisor.User;
            var password = GeneratePassword(12);

            await using var tx = await _context.Database.BeginTransactionAsync();

            company.Status = NFD_CompanyStatus.Approved;
            company.ApprovalDate = DateTime.UtcNow;
            company.RejectionReason = null;
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(password);
            user.Status = NFD_UserStatus.Active;
            supervisor.Status = NFD_SupervisorStatus.Active;

            await _context.SaveChangesAsync();

            // If the mail cannot be sent, roll everything back: otherwise the account would be
            // active with a password nobody knows. The Admin can simply retry the approval.
            try
            {
                await _emailService.SendCompanyApprovedAsync(user.Email, company.CompanyName, user.FullName, password);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to send approval email for company {CompanyId}", companyId);
                await tx.RollbackAsync();
                throw new ConflictException("تعذّر إرسال بريد الاعتماد، لم يتم تغيير حالة الشركة. حاول مرة أخرى.");
            }

            await tx.CommitAsync();
            return true;
        }

        // ---------------------------------------------------------------------
        // Rejection
        // ---------------------------------------------------------------------
        public async Task NotifyRejectionAsync(int companyId, string reason)
        {
            var supervisor = await FindPendingSupervisorAsync(companyId);
            if (supervisor == null)
                return;

            try
            {
                await _emailService.SendCompanyRejectedAsync(
                    supervisor.User.Email,
                    supervisor.Company.CompanyName,
                    supervisor.User.FullName,
                    reason);
            }
            catch (Exception ex)
            {
                // The rejection itself is already saved; a mail failure must not undo it.
                _logger.LogError(ex, "Failed to send rejection email for company {CompanyId}", companyId);
            }
        }

        // ---------------------------------------------------------------------
        // Login gate
        // ---------------------------------------------------------------------
        public async Task EnsureCompanyLoginAllowedAsync(NFD_User user)
        {
            if (user.Status != NFD_UserStatus.PendingVerification)
                return;

            var supervisor = await _context.NFD_CompanySupervisors
                .Include(s => s.Company)
                .FirstOrDefaultAsync(s => s.UserId == user.UserId);

            if (supervisor == null)
                return;

            switch (supervisor.Company.Status)
            {
                case NFD_CompanyStatus.PendingApproval:
                    throw new CompanyAccessDeniedException(
                        CompanyAccessDeniedException.Pending,
                        "طلب تسجيل الشركة قيد المراجعة. سيصلك قرار القبول على البريد الإلكتروني.");
                case NFD_CompanyStatus.Rejected:
                    throw new CompanyAccessDeniedException(
                        CompanyAccessDeniedException.Rejected,
                        "تم رفض طلب تسجيل الشركة.",
                        supervisor.Company.RejectionReason);
            }
        }

        // ---------------------------------------------------------------------
        // Helpers
        // ---------------------------------------------------------------------
        // The self-registered (not yet activated) supervisor of a company, if any.
        private Task<NFD_CompanySupervisor?> FindPendingSupervisorAsync(int companyId)
        {
            return _context.NFD_CompanySupervisors
                .Include(s => s.Company)
                .Include(s => s.User)
                .FirstOrDefaultAsync(s =>
                    s.CompanyId == companyId
                    && s.User.Status == NFD_UserStatus.PendingVerification
                    && s.Company.Status != NFD_CompanyStatus.Approved);
        }

        // Cryptographically random password, no look-alike characters (0/O, 1/l/I).
        private static string GeneratePassword(int length)
        {
            const string upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
            const string lower = "abcdefghijkmnpqrstuvwxyz";
            const string digits = "23456789";
            const string symbols = "@#$%&*!";
            const string all = upper + lower + digits + symbols;

            var chars = new List<char>(length)
            {
                upper[RandomNumberGenerator.GetInt32(upper.Length)],
                lower[RandomNumberGenerator.GetInt32(lower.Length)],
                digits[RandomNumberGenerator.GetInt32(digits.Length)],
                symbols[RandomNumberGenerator.GetInt32(symbols.Length)]
            };
            while (chars.Count < length)
                chars.Add(all[RandomNumberGenerator.GetInt32(all.Length)]);

            // Fisher-Yates shuffle so the guaranteed characters are not always first.
            for (int i = chars.Count - 1; i > 0; i--)
            {
                int j = RandomNumberGenerator.GetInt32(i + 1);
                (chars[i], chars[j]) = (chars[j], chars[i]);
            }
            return new string(chars.ToArray());
        }
    }
}
