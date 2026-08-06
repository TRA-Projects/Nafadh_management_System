// Implemented by Noura 

using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public class RolePermissionRepository : IRolePermissionRepository
    {
        private readonly Nafadhcontext _context;

        public RolePermissionRepository(Nafadhcontext context)
        {
            _context = context;
        }

        public Task<List<NFD_RolePermission>> GetByRoleIdAsync(int roleId)
        {
            return _context.NFD_RolePermissions
                .Include(rp => rp.Permission)
                .Where(rp => rp.RoleId == roleId)
                .ToListAsync();
        }

        public Task<bool> ExistsAsync(int roleId, int permissionId)
        {
            return _context.NFD_RolePermissions
                .AnyAsync(rp => rp.RoleId == roleId && rp.PermissionId == permissionId);
        }

        public async Task<NFD_RolePermission> AddAsync(NFD_RolePermission rolePermission)
        {
            _context.NFD_RolePermissions.Add(rolePermission);
            await _context.SaveChangesAsync();
            return rolePermission;
        }

        public async Task<bool> RemoveAsync(int roleId, int permissionId)
        {
            var entity = await _context.NFD_RolePermissions
                .FirstOrDefaultAsync(rp => rp.RoleId == roleId && rp.PermissionId == permissionId);

            if (entity is null)
            {
                return false;
            }

            _context.NFD_RolePermissions.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task ReplaceForRoleAsync(int roleId, List<int> permissionIds)
        {
            await using var transaction = await _context.Database.BeginTransactionAsync();

            var existing = await _context.NFD_RolePermissions
                .Where(rp => rp.RoleId == roleId)
                .ToListAsync();

            _context.NFD_RolePermissions.RemoveRange(existing);

            var distinctIds = permissionIds.Distinct();
            foreach (var permissionId in distinctIds)
            {
                _context.NFD_RolePermissions.Add(new NFD_RolePermission
                {
                    RoleId = roleId,
                    PermissionId = permissionId
                });
            }

            await _context.SaveChangesAsync();
            await transaction.CommitAsync();
        }
    }
}
