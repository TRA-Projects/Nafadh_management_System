using Nafadh_Backend.Enums;
namespace Nafadh_Backend.DTOs
{
    public class CreateTrainingMaterialDto
    {
        public string FileUrl { get; set; } = string.Empty;

        public NFD_FileType FileType { get; set; }

        public int LessonId { get; set; }

        public int UploadedByUserId { get; set; }
    }

    public class UpdateTrainingMaterialDto
    {
        public string FileUrl { get; set; } = string.Empty;

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