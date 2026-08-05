
// Implemented by Noura 


using Nafadh_Backend.DTOs;
using Nafadh_Backend.Exceptions;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    public class PermissionService : IPermissionService
    {
        private readonly IPermissionRepository _repository;

        public PermissionService(IPermissionRepository repository)
        {
            _repository = repository;
        }

        public async Task<List<PermissionDTO>> GetAllAsync()
        {
            var permissions = await _repository.GetAllAsync();
            return permissions.Select(MapToDTO).ToList();
        }




        private static PermissionDTO MapToDTO(NFD_Permission permission)
        {
            return new PermissionDTO
            {
                PermissionId = permission.PermissionId,
                PermissionKey = permission.PermissionKey,
                Description = permission.Description
            };
        }
    }
}
