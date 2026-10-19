using System.ComponentModel.DataAnnotations;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    // DTO لتقديم المتدرب طلب انسحاب جديد
    public class CreateWithdrawalRequestDto
    {
        [Required(ErrorMessage = "معرف المتدرب مطلوب")]
        public int TraineeId { get; set; }

        [Required(ErrorMessage = "سبب الانسحاب مطلوب")]
        [MaxLength(1000, ErrorMessage = "لا يمكن أن يتجاوز السبب 1000 حرف")]
        public string Reason { get; set; } = string.Empty;
    }

    // DTO لمراجعة الأدمن للطلب (قبول أو رفض)
    public class ReviewWithdrawalRequestDto
    {
        [Required(ErrorMessage = "الحالة مطلوبة")]
        public NFD_WithdrawalRequestStatus Status { get; set; } // Approved (1) or Rejected (2)

        [MaxLength(500)]
        public string? AdminNotes { get; set; }
    }

    // DTO لعرض تفاصيل الطلب
    public class WithdrawalRequestResponseDto
    {
        public int Id { get; set; }
        public int TraineeId { get; set; }
        public string? TraineeName { get; set; } // اسم المتدرب إن أردتِ إظهاره
        public string Reason { get; set; } = string.Empty;
        public NFD_WithdrawalRequestStatus Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public string? AdminNotes { get; set; }
    }
}