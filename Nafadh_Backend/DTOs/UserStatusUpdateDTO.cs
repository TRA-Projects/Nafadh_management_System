

using System.ComponentModel.DataAnnotations;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    
    public class UserStatusUpdateDTO
    {
        [Required]
        [EnumDataType(typeof(NFD_UserStatus))]
        public NFD_UserStatus Status { get; set; }
    }
}
