using Microsoft.AspNetCore.Http;

namespace Nafadh_Backend.DTOs
{
    // Request model used for uploading
    // profile images for trainers and trainees.
    public class ProfileImageUploadDto
    {
        public IFormFile File { get; set; } = null!;
    }
}