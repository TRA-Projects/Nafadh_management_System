using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public class CompanyProgramRepository : ICompanyProgramRepository
    {
        private readonly Nafadhcontext _context;

        public CompanyProgramRepository(Nafadhcontext context)
        {
            _context = context;
        }

        // Get programs of a specific company
        public async Task<IEnumerable<NFD_CompanyProgram>>
            GetByCompanyIdAsync(int companyId)
        {
            return await _context.NFD_CompanyPrograms
                .Where(cp => cp.CompanyId == companyId)
                .ToListAsync();
        }

        // Get companies eligible for a specific program
        public async Task<IEnumerable<NFD_CompanyProgram>>
            GetByProgramIdAsync(int programId)
        {
            return await _context.NFD_CompanyPrograms
                .Where(cp => cp.ProgramId == programId)
                .ToListAsync();
        }

        // Add company-program relationship
        public async Task AddAsync(
            NFD_CompanyProgram companyProgram)
        {
            await _context.NFD_CompanyPrograms.AddAsync(companyProgram);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> CompanyExistsAsync(int companyId) =>
        await _context.NFD_Companies.AnyAsync(c => c.CompanyId == companyId);

        public async Task<bool> ProgramExistsAsync(int programId) =>
        await _context.NFD_Programs.AnyAsync(p => p.ProgramId == programId);


        // Delete company-program relationship
        public async Task DeleteAsync(
            int companyId,
            int programId)
        {
            var companyProgram =
                await _context.NFD_CompanyPrograms.FindAsync(
                    companyId,
                    programId);

            if (companyProgram != null)
            {
                _context.NFD_CompanyPrograms.Remove(companyProgram);
                await _context.SaveChangesAsync();
            }
        }
    }
}