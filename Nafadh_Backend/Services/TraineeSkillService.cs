using Nafadh_Backend.DTOs;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    public class TraineeSkillService : ITraineeSkillService
    {
        private readonly ITraineeSkillRepository _repository;
        private readonly IWebHostEnvironment _environment;

        public TraineeSkillService(
            ITraineeSkillRepository repository,
            IWebHostEnvironment environment)
        {
            _repository = repository;
            _environment = environment;
        }

        public async Task<List<NFD_TraineeSkill>> GetByTraineeId(
            int traineeId)
        {
            return await _repository.GetByTraineeId(traineeId);
        }

        public async Task<NFD_TraineeSkill?> GetById(int id)
        {
            return await _repository.GetById(id);
        }

        public async Task<NFD_TraineeSkill> Add(
            TraineeSkillInputDTO dto)
        {
            string? certificateUrl = null;

            if (dto.CertificateFile != null)
            {
                certificateUrl =
                    await SaveCertificateFile(dto.CertificateFile);
            }

            var traineeSkill = new NFD_TraineeSkill
            {
                TraineeId = dto.TraineeId,
                SkillName = dto.SkillName,
                SerialNumber = dto.SerialNumber,
                CertificateUrl = certificateUrl
            };

            return await _repository.Add(traineeSkill);
        }

        public async Task<NFD_TraineeSkill?> Update(
            int id,
            TraineeSkillInputDTO dto)
        {
            var existingSkill =
                await _repository.GetById(id);

            if (existingSkill == null)
            {
                return null;
            }

            existingSkill.SkillName = dto.SkillName;
            existingSkill.SerialNumber = dto.SerialNumber;

            if (dto.CertificateFile != null)
            {
                existingSkill.CertificateUrl =
                    await SaveCertificateFile(
                        dto.CertificateFile);
            }

            return await _repository.Update(existingSkill);
        }

        public async Task<bool> Delete(int id)
        {
            return await _repository.Delete(id);
        }

        private async Task<string> SaveCertificateFile(
            IFormFile file)
        {
            var uploadsFolder = Path.Combine(
                _environment.WebRootPath,
                "uploads",
                "certificates"
            );

            if (!Directory.Exists(uploadsFolder))
            {
                Directory.CreateDirectory(uploadsFolder);
            }

            var fileName =
                Guid.NewGuid().ToString()
                + Path.GetExtension(file.FileName);

            var filePath =
                Path.Combine(uploadsFolder, fileName);

            using (var stream =
                new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            return "/uploads/certificates/" + fileName;
        }
    }
}