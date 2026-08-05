// Implemented by Noura 

using Nafadh_Backend.DTOs;
using Nafadh_Backend.Exceptions;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    public class RolePermissionService : IRolePermissionService
    {
        private readonly IRolePermissionRepository _repository;
        private readonly IRoleRepository _roleRepository;
        private readonly IPermissionRepository _permissionRepository;

        public RolePermissionService(
            IRolePermissionRepository repository,
            IRoleRepository roleRepository,
            IPermissionRepository permissionRepository)
        {
            _repository = repository;
            _roleRepository = roleRepository;
            _permissionRepository = permissionRepository;
        }

        public async Task<List<PermissionDTO>> GetByRoleIdAsync(int roleId)
        {
            await EnsureRoleExistsAsync(roleId);

            var rolePermissions = await _repository.GetByRoleIdAsync(roleId);
            return rolePermissions
                .Select(rp => new PermissionDTO
                {
                    PermissionId = rp.Permission.PermissionId,
                    PermissionKey = rp.Permission.PermissionKey,
                    Description = rp.Permission.Description
                })
                .OrderBy(p => p.PermissionKey)
                .ToList();
        }


        private async Task EnsureRoleExistsAsync(int roleId)
        {
            if (await _roleRepository.GetByIdAsync(roleId) is null)
            {
                throw new NotFoundException($"Role {roleId} was not found.");
            }
        }
    }
}
