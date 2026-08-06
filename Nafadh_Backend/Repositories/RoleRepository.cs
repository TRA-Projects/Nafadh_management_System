

using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public class RoleRepository : IRoleRepository
    {
        private readonly Nafadhcontext _context;

        public RoleRepository(Nafadhcontext context)
        {
            _context = context;
        }

        public Task<List<NFD_Role>> GetAllAsync()
        {
            return _context.NFD_Roles.OrderBy(r => r.RoleName).ToListAsync();
        }

        public Task<NFD_Role?> GetByIdAsync(int roleId)
        {
            return _context.NFD_Roles.FirstOrDefaultAsync(r => r.RoleId == roleId);
        }

        public Task<NFD_Role?> GetByIdWithPermissionsAsync(int roleId)
        {
            return _context.NFD_Roles
                .Include(r => r.RolePermissions)
                    .ThenInclude(rp => rp.Permission)
                .FirstOrDefaultAsync(r => r.RoleId == roleId);
        }

        public Task<bool> NameExistsAsync(string roleName, int? excludeRoleId = null)
        {
            var normalized = roleName.Trim().ToLower();
            var query = _context.NFD_Roles.Where(r => r.RoleName.ToLower() == normalized);
            if (excludeRoleId.HasValue)
            {
                query = query.Where(r => r.RoleId != excludeRoleId.Value);
            }
            return query.AnyAsync();
        }

        public async Task<NFD_Role> AddAsync(NFD_Role role)
        {
            _context.NFD_Roles.Add(role);
            await _context.SaveChangesAsync();
            return role;
        }

        public async Task UpdateAsync(NFD_Role role)
        {
            _context.NFD_Roles.Update(role);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteAsync(NFD_Role role)
        {
            _context.NFD_Roles.Remove(role);
            await _context.SaveChangesAsync();
        }

        public Task<bool> IsInUseAsync(int roleId)
        {
            return _context.NFD_Users.AnyAsync(u => u.RoleId == roleId);
        }
    }
}
