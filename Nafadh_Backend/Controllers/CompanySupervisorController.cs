
#nullable enable

using Microsoft.AspNetCore.Mvc;
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
    public class CompanySupervisorController : ControllerBase
    {
        private readonly ICompanySupervisorRepository _supervisorRepo;

        public CompanySupervisorController(
            ICompanySupervisorRepository supervisorRepo)
        {
            _supervisorRepo = supervisorRepo;
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
        // Update supervisor department / position
        // ============================================================
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateSupervisor(
            int id,
            [FromBody] UpdateCompanySupervisorDto updateDto)
        {
            var supervisor =
                await _supervisorRepo.GetByIdAsync(id);

            if (supervisor == null)
                return NotFound();

            supervisor.Department = updateDto.Department;
            supervisor.Position = updateDto.Position;

            await _supervisorRepo.UpdateAsync(supervisor);

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
