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

        // GET: api/trainee
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] int? companyId = null,
            [FromQuery] NFD_TraineeStatus? status = null, // 👈 التخلف الافتراضي null لجلب الكل
            [FromQuery] string? university = null,
            [FromQuery] string? searchTerm = null,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 20)
        {
            var (items, total) = await _service.GetAllAsync(companyId, status, university, searchTerm, pageNumber, pageSize);

            var dtos = items.Select(t => new TraineeListItemDto
            {
                TraineeId = t.TraineeId,
                FullName = string.IsNullOrEmpty(t.User?.FullName) ? "متدرب" : t.User.FullName,
                Email = t.User?.Email ?? string.Empty,
                University = string.IsNullOrEmpty(t.University) ? "غير محدد" : t.University,
                Major = string.IsNullOrEmpty(t.Major) ? "غير محدد" : t.Major,
                Status = t.Status,
                VerificationStatus = t.VerificationStatus,
                CompanyId = t.CompanyId,
                CompanyName = t.Company?.CompanyName,
                ProgramName = !string.IsNullOrEmpty(t.Major) ? t.Major : "برنامج التدريب"
            }).ToList();

            return Ok(new { Items = dtos, TotalCount = total });
        }

        // GET: api/trainee/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var t = await _service.GetByIdWithDashboardDataAsync(id);
            if (t == null) return NotFound();

            var dto = new TraineeProfileDto
            {
                TraineeId = t.TraineeId,
                FullName = t.User?.FullName,
                Email = t.User?.Email,
                NationalId = t.NationalId,
                University = t.University,
                Major = t.Major,
                AcademicLevel = t.AcademicLevel,
                Skills = t.Skills,
                ResumeUrl = t.ResumeUrl,
                GitHubUrl = t.GitHubUrl,
                LinkedInUrl = t.LinkedInUrl,
                Status = t.Status,
                VerificationStatus = t.VerificationStatus,
                CompanyId = t.CompanyId,
                CompanyName = t.Company?.CompanyName
            };

            return Ok(dto);
        }

        // PUT: api/trainee/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] TraineeProfileDto update)
        {
            if (id != update.TraineeId) return BadRequest("Id mismatch.");

            var existing = await _service.GetByIdAsync(id);
            if (existing == null) return NotFound();

            existing.NationalId = update.NationalId;
            existing.University = update.University;
            existing.Major = update.Major;
            existing.AcademicLevel = update.AcademicLevel;
            existing.Skills = update.Skills;
            existing.ResumeUrl = update.ResumeUrl;
            existing.GitHubUrl = update.GitHubUrl;
            existing.LinkedInUrl = update.LinkedInUrl;
            existing.Status = update.Status;
            existing.CompanyId = update.CompanyId;

            if (existing.CompanyId.HasValue)
            {
                var exists = await _service.CompanyExistsAsync(existing.CompanyId.Value);
                if (!exists) return BadRequest("Company does not exist.");
            }

            _service.Update(existing);
            var saved = await _service.SaveChangesAsync();
            if (!saved) return StatusCode(500, "Failed to save updates.");

            return NoContent();
        }

        // POST: api/trainee
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] TraineeCreateDTO create)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var existingUser = await _context.NFD_Users.FirstOrDefaultAsync(u => u.Email == create.Email);
            if (existingUser != null)
            {
                return BadRequest("Email is already registered.");
            }

            var newUser = new NFD_User
            {
                FullName = create.FullName,
                Email = create.Email,
                PasswordHash = "DefaultHashedPassword123!",
                RoleId = 4,
                CreatedAt = DateTime.UtcNow
            };

            _context.NFD_Users.Add(newUser);
            await _context.SaveChangesAsync();

            var model = new NFD_Trainee
            {
                UserId = newUser.UserId,
                NationalId = create.NationalId,
                University = create.University,
                Major = create.Major,
                AcademicLevel = create.AcademicLevel,
                Skills = create.Skills,
                ResumeUrl = create.ResumeUrl,
                GitHubUrl = create.GitHubUrl,
                LinkedInUrl = create.LinkedInUrl,
                Status = Enums.NFD_TraineeStatus.NotAssigned,
                VerificationStatus = Enums.NFD_VerificationStatus.Pending
            };

            await _service.AddAsync(model);
            var saved = await _service.SaveChangesAsync();
            if (!saved) return StatusCode(500, "Failed to create trainee profile.");

            return CreatedAtAction(nameof(GetById), new { id = model.TraineeId }, null);
        }

        // PUT: api/trainee/{id}/status
        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] TraineeStatusUpdateDto dto)
        {
            var existing = await _service.GetByIdAsync(id);
            if (existing == null) return NotFound();

            existing.Status = dto.Status;

            _service.Update(existing);
            var saved = await _service.SaveChangesAsync();
            if (!saved) return StatusCode(500, "Failed to update status.");

            if (dto.Status == Enums.NFD_TraineeStatus.Completed)
            {
                await _badgeEvaluationService.EvaluateTraineeAsync(id);
            }

            return NoContent();
        }

        // PUT: api/trainee/{id}/assign-company
        [HttpPut("{id}/assign-company")]
        public async Task<IActionResult> AssignCompany(int id, [FromBody] TraineeAssignCompanyDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            var existing = await _service.GetByIdAsync(id);
            if (existing == null) return NotFound();

            var companyExists = await _service.CompanyExistsAsync(dto.CompanyId);
            if (!companyExists) return BadRequest("Company does not exist.");

            existing.CompanyId = dto.CompanyId;
            _service.Update(existing);
            var saved = await _service.SaveChangesAsync();
            if (!saved) return StatusCode(500, "Failed to assign company.");

            return NoContent();
        }

        // GET: api/trainee/{id}/dashboard-summary
        [HttpGet("{id}/dashboard-summary")]
        public async Task<IActionResult> GetDashboardSummary(int id)
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

            return Ok(dto);
        }

        // POST: api/trainee/import
        [HttpPost("import")]
        public async Task<IActionResult> Import([FromBody] List<TraineeCreateDTO> items)
        {
            if (items == null || items.Count == 0) return BadRequest("No items provided.");

            int importedCount = 0;

            foreach (var item in items)
            {
                var existingUser = await _context.NFD_Users.FirstOrDefaultAsync(u => u.Email == item.Email);
                int userId;

                if (existingUser != null)
                {
                    userId = existingUser.UserId;
                }
                else
                {
                    var newUser = new NFD_User
                    {
                        FullName = item.FullName,
                        Email = item.Email,
                        PasswordHash = "DefaultHashedPassword123!",
                        RoleId = 4,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.NFD_Users.Add(newUser);
                    await _context.SaveChangesAsync();
                    userId = newUser.UserId;
                }

                var model = new NFD_Trainee
                {
                    UserId = userId,
                    NationalId = item.NationalId,
                    University = item.University,
                    Major = item.Major,
                    AcademicLevel = item.AcademicLevel,
                    Skills = item.Skills,
                    ResumeUrl = item.ResumeUrl,
                    GitHubUrl = item.GitHubUrl,
                    LinkedInUrl = item.LinkedInUrl,
                    Status = Enums.NFD_TraineeStatus.NotAssigned,
                    VerificationStatus = Enums.NFD_VerificationStatus.Pending
                };

                await _service.AddAsync(model);
                importedCount++;
            }

            var saved = await _service.SaveChangesAsync();
            if (!saved) return StatusCode(500, "Failed to import trainees.");

            return Ok(new { Imported = importedCount });
        }

        // GET: api/trainee/pending-verification
        [HttpGet("pending-verification")]
        public async Task<IActionResult> GetPendingVerification()
        {
            var trainees = await _service.GetPendingVerificationAsync();

            var dtos = trainees.Select(t => new TraineeListItemDto
            {
                TraineeId = t.TraineeId,
                FullName = t.User?.FullName,
                Email = t.User?.Email ?? string.Empty,
                University = t.University,
                Major = t.Major,
                Status = t.Status,
                VerificationStatus = t.VerificationStatus,
                CompanyId = t.CompanyId,
                CompanyName = t.Company?.CompanyName
            }).ToList();

            return Ok(dtos);
        }

        // PUT: api/trainee/{id}/verification
        [HttpPut("{id}/verification")]
        public async Task<IActionResult> UpdateVerification(int id, [FromBody] TraineeVerificationInputDTO dto)
        {
            var existing = await _service.GetByIdAsync(id);
            if (existing == null) return NotFound();

            existing.VerificationStatus = dto.Status;

            _service.Update(existing);
            var saved = await _service.SaveChangesAsync();
            if (!saved) return StatusCode(500, "Failed to update verification status.");

            return NoContent();
        }

        // GET: api/trainee/certificates-dashboard
        [HttpGet("certificates-dashboard")]
        public async Task<IActionResult> GetCertificatesDashboard(
            [FromQuery] int? companyId = null,
            [FromQuery] NFD_TraineeStatus? status = null, // 👈 التخلف الافتراضي null
            [FromQuery] string? university = null,
            [FromQuery] string? searchTerm = null,
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 20)
        {
            var (items, total) = await _service.GetAllAsync(companyId, status, university, searchTerm, pageNumber, pageSize);

            var dtos = items.Select(t =>
            {
                var firstEnrollment = t.Enrollments?.FirstOrDefault();

                return new TraineeListItemDto
                {
                    TraineeId = t.TraineeId,
                    FullName = t.User?.FullName,
                    Email = t.User?.Email ?? string.Empty,
                    University = t.University,
                    Major = t.Major,
                    Status = t.Status,
                    VerificationStatus = t.VerificationStatus,
                    CompanyId = t.CompanyId,
                    CompanyName = t.Company?.CompanyName,
                    EnrollmentId = firstEnrollment?.EnrollmentId ?? 0,
                    FileUrl = null
                };
            }).ToList();

            return Ok(new { Items = dtos, TotalCount = total });
        }

        // GET: api/trainee/traineeByUserID/{userId}
        [HttpGet("traineeByUserID/{userId}")]
        public async Task<IActionResult> GetTraineeIdByUserID(int userId)
        {
            var t = await _service.GetTraineeIdByUserID(userId);

            if (t == null)
                return NotFound(new { message = "Trainee not found for this UserId." });

            var dto = new TraineeProfileDto
            {
                TraineeId = t.TraineeId,
                FullName = t.User?.FullName,
                Email = t.User?.Email,
                NationalId = t.NationalId,
                University = t.University,
                Major = t.Major,
                AcademicLevel = t.AcademicLevel,
                Skills = t.Skills,
                ResumeUrl = t.ResumeUrl,
                GitHubUrl = t.GitHubUrl,
                LinkedInUrl = t.LinkedInUrl,
                Status = t.Status,
                VerificationStatus = t.VerificationStatus,
                CompanyId = t.CompanyId,
                CompanyName = t.Company?.CompanyName,
                Phone = t.User?.Phone,
                EnrollmentId = t.Enrollments?.LastOrDefault(u => u.TraineeId == t.TraineeId)?.EnrollmentId ?? 0
            };

            return Ok(dto);
        }
        // PUT: api/trainee/traineeByUserID/{userId}
        [HttpPut("traineeByUserID/{userId}")]
        public async Task<IActionResult> UpdateTraineeByUserID(
            int userId,
            [FromBody] TraineeUpdateDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Get trainee using UserId
            var trainee = await _service.GetTraineeIdByUserID(userId);

            if (trainee == null)
            {
                return NotFound(new
                {
                    message = "Trainee not found for this UserId."
                });
            }

            // Make sure User exists
            if (trainee.User == null)
            {
                return NotFound(new
                {
                    message = "User account not found."
                });
            }

            // Check if the new email is already used by another user
            var emailExists = await _context.NFD_Users
                .AnyAsync(u =>
                    u.Email == dto.Email &&
                    u.UserId != trainee.UserId);

            if (emailExists)
            {
                return BadRequest(new
                {
                    message = "This email is already registered by another user."
                });
            }

            // =========================
            // Update User information
            // =========================

            trainee.User.Email = dto.Email.Trim();

            trainee.User.Phone = string.IsNullOrWhiteSpace(dto.Phone)
                ? null
                : dto.Phone.Trim();

            // =========================
            // Update Trainee information
            // =========================

            trainee.Skills = string.IsNullOrWhiteSpace(dto.Skills)
                ? null
                : dto.Skills.Trim();

            trainee.ResumeUrl = string.IsNullOrWhiteSpace(dto.ResumeUrl)
                ? null
                : dto.ResumeUrl.Trim();

            trainee.GitHubUrl = string.IsNullOrWhiteSpace(dto.GitHubUrl)
                ? null
                : dto.GitHubUrl.Trim();

            trainee.LinkedInUrl = string.IsNullOrWhiteSpace(dto.LinkedInUrl)
                ? null
                : dto.LinkedInUrl.Trim();

            try
            {
                var saved = await _service.SaveChangesAsync();

                if (!saved)
                {
                    return StatusCode(500, new
                    {
                        message = "Failed to update trainee profile."
                    });
                }

                // Return the updated profile
                var updatedDto = new TraineeProfileDto
                {
                    TraineeId = trainee.TraineeId,
                    FullName = trainee.User.FullName,
                    Email = trainee.User.Email,
                    Phone = trainee.User.Phone,
                    NationalId = trainee.NationalId,
                    University = trainee.University,
                    Major = trainee.Major,
                    AcademicLevel = trainee.AcademicLevel,
                    Skills = trainee.Skills,
                    ResumeUrl = trainee.ResumeUrl,
                    GitHubUrl = trainee.GitHubUrl,
                    LinkedInUrl = trainee.LinkedInUrl,
                    Status = trainee.Status,
                    VerificationStatus = trainee.VerificationStatus,
                    CompanyId = trainee.CompanyId,
                    CompanyName = trainee.Company?.CompanyName,
                    EnrollmentId = trainee.Enrollments?
                        .LastOrDefault(e => e.TraineeId == trainee.TraineeId)?
                        .EnrollmentId ?? 0
                };

                return Ok(updatedDto);
            }
            catch (DbUpdateException)
            {
                return StatusCode(500, new
                {
                    message = "A database error occurred while updating the profile."
                });
            }
        }
    }
}