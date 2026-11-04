#nullable disable
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Nafadh_Backend.IdentityAccess
{
    /// <summary>
    /// Same-database context for the Bidding identity tables (AspNetUsers, AspNetRoles, UserGroups, ...).
    /// Never migrates: the schema is owned by the shared BiddingDB_Training database.
    /// </summary>
    public class IdentityAccessDbContext : IdentityDbContext<
        AppUser, Roles, string,
        IdentityUserClaim<string>, AppUserRoles, IdentityUserLogin<string>,
        IdentityRoleClaim<string>, IdentityUserToken<string>>
    {
        public IdentityAccessDbContext(DbContextOptions<IdentityAccessDbContext> options) : base(options) { }

        public DbSet<Profile> Profiles { get; set; }
        public DbSet<UserType> UserTypes { get; set; }
        public DbSet<UserGroup> UserGroups { get; set; }
        public DbSet<Organization> Organizations { get; set; }
        public DbSet<AppPage> AppPages { get; set; }
        public DbSet<RolePage> RolePages { get; set; }
        public DbSet<SystemAuditTrail> SystemAuditTrails { get; set; }

        protected override void OnModelCreating(ModelBuilder builder)
        {
            base.OnModelCreating(builder);

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
