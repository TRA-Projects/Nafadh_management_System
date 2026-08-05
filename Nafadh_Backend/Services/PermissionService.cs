
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

        public async Task<PermissionDTO> CreateAsync(PermissionCreateDTO dto)
        {
            if (await _repository.KeyExistsAsync(dto.PermissionKey))
            {
                throw new ConflictException($"A permission with key '{dto.PermissionKey}' already exists.");
            }

            var permission = new NFD_Permission
            {
                PermissionKey = dto.PermissionKey.Trim().ToLower(),
                Description = dto.Description
            };

            var created = await _repository.AddAsync(permission);
            return MapToDTO(created);
        }

        public async Task<PermissionDTO> UpdateAsync(int permissionId, PermissionUpdateDTO dto)
        {
            var permission = await _repository.GetByIdAsync(permissionId)
                ?? throw new NotFoundException($"Permission {permissionId} was not found.");

            permission.Description = dto.Description;
            await _repository.UpdateAsync(permission);
            return MapToDTO(permission);
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
