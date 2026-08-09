using Nafadh_Backend.DTOs;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    public class CompanyBranchService : ICompanyBranchService
    {
        private readonly ICompanyBranchRepository _repository;

        public CompanyBranchService(
            ICompanyBranchRepository repository)
        {
            _repository = repository;
        }

        // Get company branch by ID
        public async Task<NFD_CompanyBranchOutputDTO?>
            GetCompanyBranchByIdAsync(int branchId)
        {
            var branch =
                await _repository.GetCompanyBranchByIdAsync(branchId);

            if (branch == null)
                return null;

            return MapToOutputDTO(branch);
        }

        // Get all company branches
        public async Task<IEnumerable<NFD_CompanyBranchOutputDTO>>
            GetAllCompanyBranchesAsync()
        {
            var branches =
                await _repository.GetAllCompanyBranchesAsync();

            return branches.Select(MapToOutputDTO);
        }

        // Get branches of a specific company
        public async Task<IEnumerable<NFD_CompanyBranchOutputDTO>>
        GetByCompanyIdAsync(int companyId)
        {
            var branches =
            await _repository.GetByCompanyIdAsync(companyId);

            return branches.Select(MapToOutputDTO);
        }




        // Add company branch
        public async Task<NFD_CompanyBranchOutputDTO>
            AddCompanyBranchAsync(
                NFD_CompanyBranchInputDTO dto)
        {
            var branch = new NFD_CompanyBranch
            {
                Location = dto.Location,
                ContactPoint = dto.ContactPoint,
                CompanyId = dto.CompanyId
            };

            await _repository.AddCompanyBranchAsync(branch);

            return MapToOutputDTO(branch);
        }

        // Update company branch
        public async Task<NFD_CompanyBranchOutputDTO?>
            UpdateCompanyBranchAsync(
                int branchId,
                NFD_CompanyBranchInputDTO dto)
        {
            var branch =
                await _repository.GetCompanyBranchByIdAsync(branchId);

            if (branch == null)
                return null;

            branch.Location = dto.Location;
            branch.ContactPoint = dto.ContactPoint;
            branch.CompanyId = dto.CompanyId;

            await _repository.UpdateCompanyBranchAsync(branch);

            return MapToOutputDTO(branch);
        }

        /// Delete company branch
        public async Task<bool>
            DeleteCompanyBranchAsync(int branchId)
        {
            var branch =
                await _repository.GetCompanyBranchByIdAsync(branchId);

            if (branch == null)
                return false;

            await _repository.DeleteCompanyBranchAsync(branchId);

            return true;
        }

        // Mapping Model → Output DTO
        private static NFD_CompanyBranchOutputDTO
            MapToOutputDTO(NFD_CompanyBranch branch)
        {
            return new NFD_CompanyBranchOutputDTO
            {
                BranchId = branch.BranchId,
                Location = branch.Location,
                ContactPoint = branch.ContactPoint,
                CompanyId = branch.CompanyId
            };
        }
    }
}