using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public class CompanyBranchRepository : ICompanyBranchRepository
    {
        private readonly Nafadhcontext _context;

        public CompanyBranchRepository(Nafadhcontext context)
        {
            _context = context;
        }

        // Get company branch by ID
        public async Task<NFD_CompanyBranch?>
            GetCompanyBranchByIdAsync(int branchId)
        {
            return await _context.NFD_CompanyBranches
                .FindAsync(branchId);
        }

        // Get all company branches
        public async Task<IEnumerable<NFD_CompanyBranch>>
            GetAllCompanyBranchesAsync()
        {
            return await _context.NFD_CompanyBranches
                .ToListAsync();
        }

        // Add company branch
        public async Task AddCompanyBranchAsync(
            NFD_CompanyBranch branch)
        {
            await _context.NFD_CompanyBranches.AddAsync(branch);
            await _context.SaveChangesAsync();
        }

        // Update company branch
        public async Task UpdateCompanyBranchAsync(
            NFD_CompanyBranch branch)
        {
            _context.NFD_CompanyBranches.Update(branch);
            await _context.SaveChangesAsync();
        }

        // Delete company branch
        public async Task DeleteCompanyBranchAsync(
            int branchId)
        {
            var branch = await _context.NFD_CompanyBranches
                .FindAsync(branchId);

            if (branch != null)
            {
                _context.NFD_CompanyBranches.Remove(branch);
                await _context.SaveChangesAsync();
            }
        }
    }
}