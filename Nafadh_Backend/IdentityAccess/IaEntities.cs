#nullable disable
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.AspNetCore.Identity;

// EF Core 10 mapping of the Bidding identity tables that live in the shared database
// (BiddingDB_Training). Property and table names match Bidding's CHDBContext so the
// ported service code runs unchanged. Only the columns the identity admin screens need are mapped.
namespace Nafadh_Backend.IdentityAccess
{
    public static class Enums
    {
        public enum ProfileTypes
        {
            Admin = 0, FreeLancer = 1, SME = 2, Contractor = 3, Operator = 4,
            OUser = 5, Staff = 6, Non_SME = 7, JobSeeker = 8,
        }
    }

    public enum LanguageEnum { English = 1, Arabic }

    [Table("AspNetUsers")]
    public class AppUser : IdentityUser
    {
        public string OTP { get; set; }
        public string OldPassword { get; set; }
        public bool isRegisterbyAdmin { get; set; }
        public DateTime CreatedDate { get; set; } = DateTime.Now;
        public string VerificationToken { get; set; }

        public int? ProfileId { get; set; }
        [ForeignKey(nameof(ProfileId))]
        public Profile Profile { get; set; }

        public int? UserGroupId { get; set; }
        [ForeignKey(nameof(UserGroupId))]
        public UserGroup UserGroup { get; set; }

        public int? OrganizationId { get; set; }
        [ForeignKey(nameof(OrganizationId))]
        public Organization Organization { get; set; }

        public bool IsPrimary { get; set; }
        public bool IsActive { get; set; } = true;

        [NotMapped] public int ProfileType { get; set; }
        [NotMapped] public string RoleName { get; set; }
        [NotMapped] public string Password { get; set; }
    }

    [Table("AspNetRoles")]
    public class Roles : IdentityRole
    {
        public int? UserGroupId { get; set; }
        [ForeignKey(nameof(UserGroupId))]
        public UserGroup UserGroup { get; set; }

        public int? OrganizationId { get; set; }
        [ForeignKey(nameof(OrganizationId))]
        public Organization Organization { get; set; }

        public string ParentRoleId { get; set; }
        [ForeignKey(nameof(ParentRoleId))]
        public Roles ParentRole { get; set; }

        public bool IsTemplate { get; set; }
        public bool IsActive { get; set; } = true;

        public List<RolePage> RolePagesList { get; set; }
    }

    [Table("AspNetUserRoles")]
    public class AppUserRoles : IdentityUserRole<string>
    {
    }

    /// <summary>Slim read/update view of Profiles (owned/extra columns are not mapped).</summary>
    [Table("Profiles")]
    public class Profile
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string NameAr { get; set; }
        public string EmailAddress { get; set; }
        public bool IsActive { get; set; }
        public int ProfileType { get; set; }
        public int? ParentProfileId { get; set; }

        // Company Information
        public string? CrNumber { get; set; }
        public string? ComanyEmail { get; set; }
        public string? CompanyNameEnglish { get; set; }
        public string? CompanyNameArabic { get; set; }
        public string? CompanyNameWithLegalEnglish { get; set; }
        public string? CompanyNameWithLegalArabic { get; set; }
        public string? RyadaNo { get; set; }
        public string? RegistrationDate { get; set; }
        public string? EstablishmentDate { get; set; }
        public string? ExpiryDate { get; set; }
        public string? SubjectToForeignInvestment { get; set; }

        // Required database columns for creating a Profile
        public string InsertedById { get; set; }
        public DateTime InsertedDate { get; set; }

        public bool IsVerified { get; set; }
        public bool IsOmani { get; set; }

        public DateTime JoinDate { get; set; }
        public int TotalExperience { get; set; }

        public bool IsHead { get; set; }
        public bool IsPostOpertunity { get; set; }

        public int ProfileStatus { get; set; }
        public bool IsVerifiedInMol { get; set; }

        // Optional profile details
        public string PhoneNumber { get; set; }
        public string Contact_Mobile { get; set; }

    }

    [Table("UserTypes")]
    public class UserType
    {
        public int Id { get; set; }
        [Required, MaxLength(50)] public string Code { get; set; }
        [Required, MaxLength(100)] public string NameEn { get; set; }
        [Required, MaxLength(100)] public string NameAr { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
        public List<UserGroup> UserGroups { get; set; } = new List<UserGroup>();
    }

    [Table("UserGroups")]
    public class UserGroup
    {
        public int Id { get; set; }
        public int UserTypeId { get; set; }
        [ForeignKey(nameof(UserTypeId))]
        public UserType UserType { get; set; }
        [Required, MaxLength(50)] public string Code { get; set; }
        [Required, MaxLength(100)] public string NameEn { get; set; }
        [Required, MaxLength(100)] public string NameAr { get; set; }
        public bool IsActive { get; set; } = true;
        public int SortOrder { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    [Table("Organizations")]
    public class Organization
    {
        public int Id { get; set; }
        [MaxLength(256)] public string Email { get; set; }
        [MaxLength(50)] public string CrNumber { get; set; }
        [MaxLength(256)] public string CompanyNameEnglish { get; set; }
        [MaxLength(256)] public string CompanyNameArabic { get; set; }
        [MaxLength(256)] public string CompanyNameWithLegalEnglish { get; set; }
        [MaxLength(256)] public string CompanyNameWithLegalArabic { get; set; }
        [MaxLength(100)] public string RyadaNo { get; set; }
        public string RegistrationDate { get; set; }
        public string EstablishmentDate { get; set; }
        public string ExpiryDate { get; set; }
        public string SubjectToForeignInvestment { get; set; }
        public bool IsLicensed { get; set; }
        public bool IsAuthorized { get; set; }
        public DateTime? LastVerified { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    [Table("AppPages")]
    public class AppPage
    {
        public int Id { get; set; }
        [Required, MaxLength(120)] public string Code { get; set; }
        [Required, MaxLength(32)] public string SystemCode { get; set; }
        [Required, MaxLength(512)] public string Url { get; set; }
        [Required, MaxLength(200)] public string NameEn { get; set; }
        [Required, MaxLength(200)] public string NameAr { get; set; }
        public bool IsActive { get; set; } = true;
        public int RequiredActionFlags { get; set; } = PageActionFlags.View;
        [MaxLength(32)] public string DefaultDataScope { get; set; } = PageDataScopes.Mine;
        public int SortOrder { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    [Table("AspNetRolePages")]
    public class RolePage
    {
        public int Id { get; set; }
        public string RoleId { get; set; }
        [ForeignKey(nameof(RoleId))]
        public Roles Role { get; set; }
        public int AppPageId { get; set; }
        [ForeignKey(nameof(AppPageId))]
        public AppPage AppPage { get; set; }
        public int ActionFlags { get; set; } = PageActionFlags.View;
        [MaxLength(32)] public string DataScope { get; set; } = PageDataScopes.Mine;
    }

    [Table("SystemAuditTrails")]
    public class SystemAuditTrail
    {
        public long Id { get; set; }
        [Required, MaxLength(64)] public string Module { get; set; }
        [Required, MaxLength(128)] public string EntityType { get; set; }
        [Required, MaxLength(128)] public string EntityReference { get; set; }
        [Required, MaxLength(128)] public string Field { get; set; }
        public string OldValue { get; set; }
        public string NewValue { get; set; }
        [Required, MaxLength(32)] public string Action { get; set; }
        [Required, MaxLength(32)] public string Source { get; set; }
        [MaxLength(64)] public string UpdatedByUserId { get; set; }
        public DateTime UpdatedDate { get; set; }
    }

    public static class SystemAuditActions
    {
        public const string Create = "Create";
        public const string Update = "Update";
        public const string Delete = "Delete";
    }

    public static class SystemAuditSources
    {
        public const string Ui = "UI";
        public const string Scheduler = "Scheduler";
    }

    public static class SystemAuditModules
    {
        public const string IdentityAccess = "IdentityAccess";
    }
}
