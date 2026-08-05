using Nafadh_Backend.Enums;
using System.ComponentModel.DataAnnotations;
namespace Nafadh_Backend.DTOs
{
    public class CreateTrainingMaterialDto
    {
        [Required]
        [MaxLength(300)]
        public string FileUrl { get; set; } = string.Empty;

        [Required]
        public NFD_FileType FileType { get; set; }
        [Required]
        public int LessonId { get; set; }
        [Required]
        public int UploadedByUserId { get; set; }
    }

    public class UpdateTrainingMaterialDto
    {
        [Required]
        [MaxLength(300)]
        public string FileUrl { get; set; } = string.Empty;
        [Required]
        public NFD_FileType FileType { get; set; }
    }

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