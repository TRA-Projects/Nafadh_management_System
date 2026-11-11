
using System;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Filters;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CertificateController : ControllerBase
    {
        private readonly ICertificateService _service;
        private readonly IEnrollmentService _enrollmentService;
        private readonly Nafadhcontext _context;
        private readonly IEmailService _emailService;

        public CertificateController(
            ICertificateService service,
            IEnrollmentService enrollmentService,
            Nafadhcontext context,
            IEmailService emailService)
        {
            _service = service;
            _enrollmentService = enrollmentService;
            _context = context;
            _emailService = emailService;
        }

        // ============================================================
        // GET CERTIFICATE BY ENROLLMENT
        // ============================================================

        [HttpGet("enrollment/{enrollmentId}")]
        [RequirePagePermission(
            new[]
            {
                "nf.admin.certificates",
                "nf.trainee.evaluations-badges",
                "nf.company.trainees"
            },
            "View")]
        public async Task<IActionResult> GetCertificateByEnrollment(
            int enrollmentId)
        {
            var result =
                await _service.GetCertificateByEnrollmentIdAsync(
                    enrollmentId);

            if (result == null)
                return NotFound();

            return Ok(result);
        }

        // ============================================================
        // CREATE CERTIFICATE + SEND EMAIL
        // ============================================================

        [HttpPost]
        [RequirePagePermission("nf.admin.certificates", "Create")]
        public async Task<IActionResult> AddCertificate(
            [FromBody] CertificateInputDTO dto)
        {
            try
            {
                var existingCert =
                    await _service.GetCertificateByEnrollmentIdAsync(
                        dto.EnrollmentId);

                var result =
                    await _service.AddCertificateAsync(dto);

                if (result == null)
                {
                    return BadRequest(
                        "Unable to issue certificate.");
                }

                bool emailSent = false;

                if (existingCert == null)
                {
                    var enrollment =
                        await _enrollmentService
                            .GetEnrollmentByIdAsync(
                                dto.EnrollmentId);

                    if (enrollment != null)
                    {
                        var trainee = await _context.NFD_Trainees
                            .Include(t => t.User)
                            .FirstOrDefaultAsync(
                                t => t.TraineeId ==
                                     enrollment.TraineeId);

                        if (trainee?.User != null &&
                            !string.IsNullOrWhiteSpace(
                                trainee.User.Email))
                        {
                            string cleanEmail = new string(
                                trainee.User.Email
                                    .Where(c =>
                                        !char.IsWhiteSpace(c) &&
                                        char.GetUnicodeCategory(c) !=
                                        UnicodeCategory.Format)
                                    .ToArray());

                            string traineeName =
                                !string.IsNullOrWhiteSpace(
                                    enrollment.TraineeName)
                                    ? enrollment.TraineeName
                                    : trainee.User.FullName ??
                                      "المتدرب";

                            string? programName =
                                !string.IsNullOrWhiteSpace(
                                    enrollment.ProgramTitle)
                                    ? enrollment.ProgramTitle
                                    : enrollment.BatchName;

                            try
                            {
                                await _emailService
                                    .SendCertificateIssuedAsync(
                                        cleanEmail,
                                        traineeName,
                                        programName,
                                        result.FileUrl);

                                emailSent = true;
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine(
                                    $"Failed to send certificate email: {ex.Message}");
                            }
                        }
                    }
                }

                return Ok(new
                {
                    Message = "Certificate issued successfully",
                    Certificate = result,
                    EmailSent = emailSent
                });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new
                {
                    Message = ex.Message
                });
            }
        }

        // ============================================================
        // DOWNLOAD CERTIFICATE
        // ============================================================

        [HttpGet("{id}/download")]
        [RequirePagePermission(
            new[]
            {
                "nf.admin.certificates",
                "nf.trainee.evaluations-badges",
                "nf.company.trainees"
            },
            "View")]
        public async Task<IActionResult> DownloadCertificate(int id)
        {
            var fileUrl =
                await _service.DownloadCertificateAsync(id);

            if (string.IsNullOrWhiteSpace(fileUrl))
            {
                return NotFound(
                    "Certificate file not found.");
            }

            return Redirect(fileUrl);
        }

        // ============================================================
        // GET ALL CERTIFICATES FOR TRAINEE
        // ============================================================

        [HttpGet("trainee/{traineeId}")]
        [RequirePagePermission(
            new[]
            {
                "nf.admin.certificates",
                "nf.trainee.evaluations-badges",
                "nf.company.trainees"
            },
            "View")]
        public async Task<IActionResult> GetCertificatesByTrainee(
            int traineeId)
        {
            var result =
                await _service.GetCertificatesByTraineeIdAsync(
                    traineeId);

            if (result == null || !result.Any())
            {
                return NotFound();
            }

            return Ok(result);
        }

        // ============================================================
        // TRAINEE PORTAL - OFFICIAL CERTIFICATE DETAILS
        //
        // Returns:
        // - Issued certificate information
        // - Official trainee grade
        // - Grade classification
        // - Training hours calculated using system settings
        //
        // Trainee can access only their own enrollment.
        // ============================================================

        [HttpGet(
            "enrollment/{enrollmentId:int}/official-details")]
        [RequirePagePermission(
            "nf.trainee.evaluations-badges",
            "View")]
        public async Task<IActionResult>
            GetOfficialCertificateDetails(int enrollmentId)
        {
            // ========================================================
            // 1. AUTHENTICATED USER
            // ========================================================

            var userIdText =
                User.FindFirst("userId")?.Value ??
                User.FindFirst("UserId")?.Value ??
                User.FindFirst("sub")?.Value ??
                User.FindFirst(
                    ClaimTypes.NameIdentifier)?.Value;

            if (!int.TryParse(userIdText, out var userId))
            {
                return Unauthorized(new
                {
                    message =
                        "تعذر تحديد حساب المستخدم."
                });
            }

            // ========================================================
            // 2. VERIFY ENROLLMENT OWNERSHIP
            // ========================================================

            var enrollment = await _context.NFD_Enrollments
                .AsNoTracking()
                .Where(e =>
                    e.EnrollmentId == enrollmentId &&
                    e.Trainee.UserId == userId)
          .Select(e => new
          {
              e.EnrollmentId,
              e.TraineeId,
              e.BatchId,
              e.Batch.BatchName,
              e.Batch.StartDate,
              e.Batch.EndDate,

              TraineeName = e.Trainee.User.FullName,

              // Company assigned to this specific enrollment.
              CompanyId = e.CompanyId,
              CompanyName = e.Company.CompanyName
          })
                .FirstOrDefaultAsync();

            if (enrollment == null)
            {
                return NotFound(new
                {
                    message =
                        "التسجيل غير موجود أو لا يخص هذا المتدرب."
                });
            }

            // ========================================================
            // 3. GET ISSUED CERTIFICATE
            // ========================================================

            var certificate = await _context.NFD_Certificates
                .AsNoTracking()
                .Where(c =>
                    c.EnrollmentId == enrollmentId)
                .OrderBy(c => c.CertificateId)
                .Select(c => new
                {
                    c.CertificateId,
                    c.IssueDate,
                    c.FileUrl
                })
                .FirstOrDefaultAsync();

            if (certificate == null)
            {
                return NotFound(new
                {
                    message =
                        "لم يتم إصدار شهادة لهذا التسجيل."
                });
            }

            // ========================================================
            // 4. OFFICIAL GRADE
            // ========================================================

            decimal? grade = await _context.NFD_Evaluations
                .AsNoTracking()
                .Where(ev =>
                    ev.EnrollmentId == enrollmentId)
                .Select(ev =>
                    (decimal?)ev.Score)
                .AverageAsync();

            string? gradeLabel = null;

            if (grade.HasValue)
            {
                var score = grade.Value;

                gradeLabel =
                    score >= 95m
                        ? "امتياز مع مرتبة الشرف"
                    : score >= 90m
                        ? "امتياز"
                    : score >= 80m
                        ? "جيد جداً"
                    : score >= 70m
                        ? "جيد"
                    : score >= 50m
                        ? "مقبول"
                        : "غير مجتاز";
            }

            // ========================================================
            // 5. TRAINING HOURS FROM SYSTEM VARIABLES
            //
            // No Admin API call is required from Trainee Portal.
            // Backend reads the setting internally.
            // ========================================================

            int? totalHours = null;
            int? techHours = null;
            int? practicalHours = null;

            var weeklyHoursSetting =
                await _context.SystemVariables
                    .AsNoTracking()
                    .Where(v =>
                        v.VariableKey ==
                        "PROGRAM_WEEKLY_HOURS")
                    .Select(v => v.Value)
                    .FirstOrDefaultAsync();

            if (!string.IsNullOrWhiteSpace(
                    weeklyHoursSetting))
            {
                var isValidHours = decimal.TryParse(
                    weeklyHoursSetting,
                    NumberStyles.Number,
                    CultureInfo.InvariantCulture,
                    out var weeklyHours);

                if (isValidHours && weeklyHours > 0)
                {
                    var startDate =
                        enrollment.StartDate;

                    var endDate =
                        enrollment.EndDate;

                    var diffDays =
                        (endDate - startDate).TotalDays;

                    if (diffDays >= 0)
                    {
                        var weeks = diffDays / 7.0;

                        var calculatedTotalHours =
                            (int)Math.Round(
                                (decimal)weeks *
                                weeklyHours,
                                0,
                                MidpointRounding.AwayFromZero);

                        var calculatedTechHours =
                            (int)Math.Round(
                                calculatedTotalHours *
                                2m / 3m,
                                0,
                                MidpointRounding.AwayFromZero);

                        totalHours =
                            calculatedTotalHours;

                        techHours =
                            calculatedTechHours;

                        practicalHours =
                            calculatedTotalHours -
                            calculatedTechHours;
                    }
                }
            }

            // ========================================================
            // 6. OFFICIAL RESPONSE
            // ========================================================

            return Ok(new
            {
                enrollment.EnrollmentId,
                enrollment.TraineeId,
                enrollment.BatchId,
                enrollment.BatchName,
                enrollment.TraineeName,

                CompanyId = enrollment.CompanyId,
                CompanyName = enrollment.CompanyName,

                enrollment.StartDate,
                enrollment.EndDate,

                certificate.CertificateId,
                certificate.IssueDate,
                certificate.FileUrl,

                Grade = grade,
                GradeLabel = gradeLabel,
                HasGrade = grade.HasValue,
                IsIssued = true,

                TotalHours = totalHours,
                TechHours = techHours,
                PracticalHours = practicalHours
            });
        }

#if DEBUG
        // ============================================================
        // LOCAL DEBUG - CERTIFICATE GRADE
        // ============================================================

        [HttpGet(
            "debug/enrollment/{enrollmentId:int}/grade")]
        [Microsoft.AspNetCore.Authorization.AllowAnonymous]
        public async Task<IActionResult> TestCertificateGrade(
            int enrollmentId)
        {
            var remoteIp =
                HttpContext.Connection.RemoteIpAddress;

            if (remoteIp == null ||
                !System.Net.IPAddress.IsLoopback(remoteIp))
            {
                return NotFound();
            }

            var grade = await _context.NFD_Evaluations
                .AsNoTracking()
                .Where(e =>
                    e.EnrollmentId == enrollmentId)
                .Select(e =>
                    (decimal?)e.Score)
                .AverageAsync();

            if (!grade.HasValue)
            {
                return Ok(new
                {
                    EnrollmentId = enrollmentId,
                    Message =
                        "لا توجد درجات لهذا التسجيل."
                });
            }

            var score = grade.Value;

            var gradeLabel =
                score >= 95m
                    ? "امتياز مع مرتبة الشرف"
                : score >= 90m
                    ? "امتياز"
                : score >= 80m
                    ? "جيد جداً"
                : score >= 70m
                    ? "جيد"
                : score >= 50m
                    ? "مقبول"
                    : "غير مجتاز";

            return Ok(new
            {
                EnrollmentId = enrollmentId,
                Grade = Math.Round(score, 2),
                GradeLabel = gradeLabel
            });
        }
#endif

        // ============================================================
        // ADMIN PORTAL - BATCH CERTIFICATE STATUS
        // ============================================================

        [HttpGet("batch/{batchId}/status")]
        [RequirePagePermission(
            "nf.admin.certificates",
            "View")]
        public async Task<IActionResult> GetBatchCertificatesStatus(
            int batchId)
        {
            var result =
                await _service.GetBatchCertificatesStatusAsync(
                    batchId);

            if (result == null)
                return NotFound();

            return Ok(result);
        }

        // ============================================================
        // ADMIN PORTAL - UPDATE CERTIFICATE STATUS
        // ============================================================

        [HttpPatch("enrollment/{enrollmentId}/status")]
        [RequirePagePermission(
            "nf.admin.certificates",
            "Approve")]
        public async Task<IActionResult> UpdateCertificateStatus(
            int enrollmentId,
            [FromBody] UpdateCertificateStatusDTO dto)
        {
            var result =
                await _service.UpdateCertificateStatusAsync(
                    enrollmentId,
                    dto.IsIssued);

            if (result == null)
                return NotFound();

            return Ok(new
            {
                Message = "تم تحديث حالة الشهادة",
                Certificate = result
            });
        }
    }
}
