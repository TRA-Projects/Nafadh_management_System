using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public interface ICompanyBranchRepository
    {
        Task<NFD_CompanyBranch?> GetCompanyBranchByIdAsync(int branchId);

        Task<IEnumerable<NFD_CompanyBranch>> GetAllCompanyBranchesAsync();

        Task AddCompanyBranchAsync(NFD_CompanyBranch branch);

        //branches belonging to one specific company
        Task<IEnumerable<NFD_CompanyBranch>> GetByCompanyIdAsync(int companyId);

        Task UpdateCompanyBranchAsync(NFD_CompanyBranch branch);

        Task DeleteCompanyBranchAsync(int branchId);
    }
}
