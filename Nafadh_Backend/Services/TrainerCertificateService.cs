using Microsoft.AspNetCore.Http;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;
using Microsoft.EntityFrameworkCore;

namespace Nafadh_Backend.Services
{
    public class TrainerCertificateService : ITrainerCertificateService
    {
        private readonly ITrainerCertificateRepository _repository;
        private readonly Nafadhcontext _context;
        private readonly IWebHostEnvironment _environment;

        private static readonly HashSet<string> AllowedExtensions =
            new(StringComparer.OrdinalIgnoreCase)
            {
                ".pdf", ".jpg", ".jpeg", ".png"
            };

        private const long MaxFileSize = 10 * 1024 * 1024;

        public TrainerCertificateService(
            ITrainerCertificateRepository repository,
            Nafadhcontext context,
            IWebHostEnvironment environment)
        {
            _repository = repository;
            _context = context;
            _environment = environment;
        }

        public async Task<List<TrainerCertificateDto>> GetByTrainerIdAsync(int trainerId)
        {
            var items = await _repository.GetByTrainerIdAsync(trainerId);
            return items.Select(ToDto).ToList();
        }

        public async Task<TrainerCertificateDto?> AddAsync(
            int trainerId,
            string certificateName,
            string? issuer,
            DateTime? issueDate,
            DateTime? expiryDate,
            IFormFile file)
        {
            var trainerExists = await _context.NFD_Trainers
                .AnyAsync(x => x.TrainerId == trainerId);

            if (!trainerExists)
                return null;

            if (file == null || file.Length == 0)
                throw new ArgumentException("الملف فارغ.");

            if (file.Length > MaxFileSize)
                throw new ArgumentException("حجم الملف يجب ألا يتجاوز 10 MB.");

            var extension = Path.GetExtension(file.FileName);
            if (!AllowedExtensions.Contains(extension))
                throw new ArgumentException("المسموح: PDF أو JPG أو JPEG أو PNG فقط.");

            if (string.IsNullOrWhiteSpace(certificateName))
                throw new ArgumentException("اسم الشهادة مطلوب.");

            if (expiryDate.HasValue && issueDate.HasValue && expiryDate < issueDate)
                throw new ArgumentException("تاريخ الانتهاء لا يمكن أن يسبق تاريخ الإصدار.");

            var relativeFolder = Path.Combine("uploads", "trainer-certificates");
            var absoluteFolder = Path.Combine(
                _environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot"),
                relativeFolder);

            Directory.CreateDirectory(absoluteFolder);

            var storedFileName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
            var absoluteFilePath = Path.Combine(absoluteFolder, storedFileName);

            await using (var stream = new FileStream(absoluteFilePath, FileMode.CreateNew))
            {
                await file.CopyToAsync(stream);
            }

            var certificate = new NFD_TrainerCertificate
            {
                TrainerId = trainerId,
                CertificateName = certificateName.Trim(),
                Issuer = string.IsNullOrWhiteSpace(issuer) ? null : issuer.Trim(),
                IssueDate = issueDate,
                ExpiryDate = expiryDate,
                FileUrl = $"/{relativeFolder.Replace('\\', '/')}/{storedFileName}",
                OriginalFileName = Path.GetFileName(file.FileName),
                ContentType = file.ContentType,
                CreatedAt = DateTime.UtcNow
            };

            try
            {
                await _repository.AddAsync(certificate);
                return ToDto(certificate);
            }
            catch
            {
                if (File.Exists(absoluteFilePath))
                    File.Delete(absoluteFilePath);
                throw;
            }
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var certificate = await _repository.GetByIdAsync(id);
            if (certificate == null)
                return false;

            var filePath = GetPhysicalPath(certificate.FileUrl);
            var deleted = await _repository.DeleteAsync(id);

            if (deleted && filePath != null && File.Exists(filePath))
                File.Delete(filePath);

            return deleted;
        }

        private string? GetPhysicalPath(string? url)
        {
            if (string.IsNullOrWhiteSpace(url))
                return null;

            var cleanUrl = url.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
            return Path.Combine(
                _environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot"),
                cleanUrl);
        }

        private static TrainerCertificateDto ToDto(NFD_TrainerCertificate x)
        {
            return new TrainerCertificateDto
            {
                TrainerCertificateId = x.TrainerCertificateId,
                TrainerId = x.TrainerId,
                CertificateName = x.CertificateName,
                Issuer = x.Issuer,
                IssueDate = x.IssueDate,
                ExpiryDate = x.ExpiryDate,
                FileUrl = x.FileUrl,
                OriginalFileName = x.OriginalFileName,
                ContentType = x.ContentType,
                CreatedAt = x.CreatedAt
            };
        }
    }
}