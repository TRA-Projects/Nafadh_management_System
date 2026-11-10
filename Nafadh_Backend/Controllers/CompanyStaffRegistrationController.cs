using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers;

/// <summary>Company-scoped supervisor registration. The role and company are server-controlled.</summary>
[ApiController]
[Route("api/company-staff")]
[Authorize(Roles = "CompanySupervisor")]
public sealed class CompanyStaffRegistrationController : ControllerBase
{
    private readonly Nafadhcontext _db;
    private readonly IUserService _users;
    private readonly IEmailService _email;
    private readonly ILogger<CompanyStaffRegistrationController> _logger;

    public CompanyStaffRegistrationController(Nafadhcontext db, IUserService users, IEmailService email, ILogger<CompanyStaffRegistrationController> logger)
    {
        _db = db;
        _users = users;
        _email = email;
        _logger = logger;
    }

    public sealed class NewSupervisorRequest
    {
        [Required, MaxLength(150)] public string FullName { get; set; } = "";
        [Required, EmailAddress, MaxLength(150)] public string Email { get; set; } = "";
        [MaxLength(20)] public string? Phone { get; set; }
        [MaxLength(100)] public string? Department { get; set; }
        [MaxLength(100)] public string? Position { get; set; }
    }

    [HttpPost("supervisors")]
    public async Task<IActionResult> CreateSupervisor([FromBody] NewSupervisorRequest request)
    {
        var rawId = User.FindFirst("userId")?.Value ?? User.FindFirst("UserId")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(rawId, out var currentUserId) || currentUserId <= 0)
            return Forbid();

        // Never trust companyId or RoleId from the browser.
        var companyIds = await _db.NFD_CompanySupervisors.AsNoTracking()
            .Where(x => x.UserId == currentUserId && x.Status == NFD_SupervisorStatus.Active)
            .Select(x => x.CompanyId).Distinct().Take(2).ToListAsync();
        if (companyIds.Count != 1) return Forbid();
        var companyId = companyIds[0];
        var companyName = await _db.NFD_Companies.AsNoTracking()
            .Where(c => c.CompanyId == companyId).Select(c => c.CompanyName).SingleAsync();

        if (string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { message = "اسم المشرف والبريد الإلكتروني مطلوبان." });
        // Validation runs on both browser and server; preserve database limits after trimming.
        if (request.FullName.Trim().Length > 150 || request.Email.Trim().Length > 150 ||
            request.Phone?.Trim().Length > 20 || request.Department?.Trim().Length > 100 ||
            request.Position?.Trim().Length > 100)
            return BadRequest(new { message = "تجاوز أحد الحقول الحد المسموح." });
        if (string.IsNullOrWhiteSpace(request.FullName) || request.FullName.Trim().Length < 2)
            return BadRequest(new { message = "الاسم يجب أن يتكون من حرفين على الأقل." });
        var email = request.Email.Trim().ToLowerInvariant();
        if (await _db.NFD_Users.AnyAsync(u => u.Email.ToLower() == email))
            return Conflict(new { message = "البريد الإلكتروني مستخدم بالفعل؛ لا يمكن إنشاء حساب مكرر." });

        var role = await _db.NFD_Roles.AsNoTracking().FirstOrDefaultAsync(r => r.RoleName == "CompanySupervisor");
        if (role == null) return Conflict(new { message = "دور مشرف الشركة غير مهيأ في النظام." });

        // RegisterAsync enforces server-side password rules. Database uniqueness must also
        // be enforced by a unique index to prevent concurrent duplicate email requests.
        var temporaryPassword = await GenerateTemporaryPasswordAsync();
        await using var tx = await _db.Database.BeginTransactionAsync();
        // Uses the established password policy, BCrypt hashing and user creation service.
        try
        {
            var user = await _users.RegisterAsync(new UserRegisterationDTO
            {
                FullName = request.FullName.Trim(), Email = email, Password = temporaryPassword,
                Phone = request.Phone?.Trim(), RoleId = role.RoleId
            });
            var supervisor = new NFD_CompanySupervisor
            {
                UserId = user.UserId, CompanyId = companyId,
                Department = request.Department?.Trim(), Position = request.Position?.Trim(),
                Status = NFD_SupervisorStatus.Active
            };
            _db.NFD_CompanySupervisors.Add(supervisor);
            await _db.SaveChangesAsync();
            await tx.CommitAsync();
            // The account is committed independently from SMTP. Never retry account creation on mail failure.
            var emailSent = await SendWelcomeSafelyAsync(email, request.FullName.Trim(), companyName, false, temporaryPassword);
            return Ok(new { supervisorId = supervisor.SupervisorId, userId = user.UserId, emailSent,
                message = emailSent ? "تم إنشاء المشرف وإرسال بيانات الدخول." : "تم إنشاء المشرف ولكن تعذر إرسال البريد؛ تواصل مع الدعم قبل محاولة إعادة التسجيل." });
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sql &&
            (sql.Number == 2601 || sql.Number == 2627))
        {
            await tx.RollbackAsync();
            return Conflict(new { message = "هذا البريد أو حساب المشرف مسجل بالفعل." });
        }
    }

    public sealed class NewTrainerRequest
    {
        [Required, MaxLength(150)] public string FullName { get; set; } = "";
        [Required, EmailAddress, MaxLength(150)] public string Email { get; set; } = "";
        [MaxLength(20)] public string? Phone { get; set; }
        [Required, MaxLength(150)] public string Specialty { get; set; } = "";
        [Range(0, 100)] public decimal ExperienceYears { get; set; }
        public string? Biography { get; set; }
        [MaxLength(300)] public string? CVUrl { get; set; }
    }

    [HttpPost("trainers")]
    public async Task<IActionResult> CreateTrainer([FromBody] NewTrainerRequest request)
    {
        var rawId = User.FindFirst("userId")?.Value ?? User.FindFirst("UserId")?.Value
            ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!int.TryParse(rawId, out var currentUserId) || currentUserId <= 0) return Forbid();
        var companyIds = await _db.NFD_CompanySupervisors.AsNoTracking()
            .Where(s => s.UserId == currentUserId && s.Status == NFD_SupervisorStatus.Active)
            .Select(s => s.CompanyId).Distinct().Take(2).ToListAsync();
        if (companyIds.Count != 1) return Forbid();
        var companyId = companyIds[0];
        var companyName = await _db.NFD_Companies.AsNoTracking()
            .Where(c => c.CompanyId == companyId).Select(c => c.CompanyName).SingleAsync();
        if (string.IsNullOrWhiteSpace(request.FullName) || string.IsNullOrWhiteSpace(request.Email)
            || string.IsNullOrWhiteSpace(request.Specialty))
            return BadRequest(new { message = "الاسم والبريد والتخصص مطلوبة." });
        if (request.FullName.Trim().Length > 150 || request.Email.Trim().Length > 150 ||
            request.Specialty.Trim().Length > 150 || request.Phone?.Trim().Length > 20 ||
            request.CVUrl?.Trim().Length > 300)
            return BadRequest(new { message = "تجاوز أحد الحقول الحد المسموح." });

        if (string.IsNullOrWhiteSpace(request.FullName) || request.FullName.Trim().Length < 2)
            return BadRequest(new { message = "الاسم يجب أن يتكون من حرفين على الأقل." });
        var email = request.Email.Trim().ToLowerInvariant();
        if (await _db.NFD_Users.AnyAsync(u => u.Email.ToLower() == email))
            return Conflict(new { message = "البريد الإلكتروني مستخدم بالفعل." });
        if (request.Specialty.Trim().Length < 2)
            return BadRequest(new { message = "يرجى إدخال تخصص صحيح." });
        if (!string.IsNullOrWhiteSpace(request.CVUrl) &&
            (!Uri.TryCreate(request.CVUrl.Trim(), UriKind.Absolute, out var cvUri) ||
             (cvUri.Scheme != Uri.UriSchemeHttps && cvUri.Scheme != Uri.UriSchemeHttp)))
            return BadRequest(new { message = "رابط السيرة الذاتية يجب أن يبدأ بـ https أو http." });
        var role = await _db.NFD_Roles.AsNoTracking().FirstOrDefaultAsync(r => r.RoleName == "Trainer");
        if (role == null) return Conflict(new { message = "دور المدرب غير مهيأ في النظام." });

        var temporaryPassword = await GenerateTemporaryPasswordAsync();
        await using var tx = await _db.Database.BeginTransactionAsync();
        try
        {
            var user = await _users.RegisterAsync(new UserRegisterationDTO
            {
                FullName = request.FullName.Trim(), Email = email, Password = temporaryPassword,
                Phone = request.Phone?.Trim(), RoleId = role.RoleId
            });
            var trainer = new NFD_Trainer
            {
                UserId = user.UserId, CompanyId = companyId,
                Specialty = request.Specialty.Trim(), ExperienceYears = request.ExperienceYears,
                Biography = request.Biography?.Trim(), CVUrl = request.CVUrl?.Trim(),
                Status = NFD_TrainerStatus.Active
            };
            _db.NFD_Trainers.Add(trainer);
            await _db.SaveChangesAsync();
            await tx.CommitAsync();
            var emailSent = await SendWelcomeSafelyAsync(email, request.FullName.Trim(), companyName, true, temporaryPassword);
            return Ok(new { trainerId = trainer.TrainerId, userId = user.UserId, emailSent,
                message = emailSent ? "تم إنشاء المدرب وإرسال بيانات الدخول." : "تم إنشاء المدرب ولكن تعذر إرسال البريد؛ تواصل مع الدعم قبل محاولة إعادة التسجيل." });
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sql &&
            (sql.Number == 2601 || sql.Number == 2627))
        {
            await tx.RollbackAsync();
            return Conflict(new { message = "حساب المدرب مسجل بالفعل." });
        }
    }
    private async Task<string> GenerateTemporaryPasswordAsync()
    {
        var value = await _db.SystemVariables.AsNoTracking()
            .Where(v => v.VariableKey == "MinPasswordLength")
            .Select(v => v.Value).FirstOrDefaultAsync();
        if (!int.TryParse(value, out var configuredLength) || configuredLength < 1 || configuredLength > 128)
            throw new InvalidOperationException("Password policy MinPasswordLength is not configured correctly.");
        var size = Math.Max(20, configuredLength);
        const string upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const string lower = "abcdefghijkmnopqrstuvwxyz";
        const string digits = "23456789";
        var characters = new char[size];
        characters[0] = upper[RandomNumberGenerator.GetInt32(upper.Length)];
        characters[1] = lower[RandomNumberGenerator.GetInt32(lower.Length)];
        characters[2] = digits[RandomNumberGenerator.GetInt32(digits.Length)];
        const string all = upper + lower + digits;
        for (var i = 3; i < size; i++) characters[i] = all[RandomNumberGenerator.GetInt32(all.Length)];
        for (var i = size - 1; i > 0; i--)
        {
            var j = RandomNumberGenerator.GetInt32(i + 1);
            (characters[i], characters[j]) = (characters[j], characters[i]);
        }
        return new string(characters);
    }

    private async Task<bool> SendWelcomeSafelyAsync(string email, string fullName, string companyName,
        bool isTrainer, string temporaryPassword)
    {
        try
        {
            await _email.SendCompanyStaffWelcomeAsync(email, fullName, companyName, isTrainer, temporaryPassword);
            return true;
        }
        catch (Exception ex)
        {
            // Never log the temporary password or emit it in an API response.
            _logger.LogError(ex, "Welcome email failed for newly registered company staff user {Email}", email);
            return false;
        }
    }

}
