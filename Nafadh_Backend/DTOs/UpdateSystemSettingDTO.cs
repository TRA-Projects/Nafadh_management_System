using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class UpdateSystemSettingDTO
    {
        [Required(ErrorMessage = "Value is required.")]
        public string Value { get; set; } = string.Empty;


        [StringLength(300, ErrorMessage = "Description cannot exceed 300 characters.")]
        public string? Description { get; set; }
    }
}