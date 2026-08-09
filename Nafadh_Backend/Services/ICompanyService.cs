using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.Services
{
    public interface ICompanyService
    {
        // Get Company by ID
        Task<NFD_CompanyOutputDTO?> GetCompanyByIdAsync(
            int companyId);

        // Get all Companies
        Task<IEnumerable<NFD_CompanyOutputDTO>> GetAllCompaniesAsync();

        // Get Companies filtered by Status and/or Work Field
        Task<IEnumerable<NFD_CompanyOutputDTO>> GetCompaniesAsync(
            NFD_CompanyStatus? status,
            string? workField);

        // Add Company
        Task<(NFD_CompanyOutputDTO? result, string? error)> AddCompanyAsync(NFD_CompanyInputDTO dto);

        // Update Company
        Task<NFD_CompanyOutputDTO?> UpdateCompanyAsync(
            int companyId,
            NFD_CompanyInputDTO dto);

        // Approve Company
        Task<NFD_CompanyOutputDTO?> ApproveCompanyAsync(
            int companyId);

        // Suspend or Reactivate Company
        Task<NFD_CompanyOutputDTO?> SuspendCompanyAsync(
            int companyId);

        // Get Company Capacity
        Task<object?> GetCompanyCapacityAsync(
            int companyId);

        // Delete Company
        Task<bool> DeleteCompanyAsync(
            int companyId);
    }
}