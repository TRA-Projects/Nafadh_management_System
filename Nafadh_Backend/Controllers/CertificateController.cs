using System;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend;
using Nafadh_Backend.DTOs;
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

        // GET certificate by enrollment
        [HttpGet("enrollment/{enrollmentId}")]
        public async Task<IActionResult> GetCertificateByEnrollment(int enrollmentId)
        {
            var result =
                await _service.GetCertificateByEnrollmentIdAsync(enrollmentId);

            if (result == null)
                return NotFound();

            return Ok(result);
        }

        // Create certificate + Send Email to Trainee
        [HttpPost]
        public async Task<IActionResult> AddCertificate([FromBody] CertificateInputDTO dto)
        {
            try
            {
                // نتأكد أولاً هل الشهادة كانت موجودة مسبقاً حتى لا نرسل إيميل مكرر
                var existingCert =
                    await _service.GetCertificateByEnrollmentIdAsync(dto.EnrollmentId);

                var result =
                    await _service.AddCertificateAsync(dto);

                if (result == null)
                {
                    return BadRequest("Unable to issue certificate.");
                }

                bool emailSent = false;

                // إرسال إيميل التهنئة بالشهادة إذا تم إصدارها الآن
                if (existingCert == null)
                {
                    var enrollment =
                        await _enrollmentService.GetEnrollmentByIdAsync(dto.EnrollmentId);

                    if (enrollment != null)
                    {
                        var trainee = await _context.NFD_Trainees
                            .Include(t => t.User)
                            .FirstOrDefaultAsync(t => t.TraineeId == enrollment.TraineeId);

                        if (trainee?.User != null && !string.IsNullOrWhiteSpace(trainee.User.Email))
                        {
                            string cleanEmail = new string(trainee.User.Email
                                .Where(c => !char.IsWhiteSpace(c) &&
                                            char.GetUnicodeCategory(c) != UnicodeCategory.Format)
                                .ToArray());

                            string traineeName = !string.IsNullOrWhiteSpace(enrollment.TraineeName)
                                ? enrollment.TraineeName
                                : (trainee.User.FullName ?? "المتدرب");

                            string? programName = !string.IsNullOrWhiteSpace(enrollment.ProgramTitle)
                                ? enrollment.ProgramTitle
                                : enrollment.BatchName;

                            try
                            {
                                await _emailService.SendCertificateIssuedAsync(
                                    cleanEmail,
                                    traineeName,
                                    programName,
                                    result.FileUrl
                                );
                                emailSent = true;
                            }
                            catch (Exception ex)
                            {
                                Console.WriteLine($"Failed to send certificate email: {ex.Message}");
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

        // GET Certificate/{id}/download
        [HttpGet("{id}/download")]
        public async Task<IActionResult> DownloadCertificate(int id)
        {
            var fileUrl = await _service.DownloadCertificateAsync(id);

            if (string.IsNullOrWhiteSpace(fileUrl))
                return NotFound("Certificate file not found.");

            return Redirect(fileUrl);
        }

        // Get all certificates for trainee
        [HttpGet("trainee/{traineeId}")]
        public async Task<IActionResult> GetCertificatesByTrainee(int traineeId)
        {
            var result = await _service.GetCertificatesByTraineeIdAsync(traineeId);

            if (result == null || !result.Any())
                return NotFound();

            return Ok(result);
        }

        //=================-- Admin portal =================--

        [HttpGet("batch/{batchId}/status")]
        public async Task<IActionResult> GetBatchCertificatesStatus(int batchId)
        {
            var result = await _service.GetBatchCertificatesStatusAsync(batchId);
            if (result == null)
                return NotFound();

            return Ok(result);
        }

        [HttpPatch("enrollment/{enrollmentId}/status")]
        public async Task<IActionResult> UpdateCertificateStatus(int enrollmentId, [FromBody] UpdateCertificateStatusDTO dto)
        {
            var result = await _service.UpdateCertificateStatusAsync(enrollmentId, dto.IsIssued);
            if (result == null)
                return NotFound();

            return Ok(new { Message = "تم تحديث حالة الشهادة", Certificate = result });
        }
    }
}