using Microsoft.AspNetCore.Http;
using Nafadh_Backend.DTOs;

namespace Nafadh_Backend.Services
{
    public interface ITrainerCertificateService
    {
        Task<List<TrainerCertificateDto>> GetByTrainerIdAsync(int trainerId);
        Task<TrainerCertificateDto?> AddAsync(
            int trainerId,
            string certificateName,
            string? issuer,
            DateTime? issueDate,
            DateTime? expiryDate,
            IFormFile file);
        Task<bool> DeleteAsync(int id);
    }
}