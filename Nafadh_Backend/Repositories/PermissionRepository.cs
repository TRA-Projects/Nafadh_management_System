// Implemented by Noura 

using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public class PermissionRepository : IPermissionRepository
    {
        private readonly Nafadhcontext _context;

        public PermissionRepository(Nafadhcontext context)
        {
            _context = context;
        }

        public Task<List<NFD_Permission>> GetAllAsync()
        {
            return _context.NFD_Permissions.OrderBy(p => p.PermissionKey).ToListAsync();
        }

        public Task<NFD_Permission?> GetByIdAsync(int permissionId)
        {
            return _context.NFD_Permissions.FirstOrDefaultAsync(p => p.PermissionId == permissionId);
        }

        public Task<bool> KeyExistsAsync(string permissionKey, int? excludePermissionId = null)
        {
            var normalized = permissionKey.Trim().ToLower();
            var query = _context.NFD_Permissions.Where(p => p.PermissionKey.ToLower() == normalized);
            if (excludePermissionId.HasValue)
            {
                query = query.Where(p => p.PermissionId != excludePermissionId.Value);
            }
            return query.AnyAsync();
        }

        public async Task<NFD_Permission> AddAsync(NFD_Permission permission)
        {
            _context.NFD_Permissions.Add(permission);
            await _context.SaveChangesAsync();
            return permission;
        }

        public async Task UpdateAsync(NFD_Permission permission)
        {
            _context.NFD_Permissions.Update(permission);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(NFD_Permission permission)
        {
            _context.NFD_Permissions.Remove(permission);
            await _context.SaveChangesAsync();
        }

        public Task<bool> IsInUseAsync(int permissionId)
        {
            return _context.NFD_RolePermissions.AnyAsync(rp => rp.PermissionId == permissionId);
        }
    }
}
