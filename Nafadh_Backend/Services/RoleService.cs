
// Implemented by Noura 

using Nafadh_Backend.DTOs;
using Nafadh_Backend.Exceptions;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    public class RoleService : IRoleService
    {
        private readonly IRoleRepository _repository;

        public RoleService(IRoleRepository repository)
        {
            _repository = repository;
        }

        public async Task<List<RoleDTO>> GetAllAsync()
        {
            var roles = await _repository.GetAllAsync();
            return roles.Select(r => new RoleDTO { RoleId = r.RoleId, RoleName = r.RoleName }).ToList();
        }

        public async Task<RoleDetailDTO> GetByIdAsync(int roleId)
        {
            var role = await _repository.GetByIdWithPermissionsAsync(roleId)
                ?? throw new NotFoundException($"Role {roleId} was not found.");

            return new RoleDetailDTO
            {
                RoleId = role.RoleId,
                RoleName = role.RoleName,
                Permissions = role.RolePermissions
                    .Select(rp => new PermissionDTO
                    {
                        PermissionId = rp.Permission.PermissionId,
                        PermissionKey = rp.Permission.PermissionKey,
                        Description = rp.Permission.Description
                    })
                    .OrderBy(p => p.PermissionKey)
                    .ToList()
            };
        }

        public async Task<RoleDTO> CreateAsync(RoleCreateDTO dto)
        {
            if (await _repository.NameExistsAsync(dto.RoleName))
            {
                throw new ConflictException($"A role named '{dto.RoleName}' already exists.");
            }

            var role = new NFD_Role { RoleName = dto.RoleName.Trim() };
            var created = await _repository.AddAsync(role);
            return new RoleDTO { RoleId = created.RoleId, RoleName = created.RoleName };
        }

        public async Task<RoleDTO> UpdateAsync(int roleId, RoleUpdateDTO dto)
        {
            var role = await _repository.GetByIdAsync(roleId)
                ?? throw new NotFoundException($"Role {roleId} was not found.");

            if (await _repository.NameExistsAsync(dto.RoleName, roleId))
            {
                throw new ConflictException($"A role named '{dto.RoleName}' already exists.");
            }

            role.RoleName = dto.RoleName.Trim();
            await _repository.UpdateAsync(role);
            return new RoleDTO { RoleId = role.RoleId, RoleName = role.RoleName };
        }

        public async Task DeleteAsync(int roleId)
        {
            var role = await _repository.GetByIdAsync(roleId)
                ?? throw new NotFoundException($"Role {roleId} was not found.");

            if (await _repository.IsInUseAsync(roleId))
            {
                throw new ConflictException(
                    $"Role '{role.RoleName}' is currently assigned to one or more users and cannot be removed.");
            }

            await _repository.DeleteAsync(role);
        }

    }
}
