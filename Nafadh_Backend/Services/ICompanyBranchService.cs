using Nafadh_Backend.DTOs;

namespace Nafadh_Backend.Services
{
    public interface ICompanyBranchService
    {
        // Get a company branch by ID
        Task<NFD_CompanyBranchOutputDTO?> GetCompanyBranchByIdAsync(
            int branchId);

        // Get all company branches
        Task<IEnumerable<NFD_CompanyBranchOutputDTO>> GetAllCompanyBranchesAsync();

        // Add a new company branch
        Task<NFD_CompanyBranchOutputDTO> AddCompanyBranchAsync(
            NFD_CompanyBranchInputDTO dto);

        // Update an existing company branch
        Task<NFD_CompanyBranchOutputDTO?> UpdateCompanyBranchAsync(
            int branchId,
            NFD_CompanyBranchInputDTO dto);

        // Delete a company branch
        Task<bool> DeleteCompanyBranchAsync(
            int branchId);
    }
}