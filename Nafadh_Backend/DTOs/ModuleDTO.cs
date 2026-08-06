using Nafadh_Backend.Models;
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.DTOs
{
    public class ModuleDTO
    {
        public int ModuleId { get; set; }
        public int ProgramId { get; set; }
        public string Title { get; set; }
        public decimal OrderIndex { get; set; }
        public DateTime? AvailableFrom { get; set; }
        public DateTime? AvailableTo { get; set; }
        public bool IsArchived { get; set; }
        public int? PrerequisiteModuleId { get; set; }
    }
    public class CreateModuleDTO
    {
        [Required(ErrorMessage = "ProgramId is required.")]
        public int ProgramId { get; set; }

        [Required(ErrorMessage = "Module Title is required.")]
        [StringLength(150, ErrorMessage = "Title cannot exceed 150 characters.")]
        public string Title { get; set; }= string.Empty;

        [Required(ErrorMessage = "OrderIndex is required.")]
        [Range(0.0, double.MaxValue, ErrorMessage = "OrderIndex must be a positive number.")]
        public decimal OrderIndex { get; set; }

        public DateTime? AvailableFrom { get; set; }
        public DateTime? AvailableTo { get; set; }
        public int? PrerequisiteModuleId { get; set; }
    }
    public class UpdateModuleDTO
    {
       
        [Required(ErrorMessage = "Module Title is required.")]
        [StringLength(150, ErrorMessage = "Title cannot exceed 150 characters.")]
        public string Title { get; set; }= string.Empty;


        [Required(ErrorMessage = "OrderIndex is required.")]
        [Range(0.0, double.MaxValue, ErrorMessage = "OrderIndex must be a positive number.")]
        public decimal OrderIndex { get; set; }

        public DateTime? AvailableFrom { get; set; }
        public DateTime? AvailableTo { get; set; }
        public bool IsArchived { get; set; }
        public int? PrerequisiteModuleId { get; set; }
    }
}
