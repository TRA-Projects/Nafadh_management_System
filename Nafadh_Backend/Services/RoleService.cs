
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




    }
}
