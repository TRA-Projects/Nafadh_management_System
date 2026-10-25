using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class WithdrawalRequestsController : ControllerBase
    {
        private readonly Nafadhcontext _context;
        private readonly IEmailService _emailService;

        public WithdrawalRequestsController(Nafadhcontext context, IEmailService emailService)
        {
            _context = context;
            _emailService = emailService;
        }

        // 1. جلب كل طلبات الانسحاب (للأدمن) مع الفلترة الاختيارية بالحالة
        // GET: api/WithdrawalRequests
        // GET: api/WithdrawalRequests?status=Pending
        [HttpGet]
        public async Task<IActionResult> GetAllRequests([FromQuery] NFD_WithdrawalRequestStatus? status)
        {
            var query = _context.NFD_WithdrawalRequests.AsQueryable();

            if (status.HasValue)
            {
                query = query.Where(r => r.Status == status.Value);
            }

            var requests = await query
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new WithdrawalRequestResponseDto
                {
                    Id = r.Id,
                    TraineeId = r.TraineeId,
                    TraineeName = r.Trainee != null && r.Trainee.User != null
                        ? r.Trainee.User.FullName
                        : null,
                    Reason = r.Reason,
                    Status = r.Status,
                    CreatedAt = r.CreatedAt,
                    ReviewedAt = r.ReviewedAt,
                    AdminNotes = r.AdminNotes
                })
                .ToListAsync();

            return Ok(requests);
        }

        // 2. جلب تفاصيل طلب واحد بواسطة Id
        // GET: api/WithdrawalRequests/5
        [HttpGet("{id}")]
        public async Task<IActionResult> GetRequestById(int id)
        {
            var request = await _context.NFD_WithdrawalRequests
                .Where(r => r.Id == id)
                .Select(r => new WithdrawalRequestResponseDto
                {
                    Id = r.Id,
                    TraineeId = r.TraineeId,
                    TraineeName = r.Trainee != null && r.Trainee.User != null
                        ? r.Trainee.User.FullName
                        : null,
                    Reason = r.Reason,
                    Status = r.Status,
                    CreatedAt = r.CreatedAt,
                    ReviewedAt = r.ReviewedAt,
                    AdminNotes = r.AdminNotes
                })
                .FirstOrDefaultAsync();

            if (request == null)
            {
                return NotFound(new { message = "طلب الانسحاب غير موجود." });
            }

            return Ok(request);
        }

        // 3. جلب جميع طلبات الانسحاب الخاصة بمتدرب محدد
        // GET: api/WithdrawalRequests/trainee/1
        [HttpGet("trainee/{traineeId}")]
        public async Task<IActionResult> GetTraineeRequests(int traineeId)
        {
            var requests = await _context.NFD_WithdrawalRequests
                .Where(r => r.TraineeId == traineeId)
                .OrderByDescending(r => r.CreatedAt)
                .Select(r => new WithdrawalRequestResponseDto
                {
                    Id = r.Id,
                    TraineeId = r.TraineeId,
                    TraineeName = r.Trainee != null && r.Trainee.User != null
                        ? r.Trainee.User.FullName
                        : null,
                    Reason = r.Reason,
                    Status = r.Status,
                    CreatedAt = r.CreatedAt,
                    ReviewedAt = r.ReviewedAt,
                    AdminNotes = r.AdminNotes
                })
                .ToListAsync();

            return Ok(requests);
        }

        // 4. تقديم طلب انسحاب جديد من المتدرب
        // POST: api/WithdrawalRequests
        [HttpPost]
        public async Task<IActionResult> CreateRequest([FromBody] CreateWithdrawalRequestDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // التحقق من وجود المتدرب
            var traineeExists = await _context.NFD_Trainees.AnyAsync(t => t.TraineeId == dto.TraineeId);
            if (!traineeExists)
            {
                return BadRequest(new { message = "المتدرب غير مسجل في النظام." });
            }

            // منع تقديم أكثر من طلب معلق في نفس الوقت لنفس المتدرب
            var hasPendingRequest = await _context.NFD_WithdrawalRequests
                .AnyAsync(r => r.TraineeId == dto.TraineeId && r.Status == NFD_WithdrawalRequestStatus.Pending);

            if (hasPendingRequest)
            {
                return BadRequest(new { message = "لديك بالفعل طلب انسحاب معلق قيد المراجعة." });
            }

            var request = new NFD_WithdrawalRequest
            {
                TraineeId = dto.TraineeId,
                Reason = dto.Reason,
                Status = NFD_WithdrawalRequestStatus.Pending,
                CreatedAt = DateTime.UtcNow
            };

            _context.NFD_WithdrawalRequests.Add(request);
            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "تم تقديم طلب الانسحاب بنجاح وهو الآن قيد المراجعة.",
                requestId = request.Id
            });
        }

        // 5. مراجعة الأدمن لطلب الانسحاب (قبول أو رفض) وتحديث حالة المتدرب تلقائياً
        // PUT: api/WithdrawalRequests/5/review
        [HttpPut("{id}/review")]
        public async Task<IActionResult> ReviewRequest(int id, [FromBody] ReviewWithdrawalRequestDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // التحقق من أن الحالة المرسلة إما قبول أو رفض فقط
            if (dto.Status != NFD_WithdrawalRequestStatus.Approved && dto.Status != NFD_WithdrawalRequestStatus.Rejected)
            {
                return BadRequest(new { message = "يجب اختيار حالة صحيحة: Approved (مقبول) أو Rejected (مرفوض)." });
            }

            // جلب طلب الانسحاب
            var request = await _context.NFD_WithdrawalRequests.FirstOrDefaultAsync(r => r.Id == id);

            if (request == null)
            {
                return NotFound(new { message = "طلب الانسحاب غير موجود." });
            }

            if (request.Status != NFD_WithdrawalRequestStatus.Pending)
            {
                return BadRequest(new { message = "تمت مراجعة هذا الطلب مسبقاً ولا يمكن تعديله مرة أخرى." });
            }

            // تحديث بيانات الطلب
            request.Status = dto.Status;
            request.AdminNotes = dto.AdminNotes;
            request.ReviewedAt = DateTime.UtcNow;

            // 1- في حال الموافقة (Approved) -> تحديث حالة المتدرب والتسجيل
            if (dto.Status == NFD_WithdrawalRequestStatus.Approved)
            {
                var trainee = await _context.NFD_Trainees
                    .FirstOrDefaultAsync(t => t.TraineeId == request.TraineeId);

                if (trainee != null)
                {
                    trainee.Status = NFD_TraineeStatus.NotAssigned;
                    // 2. إرسال البريد الإلكتروني للمتدرب
                    if (trainee.User != null && !string.IsNullOrWhiteSpace(trainee.User.Email))
                    {
                        try
                        {
                            await _emailService.SendWithdrawalApprovedAsync(
                                trainee.User.Email,
                                trainee.User.FullName ?? "المتدرب"
                            );
                        }
                        catch (Exception ex)
                        {
                            // في حال فشل إرسال الإيميل، نسجل الخطأ ولا نوقف عملية الانسحاب
                            Console.WriteLine($"Failed to send email: {ex.Message}");
                        }
                    }
                }

                //3- تحديث حالة التدريب الحالي إلى Dropped
                var activeEnrollment = await _context.NFD_Enrollments
                    .Where(e => e.TraineeId == request.TraineeId && e.CompletionStatus == NFD_EnrollmentCompletionStatus.InProgress)
                    .FirstOrDefaultAsync();

                if (activeEnrollment != null)
                {
                    activeEnrollment.CompletionStatus = NFD_EnrollmentCompletionStatus.Dropped;
                }
            }

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "تم تحديث حالة طلب الانسحاب بنجاح وتحديث بيانات المتدرب.",
                requestId = request.Id,
                newStatus = request.Status.ToString()
            });
        }
    }
}