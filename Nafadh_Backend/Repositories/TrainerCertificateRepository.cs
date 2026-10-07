using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public class TrainerCertificateRepository : ITrainerCertificateRepository
    {
        private readonly Nafadhcontext _context;

        public TrainerCertificateRepository(Nafadhcontext context)
        {
            _context = context;
        }

        public async Task<List<NFD_TrainerCertificate>> GetByTrainerIdAsync(int trainerId)
        {
            return await _context.NFD_TrainerCertificates
                .Where(x => x.TrainerId == trainerId)
                .OrderByDescending(x => x.CreatedAt)
                .ToListAsync();
        }

        public async Task<NFD_TrainerCertificate?> GetByIdAsync(int id)
        {
            return await _context.NFD_TrainerCertificates
                .FirstOrDefaultAsync(x => x.TrainerCertificateId == id);
        }

        public async Task AddAsync(NFD_TrainerCertificate certificate)
        {
            await _context.NFD_TrainerCertificates.AddAsync(certificate);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var certificate = await GetByIdAsync(id);
            if (certificate == null)
                return false;

            _context.NFD_TrainerCertificates.Remove(certificate);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}