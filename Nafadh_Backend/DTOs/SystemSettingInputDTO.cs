using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class SystemSettingInputDTO
    {
        [Required(ErrorMessage = "Key is required.")]
        [StringLength(100, ErrorMessage = "Key cannot exceed 100 characters.")]
        public string Key { get; set; } = string.Empty;


        [Required(ErrorMessage = "Value is required.")]
        public string Value { get; set; } = string.Empty;


        [StringLength(300, ErrorMessage = "Description cannot exceed 300 characters.")]
        public string? Description { get; set; }
    }
}