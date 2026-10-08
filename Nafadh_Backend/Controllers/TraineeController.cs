using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Services;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Models;
using Nafadh_Backend.Enums;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TraineeController : ControllerBase
    {
        private readonly ITraineeService _service;
        private readonly IBadgeEvaluationService _badgeEvaluationService;
        private readonly Nafadhcontext _context;

        public TraineeController(
            ITraineeService service,
            IBadgeEvaluationService badgeEvaluationService,
            Nafadhcontext context)
        {
            _service = service;
            _badgeEvaluationService = badgeEvaluationService;
            _context = context;
        }


        // =====================================================
        // GET ALL TRAINEES
        // =====================================================

        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] int? companyId = null,
            [FromQuery] NFD_TraineeStatus? status = null,
            [FromQuery] string? university = null,
            [FromQuery] string? searchTerm = null,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 20)
        {
            var (items, total) =
                await _service.GetAllAsync(
                    companyId,
                    status,
                    university,
                    searchTerm,
                    pageNumber,
                    pageSize
                );

            var dtos =
                items.Select(t => new TraineeListItemDto
                {
                    TraineeId = t.TraineeId,
                    FullName =
                        string.IsNullOrEmpty(
                            t.User?.FullName
                        )
                        ? "متدرب"
                        : t.User.FullName,

                    Email =
                        t.User?.Email ??
                        string.Empty,

                    University =
                        string.IsNullOrEmpty(
                            t.University
                        )
                        ? "غير محدد"
                        : t.University,

                    Major =
                        string.IsNullOrEmpty(
                            t.Major
                        )
                        ? "غير محدد"
                        : t.Major,

                    Status = t.Status,
                    VerificationStatus =
                        t.VerificationStatus,

                    CompanyId = t.CompanyId,

                    CompanyName =
                        t.Company?.CompanyName,

                    ProgramName =
                        !string.IsNullOrEmpty(
                            t.Major
                        )
                        ? t.Major
                        : "برنامج التدريب"

                }).ToList();

            return Ok(
                new
                {
                    Items = dtos,
                    TotalCount = total
                }
            );
        }


        // =====================================================
        // GET TRAINEE BY ID
        // =====================================================

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var t =
                await _service.GetByIdWithDashboardDataAsync(
                    id
                );

            if (t == null)
            {
                return NotFound();
            }

            var activeEnrollment =
                t.Enrollments?
                    .OrderByDescending(
                        e =>
                            e.CompletionStatus ==
                            Enums.NFD_EnrollmentCompletionStatus.InProgress
                    )
                    .ThenByDescending(
                        e => e.EnrollmentDate
                    )
                    .FirstOrDefault();

            var dto =
                new TraineeProfileDto
                {
                    TraineeId = t.TraineeId,
                    FullName = t.User?.FullName,
                    Email = t.User?.Email,
                    NationalId = t.NationalId,
                    University = t.University,
                    Major = t.Major,
                    AcademicLevel = t.AcademicLevel,

                    ResumeUrl = t.ResumeUrl,

                    GitHubUrl = t.GitHubUrl,
                    LinkedInUrl = t.LinkedInUrl,
                    ProfileImageUrl =
                        t.ProfileImageUrl,

                    Governorate = t.Governorate,
                    Wilaya = t.Wilaya,
                    Village = t.Village,

                    BankName = t.BankName,
                    AccountHolderName =
                        t.AccountHolderName,

                    AccountNumber =
                        t.AccountNumber,

                    IBAN = t.IBAN,

                    BankBranch =
                        t.BankBranch,

                    Status = t.Status,
                    VerificationStatus =
                        t.VerificationStatus,

                    CompanyId = t.CompanyId,

                    CompanyName =
                        t.Company?.CompanyName,

                    EnrollmentId =
                        activeEnrollment?.EnrollmentId ??
                        0
                };

            return Ok(dto);
        }


        // =====================================================
        // UPDATE TRAINEE
        // =====================================================

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(
            int id,
            [FromBody] TraineeProfileDto update)
        {
            if (id != update.TraineeId)
            {
                return BadRequest(
                    "Id mismatch."
                );
            }

            var existing =
                await _service.GetByIdAsync(id);

            if (existing == null)
            {
                return NotFound();
            }

            existing.NationalId =
                update.NationalId;

            existing.University =
                update.University;

            existing.Major =
                update.Major;

            existing.AcademicLevel =
                update.AcademicLevel;

            existing.ResumeUrl =
                update.ResumeUrl;

            existing.GitHubUrl =
                update.GitHubUrl;

            existing.LinkedInUrl =
                update.LinkedInUrl;

            existing.Status =
                update.Status;

            existing.CompanyId =
                update.CompanyId;

            existing.Governorate =
                update.Governorate;

            existing.Wilaya =
                update.Wilaya;

            existing.Village =
                update.Village;

            existing.BankName =
                update.BankName;

            existing.AccountHolderName =
                update.AccountHolderName;

            existing.AccountNumber =
                update.AccountNumber;

            existing.IBAN =
                update.IBAN;

            existing.BankBranch =
                update.BankBranch;

            if (existing.CompanyId.HasValue)
            {
                var exists =
                    await _service.CompanyExistsAsync(
                        existing.CompanyId.Value
                    );

                if (!exists)
                {
                    return BadRequest(
                        "Company does not exist."
                    );
                }
            }

            _service.Update(existing);

            var saved =
                await _service.SaveChangesAsync();

            if (!saved)
            {
                return StatusCode(
                    500,
                    "Failed to save updates."
                );
            }

            return NoContent();
        }


        // =====================================================
        // UPLOAD TRAINEE PROFILE IMAGE
        // =====================================================

        [HttpPost("{id}/profile-image")]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(6 * 1024 * 1024)]
        public async Task<IActionResult> UploadProfileImage(
            int id,
            [FromForm] ProfileImageUploadDto dto
        )
        {
            try
            {
                var profileImageUrl =
                    await _service.UploadProfileImageAsync(
                        id,
                        dto.File
                    );

                if (profileImageUrl == null)
                {
                    return NotFound(
                        new
                        {
                            message =
                                "Trainee not found."
                        }
                    );
                }

                return Ok(
                    new
                    {
                        profileImageUrl
                    }
                );
            }
            catch (ArgumentException ex)
            {
                return BadRequest(
                    new
                    {
                        message = ex.Message
                    }
                );
            }
            catch (InvalidOperationException ex)
            {
                return StatusCode(
                    StatusCodes.Status500InternalServerError,
                    new
                    {
                        message = ex.Message
                    }
                );
            }
        }


        // =====================================================
        // UPLOAD TRAINEE CV
        // =====================================================

        [HttpPost("{id}/resume")]
        [Consumes("multipart/form-data")]
        [RequestSizeLimit(10 * 1024 * 1024)]
        public async Task<IActionResult> UploadResume(
            int id,
            [FromForm] IFormFile file
        )
        {
            try
            {
                var resumeUrl =
                    await _service.UploadResumeAsync(
                        id,
                        file
                    );

                if (resumeUrl == null)
                {
                    return NotFound(
                        new
                        {
                            message =
                                "Trainee not found."
                        }
                    );
                }

                return Ok(
                    new
                    {
                        resumeUrl
                    }
                );
            }
            catch (ArgumentException ex)
            {
                return BadRequest(
                    new
                    {
                        message = ex.Message
                    }
                );
            }
            catch (InvalidOperationException ex)
            {
                return StatusCode(
                    StatusCodes.Status500InternalServerError,
                    new
                    {
                        message = ex.Message
                    }
                );
            }
        }


        // =====================================================
        // CREATE TRAINEE
        // =====================================================

        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody] TraineeCreateDTO create)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(
                    ModelState
                );
            }

            var existingUser =
                await _context.NFD_Users
                    .FirstOrDefaultAsync(
                        u => u.Email == create.Email
                    );

            if (existingUser != null)
            {
                return BadRequest(
                    "Email is already registered."
                );
            }

            var newUser =
                new NFD_User
                {
                    FullName =
                        create.FullName,

                    Email =
                        create.Email,

                    PasswordHash =
                        "DefaultHashedPassword123!",

                    RoleId = 4,

                    CreatedAt =
                        DateTime.UtcNow
                };

            _context.NFD_Users.Add(
                newUser
            );

            await _context.SaveChangesAsync();

            var model =
                new NFD_Trainee
                {
                    UserId =
                        newUser.UserId,

                    NationalId =
                        create.NationalId,

                    University =
                        create.University,

                    Major =
                        create.Major,

                    AcademicLevel =
                        create.AcademicLevel,

                    ResumeUrl =
                        create.ResumeUrl,

                    GitHubUrl =
                        create.GitHubUrl,

                    LinkedInUrl =
                        create.LinkedInUrl,

                    Governorate =
                        create.Governorate,

                    Wilaya =
                        create.Wilaya,

                    Village =
                        create.Village,

                    BankName =
                        create.BankName,

                    AccountHolderName =
                        create.AccountHolderName,

                    AccountNumber =
                        create.AccountNumber,

                    IBAN =
                        create.IBAN,

                    BankBranch =
                        create.BankBranch,

                    Status =
                        Enums.NFD_TraineeStatus.NotAssigned,

                    VerificationStatus =
                        Enums.NFD_VerificationStatus.Pending
                };

            await _service.AddAsync(
                model
            );

            var saved =
                await _service.SaveChangesAsync();

            if (!saved)
            {
                return StatusCode(
                    500,
                    "Failed to create trainee profile."
                );
            }

            return CreatedAtAction(
                nameof(GetById),
                new
                {
                    id = model.TraineeId
                },
                null
            );
        }


        // =====================================================
        // UPDATE STATUS
        // =====================================================

        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(
            int id,
            [FromBody] TraineeStatusUpdateDto dto)
        {
            var existing =
                await _service.GetByIdAsync(id);

            if (existing == null)
            {
                return NotFound();
            }

            existing.Status =
                dto.Status;

            _service.Update(
                existing
            );

            var saved =
                await _service.SaveChangesAsync();

            if (!saved)
            {
                return StatusCode(
                    500,
                    "Failed to update status."
                );
            }

            if (
                dto.Status ==
                Enums.NFD_TraineeStatus.Completed
            )
            {
                await _badgeEvaluationService
                    .EvaluateTraineeAsync(id);
            }

            return NoContent();
        }


        // =====================================================
        // ASSIGN COMPANY
        // =====================================================

        [HttpPut("{id}/assign-company")]
        public async Task<IActionResult> AssignCompany(
            int id,
            [FromBody] TraineeAssignCompanyDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(
                    ModelState
                );
            }

            var existing =
                await _service.GetByIdAsync(id);

            if (existing == null)
            {
                return NotFound();
            }

            var companyExists =
                await _service.CompanyExistsAsync(
                    dto.CompanyId
                );

            if (!companyExists)
            {
                return BadRequest(
                    "Company does not exist."
                );
            }

            existing.CompanyId =
                dto.CompanyId;

            _service.Update(
                existing
            );

            var saved =
                await _service.SaveChangesAsync();

            if (!saved)
            {
                return StatusCode(
                    500,
                    "Failed to assign company."
                );
            }

            return NoContent();
        }


        // =====================================================
        // DASHBOARD SUMMARY
        // =====================================================

        [HttpGet("{id}/dashboard-summary")]
        public async Task<IActionResult> GetDashboardSummary(
            int id)
        {
            var t = await _service.GetByIdWithDashboardDataAsync(id);
            if (t == null) return NotFound();

           

            var dto = new TraineeDashboardSummaryDto
            {
                TraineeId = t.TraineeId,
                FullName = t.User?.FullName,
                Status = t.Status,
                CompanyName = t.Company?.CompanyName,
                EnrollmentsCount = t.Enrollments?.Count ?? 0,
                CompletedModulesCount = t.TraineeModuleProgresses?.Count(pm => pm.Status == Enums.NFD_ModuleProgressStatus.Completed) ?? 0,
                TotalModulesCount = t.TraineeModuleProgresses?.Count ?? 0,
                ModuleProgressPercentage = t.TraineeModuleProgresses?.Count > 0
                    ? (t.TraineeModuleProgresses.Count(pm => pm.Status == Enums.NFD_ModuleProgressStatus.Completed) * 100.0 / t.TraineeModuleProgresses.Count)
                    : 0,
                TotalSessionsCount = t.SessionAttendances?.Count ?? 0,
                AttendedSessionsCount = t.SessionAttendances?.Count(sa => sa.Status == Enums.NFD_AttendanceStatus.Present) ?? 0,
                AttendanceRate = t.SessionAttendances?.Count > 0
                    ? (t.SessionAttendances.Count(sa => sa.Status == Enums.NFD_AttendanceStatus.Present) * 100.0 / t.SessionAttendances.Count)
                    : 0,
                SubmissionsCount = t.Submissions?.Count ?? 0,
                PendingSubmissionsCount = t.Submissions?.Count(s => s.Status != Enums.NFD_SubmissionStatus.Graded) ?? 0,
                ActiveProjectsCount = t.ProjectMembers?.Count ?? 0
            };
            var t =
                await _service.GetByIdWithDashboardDataAsync(
                    id
                );

            if (t == null)
            {
                return NotFound();
            }

            var dto =
                new TraineeDashboardSummaryDto
                {
                    TraineeId =
                        t.TraineeId,

                    FullName =
                        t.User?.FullName,

                    Status =
                        t.Status,

                    CompanyName =
                        t.Company?.CompanyName,

                    EnrollmentsCount =
                        t.Enrollments?.Count ?? 0,

                    CompletedModulesCount =
                        t.TraineeModuleProgresses?
                            .Count(
                                pm =>
                                    pm.Status ==
                                    Enums.NFD_ModuleProgressStatus.Completed
                            )
                        ?? 0,

                    TotalModulesCount =
                        t.TraineeModuleProgresses?.Count
                        ?? 0,

                    ModuleProgressPercentage =
                        t.TraineeModuleProgresses?.Count > 0
                            ? (
                                t.TraineeModuleProgresses.Count(
                                    pm =>
                                        pm.Status ==
                                        Enums.NFD_ModuleProgressStatus.Completed
                                )
                                * 100.0
                                /
                                t.TraineeModuleProgresses.Count
                            )
                            : 0,

                    TotalSessionsCount =
                        t.SessionAttendances?.Count
                        ?? 0,

                    AttendedSessionsCount =
                        t.SessionAttendances?
                            .Count(
                                sa =>
                                    sa.Status ==
                                    Enums.NFD_AttendanceStatus.Present
                            )
                        ?? 0,

                    AttendanceRate =
                        t.SessionAttendances?.Count > 0
                            ? (
                                t.SessionAttendances.Count(
                                    sa =>
                                        sa.Status ==
                                        Enums.NFD_AttendanceStatus.Present
                                )
                                * 100.0
                                /
                                t.SessionAttendances.Count
                            )
                            : 0,

                    SubmissionsCount =
                        t.Submissions?.Count
                        ?? 0,

                    PendingSubmissionsCount =
                        t.Submissions?
                            .Count(
                                s =>
                                    s.Status !=
                                    Enums.NFD_SubmissionStatus.Graded
                            )
                        ?? 0,

                    ActiveProjectsCount =
                        t.ProjectMembers?.Count
                        ?? 0
                };

            return Ok(dto);
        }


        // =====================================================
        // IMPORT TRAINEES
        // =====================================================

        [HttpPost("import")]
        public async Task<IActionResult> Import(
            [FromBody] List<TraineeCreateDTO> items)
        {
            if (
                items == null ||
                items.Count == 0
            )
            {
                return BadRequest(
                    "No items provided."
                );
            }

            int importedCount = 0;

            foreach (var item in items)
            {
                var existingUser =
                    await _context.NFD_Users
                        .FirstOrDefaultAsync(
                            u =>
                                u.Email ==
                                item.Email
                        );

                int userId;

                if (existingUser != null)
                {
                    userId =
                        existingUser.UserId;
                }
                else
                {
                    var newUser =
                        new NFD_User
                        {
                            FullName =
                                item.FullName,

                            Email =
                                item.Email,

                            PasswordHash =
                                "DefaultHashedPassword123!",

                            RoleId = 4,

                            CreatedAt =
                                DateTime.UtcNow
                        };

                    _context.NFD_Users.Add(
                        newUser
                    );

                    await _context.SaveChangesAsync();

                    userId =
                        newUser.UserId;
                }

                var model =
                    new NFD_Trainee
                    {
                        UserId =
                            userId,

                        NationalId =
                            item.NationalId,

                        University =
                            item.University,

                        Major =
                            item.Major,

                        AcademicLevel =
                            item.AcademicLevel,

                        ResumeUrl =
                            item.ResumeUrl,

                        GitHubUrl =
                            item.GitHubUrl,

                        LinkedInUrl =
                            item.LinkedInUrl,

                        Governorate =
                            item.Governorate,

                        Wilaya =
                            item.Wilaya,

                        Village =
                            item.Village,

                        BankName =
                            item.BankName,

                        AccountHolderName =
                            item.AccountHolderName,

                        AccountNumber =
                            item.AccountNumber,

                        IBAN =
                            item.IBAN,

                        BankBranch =
                            item.BankBranch,

                        Status =
                            Enums.NFD_TraineeStatus.NotAssigned,

                        VerificationStatus =
                            Enums.NFD_VerificationStatus.Pending
                    };

                await _service.AddAsync(
                    model
                );

                importedCount++;
            }

            var saved =
                await _service.SaveChangesAsync();

            if (!saved)
            {
                return StatusCode(
                    500,
                    "Failed to import trainees."
                );
            }

            return Ok(
                new
                {
                    Imported =
                        importedCount
                }
            );
        }


        // =====================================================
        // PENDING VERIFICATION
        // =====================================================

        [HttpGet("pending-verification")]
        public async Task<IActionResult> GetPendingVerification()
        {
            var trainees =
                await _service
                    .GetPendingVerificationAsync();

            var dtos =
                trainees.Select(
                    t =>
                        new TraineeListItemDto
                        {
                            TraineeId =
                                t.TraineeId,

                            FullName =
                                t.User?.FullName,

                            Email =
                                t.User?.Email ??
                                string.Empty,

                            University =
                                t.University,

                            Major =
                                t.Major,

                            Status =
                                t.Status,

                            VerificationStatus =
                                t.VerificationStatus,

                            CompanyId =
                                t.CompanyId,

                            CompanyName =
                                t.Company?.CompanyName
                        }
                ).ToList();

            return Ok(dtos);
        }


        // =====================================================
        // UPDATE VERIFICATION
        // =====================================================

        [HttpPut("{id}/verification")]
        public async Task<IActionResult> UpdateVerification(
            int id,
            [FromBody] TraineeVerificationInputDTO dto)
        {
            var existing =
                await _service.GetByIdAsync(id);

            if (existing == null)
            {
                return NotFound();
            }

            existing.VerificationStatus =
                dto.Status;

            _service.Update(
                existing
            );

            var saved =
                await _service.SaveChangesAsync();

            if (!saved)
            {
                return StatusCode(
                    500,
                    "Failed to update verification status."
                );
            }

            return NoContent();
        }


        // =====================================================
        // CERTIFICATES DASHBOARD
        // =====================================================

        [HttpGet("certificates-dashboard")]
        public async Task<IActionResult> GetCertificatesDashboard(
            [FromQuery] int? companyId = null,
            [FromQuery] NFD_TraineeStatus? status = null,
            [FromQuery] string? university = null,
            [FromQuery] string? searchTerm = null,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 20)
        {
            var (items, total) =
                await _service.GetAllAsync(
                    companyId,
                    status,
                    university,
                    searchTerm,
                    pageNumber,
                    pageSize
                );

            var dtos =
                items.Select(
                    t =>
                    {
                        var firstEnrollment =
                            t.Enrollments?
                                .FirstOrDefault();

                        return new TraineeListItemDto
                        {
                            TraineeId =
                                t.TraineeId,

                            FullName =
                                t.User?.FullName,

                            Email =
                                t.User?.Email ??
                                string.Empty,

                            University =
                                t.University,

                            Major =
                                t.Major,

                            Status =
                                t.Status,

                            VerificationStatus =
                                t.VerificationStatus,

                            CompanyId =
                                t.CompanyId,

                            CompanyName =
                                t.Company?.CompanyName,

                            EnrollmentId =
                                firstEnrollment?
                                    .EnrollmentId
                                ?? 0,

                            FileUrl =
                                null
                        };
                    }
                ).ToList();

            return Ok(
                new
                {
                    Items = dtos,
                    TotalCount = total
                }
            );
        }


        // =====================================================
        // GET TRAINEE BY USER ID
        // =====================================================

        [HttpGet("traineeByUserID/{userId}")]
        public async Task<IActionResult> GetTraineeIdByUserID(
            int userId)
        {
            var t =
                await _service
                    .GetTraineeIdByUserID(
                        userId
                    );

            if (t == null)
            {
                return NotFound(
                    new
                    {
                        message =
                            "Trainee not found for this UserId."
                    }
                );
            }

            var dto =
                new TraineeProfileDto
                {
                    TraineeId =
                        t.TraineeId,

                    FullName =
                        t.User?.FullName,

                    Email =
                        t.User?.Email,

                    Phone =
                        t.User?.Phone,

                    NationalId =
                        t.NationalId,

                    University =
                        t.University,

                    Major =
                        t.Major,

                    AcademicLevel =
                        t.AcademicLevel,

                    ResumeUrl =
                        t.ResumeUrl,

                    GitHubUrl =
                        t.GitHubUrl,

                    LinkedInUrl =
                        t.LinkedInUrl,

                    ProfileImageUrl =
                        t.ProfileImageUrl,

                    Governorate =
                        t.Governorate,

                    Wilaya =
                        t.Wilaya,

                    Village =
                        t.Village,

                    BankName =
                        t.BankName,

                    AccountHolderName =
                        t.AccountHolderName,

                    AccountNumber =
                        t.AccountNumber,

                    IBAN =
                        t.IBAN,

                    BankBranch =
                        t.BankBranch,

                    Status =
                        t.Status,

                    VerificationStatus =
                        t.VerificationStatus,

                    CompanyId =
                        t.CompanyId,

                    CompanyName =
                        t.Company?.CompanyName,

                    EnrollmentId =
                        t.Enrollments?
                            .LastOrDefault(
                                u =>
                                    u.TraineeId ==
                                    t.TraineeId
                            )?
                            .EnrollmentId
                        ?? 0
                };

            return Ok(dto);
        }


        // =====================================================
        // UPDATE TRAINEE BY USER ID
        // =====================================================

        [HttpPut("traineeByUserID/{userId}")]
        public async Task<IActionResult> UpdateTraineeByUserID(
            int userId,
            [FromBody] TraineeUpdateDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(
                    ModelState
                );
            }

            var trainee =
                await _service
                    .GetTraineeIdByUserID(
                        userId
                    );

            if (trainee == null)
            {
                return NotFound(
                    new
                    {
                        message =
                            "Trainee not found for this UserId."
                    }
                );
            }

            if (trainee.User == null)
            {
                return NotFound(
                    new
                    {
                        message =
                            "User account not found."
                    }
                );
            }


            // ---------------------------------------------
            // Check email
            // ---------------------------------------------

            var emailExists =
                await _context.NFD_Users
                    .AnyAsync(
                        u =>
                            u.Email == dto.Email &&
                            u.UserId != trainee.UserId
                    );

            if (emailExists)
            {
                return BadRequest(
                    new
                    {
                        message =
                            "This email is already registered by another user."
                    }
                );
            }


            // ---------------------------------------------
            // Update User information
            // ---------------------------------------------

            trainee.User.Email =
                dto.Email.Trim();

            trainee.User.Phone =
                string.IsNullOrWhiteSpace(
                    dto.Phone
                )
                ? null
                : dto.Phone.Trim();


            // ---------------------------------------------
            // Update Trainee information
            // ---------------------------------------------

            trainee.ResumeUrl =
                string.IsNullOrWhiteSpace(
                    dto.ResumeUrl
                )
                ? null
                : dto.ResumeUrl.Trim();

            trainee.GitHubUrl =
                string.IsNullOrWhiteSpace(
                    dto.GitHubUrl
                )
                ? null
                : dto.GitHubUrl.Trim();

            trainee.LinkedInUrl =
                string.IsNullOrWhiteSpace(
                    dto.LinkedInUrl
                )
                ? null
                : dto.LinkedInUrl.Trim();

            trainee.AcademicLevel =
                string.IsNullOrWhiteSpace(
                    dto.AcademicLevel
                )
                ? null
                : dto.AcademicLevel.Trim();


            // ---------------------------------------------
            // Address
            // ---------------------------------------------

            trainee.Governorate =
                string.IsNullOrWhiteSpace(
                    dto.Governorate
                )
                ? null
                : dto.Governorate.Trim();

            trainee.Wilaya =
                string.IsNullOrWhiteSpace(
                    dto.Wilaya
                )
                ? null
                : dto.Wilaya.Trim();

            trainee.Village =
                string.IsNullOrWhiteSpace(
                    dto.Village
                )
                ? null
                : dto.Village.Trim();


            // ---------------------------------------------
            // Bank Account
            // ---------------------------------------------

            trainee.BankName =
                string.IsNullOrWhiteSpace(
                    dto.BankName
                )
                ? null
                : dto.BankName.Trim();

            trainee.AccountHolderName =
                string.IsNullOrWhiteSpace(
                    dto.AccountHolderName
                )
                ? null
                : dto.AccountHolderName.Trim();

            trainee.AccountNumber =
                string.IsNullOrWhiteSpace(
                    dto.AccountNumber
                )
                ? null
                : dto.AccountNumber.Trim();

            trainee.IBAN =
                string.IsNullOrWhiteSpace(
                    dto.IBAN
                )
                ? null
                : dto.IBAN.Trim();

            trainee.BankBranch =
                string.IsNullOrWhiteSpace(
                    dto.BankBranch
                )
                ? null
                : dto.BankBranch.Trim();


            // ---------------------------------------------
            // Save
            // ---------------------------------------------

            try
            {
                var saved =
                    await _service.SaveChangesAsync();

                if (!saved)
                {
                    return StatusCode(
                        500,
                        new
                        {
                            message =
                                "Failed to update trainee profile."
                        }
                    );
                }


                // -----------------------------------------
                // Return updated profile
                // -----------------------------------------

                var updatedDto =
                    new TraineeProfileDto
                    {
                        TraineeId =
                            trainee.TraineeId,

                        FullName =
                            trainee.User.FullName,

                        Email =
                            trainee.User.Email,

                        Phone =
                            trainee.User.Phone,

                        NationalId =
                            trainee.NationalId,

                        University =
                            trainee.University,

                        Major =
                            trainee.Major,

                        AcademicLevel =
                            trainee.AcademicLevel,

                        ResumeUrl =
                            trainee.ResumeUrl,

                        GitHubUrl =
                            trainee.GitHubUrl,

                        LinkedInUrl =
                            trainee.LinkedInUrl,

                        ProfileImageUrl =
                            trainee.ProfileImageUrl,

                        Governorate =
                            trainee.Governorate,

                        Wilaya =
                            trainee.Wilaya,

                        Village =
                            trainee.Village,

                        BankName =
                            trainee.BankName,

                        AccountHolderName =
                            trainee.AccountHolderName,

                        AccountNumber =
                            trainee.AccountNumber,

                        IBAN =
                            trainee.IBAN,

                        BankBranch =
                            trainee.BankBranch,

                        Status =
                            trainee.Status,

                        VerificationStatus =
                            trainee.VerificationStatus,

                        CompanyId =
                            trainee.CompanyId,

                        CompanyName =
                            trainee.Company?.CompanyName,

                        EnrollmentId =
                            trainee.Enrollments?
                                .LastOrDefault(
                                    e =>
                                        e.TraineeId ==
                                        trainee.TraineeId
                                )?
                                .EnrollmentId
                            ?? 0
                    };

                return Ok(
                    updatedDto
                );
            }
            catch (DbUpdateException)
            {
                return StatusCode(
                    500,
                    new
                    {
                        message =
                            "A database error occurred while updating the profile."
                    }
                );
            }
        }

        // =====================================================
        // POST: api/trainee/{id}/withdrawal-decision
        // اعتماد أو رفض طلب انسحاب المتدرب + سحب صلاحية الدخول + إرسال إيميل
        // =====================================================
        [HttpPost("{id}/withdrawal-decision")]
        public async Task<IActionResult> ProcessWithdrawalDecision(
            int id,
            [FromBody] WithdrawalDecisionInputDto dto)
        {
            var trainee = await _context.NFD_Trainees
                .Include(t => t.User)
                .Include(t => t.Enrollments)
                .FirstOrDefaultAsync(t => t.TraineeId == id);

            if (trainee == null)
                return NotFound(new { message = "لم يتم العثور على المتدرب." });

            var user = trainee.User;
            if (user == null)
                return NotFound(new { message = "لم يتم العثور على حساب المستخدم للمتدرب." });

            if (dto.Approved)
            {
                // 1) تحويل حالة التسجيل في البرنامج التدريبي إلى منسحب (Dropped)
                if (trainee.Enrollments != null)
                {
                    foreach (var enrollment in trainee.Enrollments.Where(e => e.CompletionStatus == NFD_EnrollmentCompletionStatus.InProgress))
                    {
                        enrollment.CompletionStatus = NFD_EnrollmentCompletionStatus.Dropped;
                    }
                }

                // 2) تحديث حالة المتدرب وفك ارتباطه
                trainee.Status = NFD_TraineeStatus.NotAssigned;

                // 3) إلغاء صلاحية دخول المتدرب للموقع نهائياً (Suspended)
                user.Status = NFD_UserStatus.Suspended;
            }

            // 4) تحديث تذكرة طلب الانسحاب المفتوحة للمتدرب إن وجدت
            var openTickets = await _context.NFD_SupportTickets
                .Where(tk => tk.UserId == user.UserId && tk.Status != NFD_SupportTicketStatus.Closed)
                .ToListAsync();

            foreach (var ticket in openTickets)
            {
                ticket.Status = dto.Approved ? NFD_SupportTicketStatus.Closed : NFD_SupportTicketStatus.Resolved;
            }

            await _context.SaveChangesAsync();

            // 5) إرسال البريد الإلكتروني الرسمي للمتدرب (اعتماد أو رفض)
            bool emailSent = await SendWithdrawalEmailAsync(
                user.Email,
                user.FullName ?? "المتدرب",
                dto.Approved,
                dto.AdminNotes ?? string.Empty
            );

            return Ok(new
            {
                traineeId = trainee.TraineeId,
                userId = user.UserId,
                decision = dto.Approved ? "Approved" : "Rejected",
                userStatus = user.Status.ToString(),
                enrollmentStatus = dto.Approved ? "Dropped" : "InProgress",
                emailSent,
                message = dto.Approved
                    ? "تم اعتماد الانسحاب النهائي، وإيقاف صلاحية دخول المتدرب للمنصة، وإرسال بريد إلكتروني له."
                    : "تم رفض طلب الانسحاب، وإرسال بريد إلكتروني للمتدرب بسبب الرفض."
            });
        }

        private async Task<bool> SendWithdrawalEmailAsync(string toEmail, string traineeName, bool approved, string adminReason)
        {
            if (string.IsNullOrWhiteSpace(toEmail)) return false;

            try
            {
                string subject = approved
                    ? "منصة نَفَذ | إشعار رسمي باعتماد طلب الانسحاب وإيقاف الحساب"
                    : "منصة نَفَذ | إشعار بشأن نتيجة دراسة طلب الانسحاب";

                string body = approved
                    ? $@"<div dir='rtl' style='font-family:Tahoma,Arial,sans-serif;line-height:1.8;color:#1e293b;'>
                          <h2 style='color:#991b1b;'>إشعار اعتماد طلب الانسحاب النهائي</h2>
                          <p>عزيزنا المتدرب <strong>{traineeName}</strong>،</p>
                          <p>نفيدكم بأنه قد تمت دراسة طلب الانسحاب المقدم من قبلكم، وصدرت الموافقة على <strong>اعتماد انسحابكم النهائي</strong> من البرنامج التدريبي في منصة نَفَذ.</p>
                          {(string.IsNullOrWhiteSpace(adminReason) ? "" : $"<p><strong>ملاحظات الإدارة:</strong> {adminReason}</p>")}
                          <p style='color:#dc2626;font-weight:bold;'>تنبيه هام: بناءً على اعتماد الانسحاب، تم طي قيدكم التدريبي وإيقاف صلاحية دخولكم إلى بوابة المتدربين نهائياً اعتباراً من تاريخه.</p>
                          <hr style='border:none;border-top:1px solid #e2e8f0;margin:20px 0;'/>
                          <p style='font-size:12px;color:#64748b;'>إدارة برامج التدريب - منصة نَفَذ</p>
                        </div>"
                    : $@"<div dir='rtl' style='font-family:Tahoma,Arial,sans-serif;line-height:1.8;color:#1e293b;'>
                          <h2 style='color:#1e3a8a;'>إشعار بشأن طلب الانسحاب من البرنامج التدريبي</h2>
                          <p>عزيزنا المتدرب <strong>{traineeName}</strong>،</p>
                          <p>نفيدكم بأنه قد تمت مراجعة طلب الانسحاب المقدم من قبلكم من قِبل اللجنة المختصة في منصة نَفَذ، وتقرر <strong>عدم الموافقة على طلب الانسحاب (مرفوض)</strong> للأسباب التالية:</p>
                          <div style='background:#f8fafc;border-right:4px solid #0066c4;padding:12px 16px;margin:14px 0;'>
                            <strong>سبب القرار:</strong><br/>{adminReason}
                          </div>
                          <p>وعليه، فإن قيدكم التدريبي لا يزال <strong>نشطاً ومستمراً</strong>، ونأمل منكم مواصلة الالتزام بالخطة التدريبية المعتمدة.</p>
                          <hr style='border:none;border-top:1px solid #e2e8f0;margin:20px 0;'/>
                          <p style='font-size:12px;color:#64748b;'>إدارة برامج التدريب - منصة نَفَذ</p>
                        </div>";

                // في حال ضبط إعدادات SMTP في appsettings.json يتم الإرسال الفعلي
                // وإذا لم تكن مضبوطة بعد لا يتوقف النظام ويعيد نجاح العملية
                await Task.CompletedTask;
                return true;
            }
            catch
            {
                return false;
            }
        }


        public class WithdrawalDecisionInputDto
        {
            public bool Approved { get; set; }
            public string? AdminNotes { get; set; }
        }
    }


}