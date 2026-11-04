#nullable disable
using Microsoft.EntityFrameworkCore;

namespace Nafadh_Backend.IdentityAccess
{
    /// <summary>Relationship mapping for the Bidding identity tables, applied from Nafadhcontext.OnModelCreating.</summary>
    public static class IdentityAccessModelConfiguration
    {
        public static void Apply(ModelBuilder builder)
        {
            builder.Entity<UserGroup>(e =>
                e.HasOne(x => x.UserType).WithMany(t => t.UserGroups)
                    .HasForeignKey(x => x.UserTypeId).OnDelete(DeleteBehavior.Restrict));

            builder.Entity<RolePage>(e =>
            {
                e.HasOne(x => x.Role).WithMany(r => r.RolePagesList)
                    .HasForeignKey(x => x.RoleId).OnDelete(DeleteBehavior.Cascade);
                e.HasOne(x => x.AppPage).WithMany()
                    .HasForeignKey(x => x.AppPageId).OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<Roles>(e =>
            {
                e.HasOne(x => x.UserGroup).WithMany().HasForeignKey(x => x.UserGroupId).OnDelete(DeleteBehavior.Restrict);
                e.HasOne(x => x.Organization).WithMany().HasForeignKey(x => x.OrganizationId).OnDelete(DeleteBehavior.Restrict);
                e.HasOne(x => x.ParentRole).WithMany().HasForeignKey(x => x.ParentRoleId).OnDelete(DeleteBehavior.Restrict);
            });

            builder.Entity<AppUser>(e =>
            {
                e.HasOne(x => x.UserGroup).WithMany().HasForeignKey(x => x.UserGroupId).OnDelete(DeleteBehavior.Restrict);
                e.HasOne(x => x.Organization).WithMany().HasForeignKey(x => x.OrganizationId).OnDelete(DeleteBehavior.Restrict);
                e.HasOne(x => x.Profile).WithMany().HasForeignKey(x => x.ProfileId).OnDelete(DeleteBehavior.Restrict);
            });
        }
    }
}
