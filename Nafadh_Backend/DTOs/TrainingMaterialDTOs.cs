using Nafadh_Backend.Enums;
using System.ComponentModel.DataAnnotations;
namespace Nafadh_Backend.DTOs
{
    // Input DTO
    // Used when creating a new training material
    public class CreateTrainingMaterialDto
    {
        [Required(ErrorMessage = "File URL is required")]
        [MaxLength(300, ErrorMessage = "File URL cannot exceed 300 characters")]
        public string FileUrl { get; set; } = string.Empty;

        [Required(ErrorMessage = "File type is required")]
        [EnumDataType(typeof(NFD_FileType), ErrorMessage = "Invalid file type")]
        public NFD_FileType? FileType { get; set; }

        [Required(ErrorMessage = "Lesson ID is required")]
        public int LessonId { get; set; }

        [Required(ErrorMessage = "Uploaded by user ID is required")]
        public int UploadedByUserId { get; set; }
    }

    //DTO جديد للرفع
    public class UploadTrainingMaterialDto
    {
        [Required(ErrorMessage = "File is required")]
        public IFormFile File { get; set; } = null!;

        [Required(ErrorMessage = "File type is required")]
        [EnumDataType(
            typeof(NFD_FileType),
            ErrorMessage = "Invalid file type"
        )]
        public NFD_FileType? FileType { get; set; }

        [Required(ErrorMessage = "Lesson ID is required")]
        public int LessonId { get; set; }

        [Required(ErrorMessage = "Uploaded by user ID is required")]
        public int UploadedByUserId { get; set; }
    }

    // Input DTO
    // Used when updating existing training material
    public class UpdateTrainingMaterialDto
    {
        [Required(ErrorMessage = "File URL is required")]
        [MaxLength(300, ErrorMessage = "File URL cannot exceed 300 characters")]
        public string FileUrl { get; set; } = string.Empty;
        [Required(ErrorMessage = "File type is required")]
        [EnumDataType(typeof(NFD_FileType), ErrorMessage = "Invalid file type")]
        public NFD_FileType? FileType { get; set; }
    }
    // Output DTO
    // Used when returning training material data to the client
    public class TrainingMaterialDto
    {
        public int MaterialId { get; set; }

        public string FileUrl { get; set; } = string.Empty;

        public NFD_FileType FileType { get; set; }

        public DateTime UploadDate { get; set; }

        public int LessonId { get; set; }

        public int UploadedByUserId { get; set; }
    }
}