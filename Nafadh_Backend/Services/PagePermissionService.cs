using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Repositories;
using Nafadh_Backend.Services;
using System.Security.Claims;

namespace Nafadh_Backend.Services
{
    public class PagePermissionService : IPagePermissionService
    {
        private readonly IPagePermissionRepository _repo;

        public PagePermissionService(IPagePermissionRepository repo)
        {
            _repo = repo;
        }

        public Task<List<UserPagePermissionDto>> GetMyPermissionsAsync(string? email, int? nfdUserId)
        {
            return _repo.GetUserNafadhPermissionsAsync(email, nfdUserId);
        }

        public async Task<(bool Allowed, string DataScope)> CheckAccessAsync(
            string? email,
            int? nfdUserId,
            string pageCode,
            string requiredAction)
        {
            var permissions = await _repo.GetUserNafadhPermissionsAsync(email, nfdUserId);
            var page = permissions.FirstOrDefault(p =>
                string.Equals(p.PageCode, pageCode, StringComparison.OrdinalIgnoreCase));

            if (page == null)
                return (false, string.Empty);

            var allowed = page.AllowedActions.Any(a =>
                string.Equals(a, requiredAction, StringComparison.OrdinalIgnoreCase));

            return (allowed, page.DataScope);
        }
    }
}
