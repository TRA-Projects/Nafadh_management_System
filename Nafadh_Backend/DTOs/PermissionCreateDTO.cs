

using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
   
    public class PermissionCreateDTO
    {
        
        [Required]
        [MaxLength(100)]
        [RegularExpression(@"^[a-z0-9]+([._-][a-z0-9]+)*$",
            ErrorMessage = "PermissionKey must be lowercase, dot/underscore/hyphen separated (e.g. 'warning.escalate').")]
        public string PermissionKey { get; set; } = string.Empty;

        [MaxLength(300)]
        public string? Description { get; set; }
    }
}
