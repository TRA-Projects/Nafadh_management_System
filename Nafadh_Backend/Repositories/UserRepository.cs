
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly Nafadhcontext _context;

        public UserRepository(Nafadhcontext context)
        {
            _context = context;
        }

        public Task<NFD_User?> GetByIdAsync(int userId)
        {
            return _context.NFD_Users.FirstOrDefaultAsync(u => u.UserId == userId);
        }

        public Task<NFD_User?> GetByIdWithRoleAsync(int userId)
        {
            return _context.NFD_Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.UserId == userId);
        }

        public Task<NFD_User?> GetByEmailAsync(string email)
        {
            var normalized = email.Trim().ToLower();
            return _context.NFD_Users
                .Include(u => u.Role)
                .FirstOrDefaultAsync(u => u.Email.ToLower() == normalized);
        }

        public Task<bool> EmailExistsAsync(string email, int? excludeUserId = null)
        {
            var normalized = email.Trim().ToLower();
            var query = _context.NFD_Users.Where(u => u.Email.ToLower() == normalized);
            if (excludeUserId.HasValue)
            {
                query = query.Where(u => u.UserId != excludeUserId.Value);
            }
            return query.AnyAsync();
        }

        public async Task<(List<NFD_User> Items, int TotalCount)> SearchAsync(
            int? roleId,
            NFD_UserStatus? status,
            string? searchTerm,
            int page,
            int pageSize)
        {
            var query = _context.NFD_Users.Include(u => u.Role).AsQueryable();

            if (roleId.HasValue)
            {
                query = query.Where(u => u.RoleId == roleId.Value);
            }

            if (status.HasValue)
            {
                query = query.Where(u => u.Status == status.Value);
            }

            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                var term = searchTerm.Trim().ToLower();
                query = query.Where(u =>
                    u.FullName.ToLower().Contains(term) ||
                    u.Email.ToLower().Contains(term));
            }

            var totalCount = await query.CountAsync();

            var items = await query
                .OrderBy(u => u.FullName)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            return (items, totalCount);
        }

        public async Task<NFD_User> AddAsync(NFD_User user)
        {
            _context.NFD_Users.Add(user);
            await _context.SaveChangesAsync();
            return user;
        }

        public async Task UpdateAsync(NFD_User user)
        {
            _context.NFD_Users.Update(user);
            await _context.SaveChangesAsync();
        }

        public Task<List<string>> GetPermissionKeysForUserAsync(int userId)
        {
            return _context.NFD_Users
                .Where(u => u.UserId == userId)
                .SelectMany(u => u.Role.RolePermissions)
                .Select(rp => rp.Permission.PermissionKey)
                .Distinct()
                .ToListAsync();
        }
    }
}
