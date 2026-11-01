using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class EnrollmentController : ControllerBase
    {
        private readonly IEnrollmentService _service;
        private readonly Nafadhcontext _context;
        private readonly IEmailService _emailService;

        public EnrollmentController(
            IEnrollmentService service,
            Nafadhcontext context,
            IEmailService emailService)
        {
            _service = service;
            _context = context;
            _emailService = emailService;
        }

        // GET /api/Enrollment?batchId=&traineeId=&companyId=&status=
        [HttpGet]
        public async Task<ActionResult<IEnumerable<EnrollmentDTO>>> GetAll(
            [FromQuery] int? batchId,
            [FromQuery] int? traineeId,
            [FromQuery] int? companyId,
            [FromQuery] NFD_EnrollmentCompletionStatus? status)
        {
            var filter = new EnrollmentFilterDto
            {
                BatchId = batchId,
                TraineeId = traineeId,
                CompanyId = companyId,
                Status = status
            };

            var enrollments = await _service.GetAllEnrollmentsAsync(filter);

            return Ok(enrollments);
        }

        // GET /api/Enrollment/{id}
        [HttpGet("{id:int}")]
        public async Task<ActionResult<EnrollmentDTO>> GetById(int id)
        {
            var enrollment = await _service.GetEnrollmentByIdAsync(id);

            if (enrollment is null)
                return NotFound(new
                {
                    message = $"Enrollment with ID {id} was not found."
                });

            return Ok(enrollment);
        }

        // POST /api/Enrollment
        // تسجيل متدرب في دفعة / شركة / قسم + إرسال إيميل باسم الدفعة والبرنامج
        [HttpPost]
        public async Task<ActionResult<EnrollmentDTO>> Create(
            [FromBody] CreateEnrollmentDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var (result, error) =
                await _service.CreateEnrollmentAsync(dto);

            if (error is not null)
                return BadRequest(new
                {
                    message = error
                });

            // جلب إيميل واسم المتدرب لإرسال إيميل التسجيل في الدفعة والبرنامج
            var trainee = await _context.NFD_Trainees
                .Include(t => t.User)
                .FirstOrDefaultAsync(t => t.TraineeId == dto.TraineeId);

            if (trainee?.User != null && !string.IsNullOrWhiteSpace(trainee.User.Email))
            {
                string traineeName = !string.IsNullOrWhiteSpace(result?.TraineeName)
                    ? result.TraineeName
                    : (trainee.User.FullName ?? "المتدرب");

                string batchName = !string.IsNullOrWhiteSpace(result?.BatchName)
                    ? result.BatchName
                    : $"دفعة #{dto.BatchId}";

                string programName = !string.IsNullOrWhiteSpace(result?.ProgramTitle)
                    ? result.ProgramTitle
                    : (!string.IsNullOrWhiteSpace(result?.TrackName) ? result.TrackName : "البرنامج التدريبي");

                try
                {
                    await _emailService.SendTraineeEnrolledAsync(
                        trainee.User.Email,
                        traineeName,
                        batchName,
                        programName
                    );
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"Failed to send enrollment email: {ex.Message}");
                }
            }

            return CreatedAtAction(
                nameof(GetById),
                new { id = result!.EnrollmentId },
                result);
        }

        // PUT /api/Enrollment/{id}
        [HttpPut("{id:int}")]
        public async Task<ActionResult<EnrollmentDTO>> UpdateAssignment(
            int id,
            [FromBody] UpdateEnrollmentAssignmentDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var (result, error) =
                await _service.UpdateAssignmentAsync(id, dto);

            if (error == "not_found")
                return NotFound(new
                {
                    message = $"Enrollment with ID {id} was not found."
                });

            if (error is not null)
                return BadRequest(new
                {
                    message = error
                });

            return Ok(result);
        }

        // PUT /api/Enrollment/{id}/status
        [HttpPut("{id:int}/status")]
        public async Task<ActionResult<EnrollmentDTO>> UpdateStatus(
            int id,
            [FromBody] UpdateEnrollmentStatusDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var (result, error) =
                await _service.UpdateStatusAsync(id, dto);

            if (error == "not_found")
                return NotFound(new
                {
                    message = $"Enrollment with ID {id} was not found."
                });

            if (error is not null)
                return BadRequest(new
                {
                    message = error
                });

            return Ok(result);
        }

        // DELETE /api/Enrollment/{id}
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Withdraw(int id)
        {
            var withdrawn =
                await _service.WithdrawEnrollmentAsync(id);

            if (!withdrawn)
                return NotFound(new
                {
                    message = $"Enrollment with ID {id} was not found."
                });

            return NoContent();
        }

        // GET /api/Enrollment/trainee/{traineeId}
        [HttpGet("trainee/{traineeId:int}")]
        public async Task<ActionResult<IEnumerable<EnrollmentDTO>>> GetByTrainee(
            int traineeId)
        {
            var enrollments =
                await _service.GetByTraineeIdAsync(traineeId);

            return Ok(enrollments);
        }

        // GET /api/Enrollment/company/{companyId}
        [HttpGet("company/{companyId:int}")]
        public async Task<ActionResult<IEnumerable<EnrollmentDTO>>> GetByCompany(
            int companyId)
        {
            var enrollments =
                await _service.GetByCompanyIdAsync(companyId);

            return Ok(enrollments);
        }

        // GET /api/Enrollment/{id}/progress-summary
        [HttpGet("{id:int}/progress-summary")]
        public async Task<ActionResult<ProgressSummaryDto>> GetProgressSummary(
            int id)
        {
            var summary =
                await _service.GetProgressSummaryAsync(id);

            if (summary is null)
                return NotFound(new
                {
                    message = $"Enrollment with ID {id} was not found."
                });

            return Ok(summary);
        }

        // POST /api/Enrollment/trainee/{traineeId}/upload-image
        [HttpPost("trainee/{traineeId:int}/upload-image")]
        public async Task<IActionResult> UploadProfileImage(
            int traineeId,
            IFormFile file)
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new
                {
                    message = "الرجاء اختيار ملف صورة صحيح."
                });
            }

            var success =
                await _service.UploadTraineeProfileImageAsync(
                    traineeId,
                    file);

            if (success)
            {
                return NotFound(new
                {
                    message = $"Trainee with ID {traineeId} was not found."
                });
            }

            return Ok(new
            {
                message = "تم رفع وتحديث الصورة الشخصية بنجاح."
            });
        }
    }
}