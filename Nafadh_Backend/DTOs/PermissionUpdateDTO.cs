

using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
   
    public class PermissionUpdateDTO
    {
        [MaxLength(300)]
        public string? Description { get; set; }
    }
}
