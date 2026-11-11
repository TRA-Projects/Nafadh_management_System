
#nullable enable

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Enums;
using System.Linq;
using System.Collections.Generic;
using System.Threading.Tasks;
using Nafadh_Backend.Models;
using Nafadh_Backend.Interfaces;
using Nafadh_Backend.DTOs;

namespace Nafadh_Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Roles = "CompanySupervisor,Admin,SuperAdmin")]
    [TypeFilter(typeof(CompanySupervisorCompanyScopeFilter))]
    public class CompanySupervisorController : ControllerBase
    {
        private readonly ICompanySupervisorRepository _supervisorRepo;
        private readonly Nafadhcontext _db;

        public CompanySupervisorController(
            ICompanySupervisorRepository supervisorRepo,
            Nafadhcontext db)
        {
            _supervisorRepo = supervisorRepo;
            _db = db;
        }

        // ============================================================
        // GET: api/CompanySupervisor
        // Get all supervisors
        // ============================================================
        [HttpGet]
        public async Task<IActionResult> GetAllSupervisors()
        {
            var supervisors = await _supervisorRepo.GetAllAsync();

            var dtos = supervisors.Select(s => new CompanySupervisorDto
            {
                SupervisorId = s.SupervisorId,
                Department = s.Department,
                Position = s.Position,
                UserId = s.UserId,
                CompanyId = s.CompanyId,
                FullName = s.User?.FullName,
                Phone = s.User?.Phone,
                Email = s.User?.Email,
                Status = s.Status.ToString(),

                Permissions = s.User?.Role?.RolePermissions?
                    .Where(rp => rp.Permission != null)
                    .Select(rp => rp.Permission.PermissionKey)
                    .ToList()
                    ?? new List<string>()
            });

            return Ok(dtos);
        }

        // ============================================================
        // GET: api/CompanySupervisor/company/{companyId}
        // Get supervisors by company
        // ============================================================
        [HttpGet("company/{companyId}")]
        public async Task<IActionResult> GetSupervisorsByCompany(
            int companyId)
        {
            var supervisors =
                await _supervisorRepo.GetByCompanyIdAsync(companyId);

            var dtos = supervisors.Select(s => new CompanySupervisorDto
            {
                SupervisorId = s.SupervisorId,
                Department = s.Department,
                Position = s.Position,
                UserId = s.UserId,
                CompanyId = s.CompanyId,
                FullName = s.User?.FullName,
                Phone = s.User?.Phone,
                Email = s.User?.Email,
                Status = s.Status.ToString(),

                Permissions = s.User?.Role?.RolePermissions?
                    .Where(rp => rp.Permission != null)
                    .Select(rp => rp.Permission.PermissionKey)
                    .ToList()
                    ?? new List<string>()
            });

            return Ok(dtos);
        }

        // ============================================================
        // GET: api/CompanySupervisor/{id}
        // Get supervisor profile
        // ============================================================
        [HttpGet("{id}")]
        public async Task<IActionResult> GetSupervisorProfile(int id)
        {
            var supervisor =
                await _supervisorRepo.GetByIdAsync(id);

            if (supervisor == null)
                return NotFound();

            var dto = new CompanySupervisorDto
            {
                SupervisorId = supervisor.SupervisorId,
                FullName = supervisor.User?.FullName,
                Phone = supervisor.User?.Phone,
                Email = supervisor.User?.Email,
                Status = supervisor.Status.ToString(),
                Department = supervisor.Department,
                Position = supervisor.Position,
                UserId = supervisor.UserId,
                CompanyId = supervisor.CompanyId,

                Permissions = supervisor.User?.Role?.RolePermissions?
                    .Where(rp => rp.Permission != null)
                    .Select(rp => rp.Permission.PermissionKey)
                    .ToList()
                    ?? new List<string>()
            };

            return Ok(dto);
        }

        // ============================================================
        // POST: api/CompanySupervisor
        // Add supervisor
        // ============================================================
        [HttpPost]
        public async Task<IActionResult> AddSupervisor(
            [FromBody] CreateCompanySupervisorDto createDto)
        {
            var supervisor = new NFD_CompanySupervisor
            {
                Department = createDto.Department,
                Position = createDto.Position,
                UserId = createDto.UserId,
                CompanyId = createDto.CompanyId
            };

            await _supervisorRepo.AddAsync(supervisor);

            return CreatedAtAction(
                nameof(GetSupervisorProfile),
                new { id = supervisor.SupervisorId },
                supervisor
            );
        }

        // ============================================================
        // PUT: api/CompanySupervisor/{id}
        // Update supervisor profile and membership state together with the linked user.
        // The existing company scope filter checks ownership of the supervisor ID.
        // ============================================================
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateSupervisor(
            int id,
            [FromBody] UpdateCompanySupervisorDto updateDto)
        {
            if (updateDto == null)
                return BadRequest(new { message = "بيانات المشرف مطلوبة." });

            var supervisor = await _supervisorRepo.GetByIdAsync(id);
            if (supervisor == null)
                return NotFound();
            if (supervisor.User == null)
                return Conflict(new { message = "حساب المستخدم المرتبط بالمشرف غير موجود." });

            var user = supervisor.User;
            if (updateDto.FullName != null)
            {
                var name = updateDto.FullName.Trim();
                if (name.Length < 2 || name.Length > 150)
                    return BadRequest(new { message = "اسم المشرف يجب أن يكون بين 2 و150 حرفًا." });
                user.FullName = name;
            }

            if (updateDto.Email != null)
            {
                var email = updateDto.Email.Trim().ToLowerInvariant();
                if (string.IsNullOrWhiteSpace(email) || email.Length > 150 ||
                    !new System.ComponentModel.DataAnnotations.EmailAddressAttribute().IsValid(email))
                    return BadRequest(new { message = "البريد الإلكتروني غير صحيح." });
                if (await _db.NFD_Users.AsNoTracking().AnyAsync(u =>
                    u.UserId != user.UserId && u.Email.ToLower() == email))
                    return Conflict(new { message = "البريد الإلكتروني مرتبط بحساب آخر." });
                user.Email = email;
            }

            if (updateDto.Phone != null)
            {
                var phone = updateDto.Phone.Trim();
                if (phone.Length > 0 &&
                    !System.Text.RegularExpressions.Regex.IsMatch(phone, @"^\+?[0-9]{8,15}$"))
                    return BadRequest(new { message = "رقم الهاتف يجب أن يتكون من 8 إلى 15 رقمًا." });
                user.Phone = phone.Length == 0 ? null : phone;
            }

            if (updateDto.Department != null)
            {
                var department = updateDto.Department.Trim();
                if (department.Length > 100)
                    return BadRequest(new { message = "اسم القسم يتجاوز الحد المسموح." });
                supervisor.Department = department.Length == 0 ? null : department;
            }
            if (updateDto.Position != null)
            {
                var position = updateDto.Position.Trim();
                if (position.Length > 100)
                    return BadRequest(new { message = "المسمى الوظيفي يتجاوز الحد المسموح." });
                supervisor.Position = position.Length == 0 ? null : position;
            }

            if (updateDto.Status != null)
            {
                if (!System.Enum.TryParse<NFD_SupervisorStatus>(updateDto.Status.Trim(), true, out var status) ||
                    !System.Enum.IsDefined(status))
                    return BadRequest(new { message = "حالة المشرف غير صحيحة." });

                if (!User.IsInRole("Admin") && !User.IsInRole("SuperAdmin") &&
                    status == NFD_SupervisorStatus.Suspended)
                    return Forbid();

                // Company supervisors cannot override a globally suspended user account.
                var isAdministrator = User.IsInRole("Admin") || User.IsInRole("SuperAdmin");
                if (user.Status == NFD_UserStatus.Suspended && !isAdministrator)
                    return Conflict(new { message = "لا يمكن تغيير حالة حساب أوقفته الإدارة." });

                // Never lock a company out by deactivating its last active supervisor.
                if (status != NFD_SupervisorStatus.Active &&
                    supervisor.Status == NFD_SupervisorStatus.Active && !isAdministrator)
                {
                    var anotherActiveSupervisor = await _db.NFD_CompanySupervisors.AsNoTracking()
                        .AnyAsync(s => s.CompanyId == supervisor.CompanyId &&
                                       s.SupervisorId != id &&
                                       s.Status == NFD_SupervisorStatus.Active &&
                                       s.User.Status == NFD_UserStatus.Active);
                    if (!anotherActiveSupervisor)
                        return Conflict(new { message = "لا يمكن تعطيل آخر مشرف نشط في الشركة." });
                }

                supervisor.Status = status;
                if (status == NFD_SupervisorStatus.Active)
                    user.Status = NFD_UserStatus.Active;
                else
                {
                    // The user account can belong to another active company membership.
                    var hasOtherActiveMembership = await _db.NFD_CompanySupervisors.AsNoTracking()
                        .AnyAsync(s => s.UserId == user.UserId && s.SupervisorId != id &&
                                       s.Status == NFD_SupervisorStatus.Active);
                    if (!hasOtherActiveMembership)
                        user.Status = status == NFD_SupervisorStatus.Suspended
                            ? NFD_UserStatus.Suspended : NFD_UserStatus.Inactive;
                }
            }

            // Both entities are tracked by GetByIdAsync; one SaveChanges is atomic.
            await _db.SaveChangesAsync();
            return NoContent();
        }

        // ============================================================
        // DELETE: api/CompanySupervisor/{id}
        // Delete supervisor
        // ============================================================
        [HttpDelete("{id}")]
        public async Task<IActionResult> RemoveSupervisor(int id)
        {
            var supervisor =
                await _supervisorRepo.GetByIdAsync(id);

            if (supervisor == null)
                return NotFound();

            await _supervisorRepo.DeleteAsync(supervisor);

            return NoContent();
        }

        // ============================================================
        // GET: api/CompanySupervisor/{id}/trainees
        // Get trainees assigned to supervisor
        // ============================================================
        [HttpGet("{id}/trainees")]
        public async Task<IActionResult> GetAssignedTrainees(int id)
        {
            var trainees =
                await _supervisorRepo.GetAssignedTraineesAsync(id);

            return Ok(trainees);
        }

        // ============================================================
        // GET: api/CompanySupervisor/company/{companyId}/enrollments
        // Get company enrollments for distribution
        // ============================================================
        [HttpGet("company/{companyId}/enrollments")]
        public async Task<IActionResult> GetCompanyEnrollmentsForDistribution(
            int companyId)
        {
            var enrollments =
                await _supervisorRepo.GetCompanyEnrollmentsAsync(companyId);

            var result = enrollments.Select(e => new SupervisorEnrollmentDto
            {
                EnrollmentId = e.EnrollmentId,
                TraineeId = e.TraineeId,
                TraineeName = e.Trainee?.User?.FullName ?? "متدرب بدون اسم",
                Email = e.Trainee?.User?.Email,
                BatchId = e.BatchId,
                BatchLabel = $"الدفعة #{e.BatchId}",
                SupervisorId = e.SupervisorId
            });

            return Ok(result);
        }

        // ============================================================
        // PUT: api/CompanySupervisor/company/{companyId}/{id}/enrollments
        // Save distribution of trainee enrollment records
        // ============================================================
        [HttpPut("company/{companyId}/{id}/enrollments")]
        public async Task<IActionResult> AssignEnrollmentsToSupervisor(
            int companyId,
            int id,
            [FromBody] AssignEnrollmentsDto? request)
        {
            if (request?.EnrollmentIds == null)
            {
                return BadRequest(new
                {
                    message = "قائمة التسجيلات مطلوبة."
                });
            }

            if (request.EnrollmentIds.Any(enrollmentId => enrollmentId <= 0))
            {
                return BadRequest(new
                {
                    message = "تحتوي قائمة التسجيلات على معرّف غير صالح."
                });
            }

            var saved = await _supervisorRepo.SaveEnrollmentDistributionAsync(
                companyId,
                id,
                request.EnrollmentIds);

            if (!saved)
            {
                return BadRequest(new
                {
                    message = "تعذر الحفظ. تحقق من المشرف والتسجيلات التابعة للشركة."
                });
            }

            return Ok(new
            {
                message = "تم حفظ توزيع التسجيلات بنجاح.",
                supervisorId = id,
                companyId,
                enrollmentIds = request.EnrollmentIds.Distinct().ToArray()
            });
        }

        // ============================================================
        // GET: api/CompanySupervisor/{supervisorId}/trainers
        // Get assigned trainers with their names and specialties
        // ============================================================
        [HttpGet("{supervisorId:int}/trainers")]
        public async Task<IActionResult> GetSupervisorTrainers(
            int supervisorId)
        {
            var supervisor =
                await _supervisorRepo.GetByIdAsync(supervisorId);

            if (supervisor == null)
            {
                return NotFound(new
                {
                    message = "المشرف غير موجود."
                });
            }

            var trainers =
                await _supervisorRepo.GetAssignedTrainersAsync(supervisorId);

            return Ok(trainers);
        }

        // ============================================================
        // PUT: api/CompanySupervisor/{supervisorId}/trainers
        // Assign trainers to supervisor
        // ============================================================
        [HttpPut("{supervisorId:int}/trainers")]
        public async Task<IActionResult> AssignSupervisorTrainers(
            int supervisorId,
            [FromBody] AssignSupervisorTrainersRequest? request)
        {
            if (request?.TrainerIds == null)
            {
                return BadRequest(new
                {
                    message = "قائمة المدربين مطلوبة."
                });
            }

            var saved = await _supervisorRepo.SaveTrainerAssignmentsAsync(
                supervisorId,
                request.TrainerIds);

            if (!saved)
            {
                return BadRequest(new
                {
                    message = "تعذر حفظ الإسناد. تحققي من المشرف ومعرّفات المدربين."
                });
            }

            return Ok(new
            {
                message = "تم حفظ إسناد المدربين بنجاح.",
                trainerIds = request.TrainerIds.Distinct().ToArray()
            });
        }

        // ============================================================
        // GET: api/CompanySupervisor/{supervisorId}/trainer-evaluations
        // Get trainer evaluations for supervisor
        // ============================================================
        [HttpGet("{supervisorId:int}/trainer-evaluations")]
        public async Task<IActionResult> GetSupervisorTrainerEvaluations(
            int supervisorId)
        {
            var supervisor =
                await _supervisorRepo.GetByIdAsync(supervisorId);

            if (supervisor == null)
            {
                return NotFound(new
                {
                    message = "المشرف غير موجود."
                });
            }

            var evaluations =
                await _supervisorRepo.GetTrainerEvaluationsAsync(supervisorId);

            return Ok(evaluations);
        }

        // ============================================================
        // PUT: api/CompanySupervisor/{supervisorId}/trainer-evaluations/{trainerId}
        // Save or update trainer evaluation
        // ============================================================
        [HttpPut("{supervisorId:int}/trainer-evaluations/{trainerId:int}")]
        public async Task<IActionResult> SaveSupervisorTrainerEvaluation(
            int supervisorId,
            int trainerId,
            [FromBody] SaveSupervisorTrainerEvaluationRequest? request)
        {
            if (request == null ||
                request.Rating < 1 ||
                request.Rating > 5)
            {
                return BadRequest(new
                {
                    message = "التقييم يجب أن يكون من 1 إلى 5."
                });
            }

            var supervisor =
                await _supervisorRepo.GetByIdAsync(supervisorId);

            if (supervisor == null)
            {
                return NotFound(new
                {
                    message = "المشرف غير موجود."
                });
            }

            var saved = await _supervisorRepo.SaveTrainerEvaluationAsync(
                supervisorId,
                trainerId,
                request.Rating,
                request.Comment);

            if (!saved)
            {
                return BadRequest(new
                {
                    message = "تعذر حفظ التقييم. تأكدي من إسناد المدرب إلى المشرف."
                });
            }

            return Ok(new
            {
                message = "تم حفظ التقييم بنجاح."
            });
        }
    }
}
