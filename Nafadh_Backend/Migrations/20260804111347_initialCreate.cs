using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nafadh_Backend.Migrations
{
    /// <inheritdoc />
    public partial class initialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NFD_Permissions",
                columns: table => new
                {
                    PermissionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PermissionKey = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_Permissions", x => x.PermissionId);
                });

            migrationBuilder.CreateTable(
                name: "NFD_Roles",
                columns: table => new
                {
                    RoleId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RoleName = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_Roles", x => x.RoleId);
                });

            migrationBuilder.CreateTable(
                name: "NFD_SystemSettings",
                columns: table => new
                {
                    SettingId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Key = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Value = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_SystemSettings", x => x.SettingId);
                });

            migrationBuilder.CreateTable(
                name: "NFD_Tracks",
                columns: table => new
                {
                    TrackId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_Tracks", x => x.TrackId);
                });

            migrationBuilder.CreateTable(
                name: "NFD_RolePermissions",
                columns: table => new
                {
                    RoleId = table.Column<int>(type: "int", nullable: false),
                    PermissionId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_RolePermissions", x => new { x.RoleId, x.PermissionId });
                    table.ForeignKey(
                        name: "FK_NFD_RolePermissions_NFD_Permissions_PermissionId",
                        column: x => x.PermissionId,
                        principalTable: "NFD_Permissions",
                        principalColumn: "PermissionId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NFD_RolePermissions_NFD_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "NFD_Roles",
                        principalColumn: "RoleId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NFD_Users",
                columns: table => new
                {
                    UserId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FullName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    RoleId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_Users", x => x.UserId);
                    table.ForeignKey(
                        name: "FK_NFD_Users_NFD_Roles_RoleId",
                        column: x => x.RoleId,
                        principalTable: "NFD_Roles",
                        principalColumn: "RoleId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_Programs",
                columns: table => new
                {
                    ProgramId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Category = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    DurationHours = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Price = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    TrackId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_Programs", x => x.ProgramId);
                    table.ForeignKey(
                        name: "FK_NFD_Programs_NFD_Tracks_TrackId",
                        column: x => x.TrackId,
                        principalTable: "NFD_Tracks",
                        principalColumn: "TrackId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_Announcements",
                columns: table => new
                {
                    AnnouncementId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ScopeType = table.Column<int>(type: "int", nullable: false),
                    ScopeId = table.Column<int>(type: "int", nullable: true),
                    Message = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CreatedByUserId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_Announcements", x => x.AnnouncementId);
                    table.ForeignKey(
                        name: "FK_NFD_Announcements_NFD_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "NFD_Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_AuditLogs",
                columns: table => new
                {
                    LogId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Action = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EntityName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EntityId = table.Column<int>(type: "int", nullable: false),
                    Details = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Timestamp = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_AuditLogs", x => x.LogId);
                    table.ForeignKey(
                        name: "FK_NFD_AuditLogs_NFD_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "NFD_Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_Companies",
                columns: table => new
                {
                    CompanyId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CompanyName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    CommercialRegister = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    WorkField = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Address = table.Column<string>(type: "nvarchar(250)", maxLength: 250, nullable: true),
                    Phone = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Logo = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Capacity = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    ApprovalDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UserId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_Companies", x => x.CompanyId);
                    table.ForeignKey(
                        name: "FK_NFD_Companies_NFD_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "NFD_Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_EvaluationTemplates",
                columns: table => new
                {
                    TemplateId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Type = table.Column<int>(type: "int", nullable: false),
                    CreatedByUserId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_EvaluationTemplates", x => x.TemplateId);
                    table.ForeignKey(
                        name: "FK_NFD_EvaluationTemplates_NFD_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "NFD_Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_Messages",
                columns: table => new
                {
                    MessageId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SentDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    SenderId = table.Column<int>(type: "int", nullable: false),
                    ReceiverId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_Messages", x => x.MessageId);
                    table.ForeignKey(
                        name: "FK_NFD_Messages_NFD_Users_ReceiverId",
                        column: x => x.ReceiverId,
                        principalTable: "NFD_Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_Messages_NFD_Users_SenderId",
                        column: x => x.SenderId,
                        principalTable: "NFD_Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_Notifications",
                columns: table => new
                {
                    NotificationId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Message = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    RelatedEntity = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    IsRead = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_Notifications", x => x.NotificationId);
                    table.ForeignKey(
                        name: "FK_NFD_Notifications_NFD_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "NFD_Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_Reports",
                columns: table => new
                {
                    ReportId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Type = table.Column<int>(type: "int", nullable: false),
                    FiltersJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    GeneratedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    FileUrl = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    GeneratedByUserId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_Reports", x => x.ReportId);
                    table.ForeignKey(
                        name: "FK_NFD_Reports_NFD_Users_GeneratedByUserId",
                        column: x => x.GeneratedByUserId,
                        principalTable: "NFD_Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_SupportTickets",
                columns: table => new
                {
                    TicketId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Subject = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Message = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_SupportTickets", x => x.TicketId);
                    table.ForeignKey(
                        name: "FK_NFD_SupportTickets_NFD_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "NFD_Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_Trainers",
                columns: table => new
                {
                    TrainerId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Specialty = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    ExperienceYears = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Biography = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CVUrl = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_Trainers", x => x.TrainerId);
                    table.ForeignKey(
                        name: "FK_NFD_Trainers_NFD_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "NFD_Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_Batches",
                columns: table => new
                {
                    BatchId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    BatchName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Capacity = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    ProgramId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_Batches", x => x.BatchId);
                    table.ForeignKey(
                        name: "FK_NFD_Batches_NFD_Programs_ProgramId",
                        column: x => x.ProgramId,
                        principalTable: "NFD_Programs",
                        principalColumn: "ProgramId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_Modules",
                columns: table => new
                {
                    ModuleId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    OrderIndex = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    AvailableFrom = table.Column<DateTime>(type: "datetime2", nullable: true),
                    AvailableTo = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsArchived = table.Column<bool>(type: "bit", nullable: false),
                    ProgramId = table.Column<int>(type: "int", nullable: false),
                    PrerequisiteModuleId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_Modules", x => x.ModuleId);
                    table.ForeignKey(
                        name: "FK_NFD_Modules_NFD_Modules_PrerequisiteModuleId",
                        column: x => x.PrerequisiteModuleId,
                        principalTable: "NFD_Modules",
                        principalColumn: "ModuleId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_Modules_NFD_Programs_ProgramId",
                        column: x => x.ProgramId,
                        principalTable: "NFD_Programs",
                        principalColumn: "ProgramId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_Projects",
                columns: table => new
                {
                    ProjectId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    ProgramId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_Projects", x => x.ProjectId);
                    table.ForeignKey(
                        name: "FK_NFD_Projects_NFD_Programs_ProgramId",
                        column: x => x.ProgramId,
                        principalTable: "NFD_Programs",
                        principalColumn: "ProgramId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_CompanyBranches",
                columns: table => new
                {
                    BranchId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Location = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    ContactPoint = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    CompanyId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_CompanyBranches", x => x.BranchId);
                    table.ForeignKey(
                        name: "FK_NFD_CompanyBranches_NFD_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "NFD_Companies",
                        principalColumn: "CompanyId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NFD_CompanyPrograms",
                columns: table => new
                {
                    CompanyId = table.Column<int>(type: "int", nullable: false),
                    ProgramId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_CompanyPrograms", x => new { x.CompanyId, x.ProgramId });
                    table.ForeignKey(
                        name: "FK_NFD_CompanyPrograms_NFD_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "NFD_Companies",
                        principalColumn: "CompanyId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NFD_CompanyPrograms_NFD_Programs_ProgramId",
                        column: x => x.ProgramId,
                        principalTable: "NFD_Programs",
                        principalColumn: "ProgramId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NFD_CompanySupervisors",
                columns: table => new
                {
                    SupervisorId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Department = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Position = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    CompanyId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_CompanySupervisors", x => x.SupervisorId);
                    table.ForeignKey(
                        name: "FK_NFD_CompanySupervisors_NFD_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "NFD_Companies",
                        principalColumn: "CompanyId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_CompanySupervisors_NFD_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "NFD_Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_Departments",
                columns: table => new
                {
                    DepartmentId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CompanyId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_Departments", x => x.DepartmentId);
                    table.ForeignKey(
                        name: "FK_NFD_Departments_NFD_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "NFD_Companies",
                        principalColumn: "CompanyId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NFD_Trainees",
                columns: table => new
                {
                    TraineeId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    NationalId = table.Column<int>(type: "int", nullable: false),
                    University = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Major = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    AcademicLevel = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Skills = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ResumeUrl = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    CompanyId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_Trainees", x => x.TraineeId);
                    table.ForeignKey(
                        name: "FK_NFD_Trainees_NFD_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "NFD_Companies",
                        principalColumn: "CompanyId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_Trainees_NFD_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "NFD_Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_EvaluationCriteria",
                columns: table => new
                {
                    CriteriaId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Weight = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TemplateId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_EvaluationCriteria", x => x.CriteriaId);
                    table.ForeignKey(
                        name: "FK_NFD_EvaluationCriteria_NFD_EvaluationTemplates_TemplateId",
                        column: x => x.TemplateId,
                        principalTable: "NFD_EvaluationTemplates",
                        principalColumn: "TemplateId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NFD_BatchTrainers",
                columns: table => new
                {
                    BatchId = table.Column<int>(type: "int", nullable: false),
                    TrainerId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_BatchTrainers", x => new { x.BatchId, x.TrainerId });
                    table.ForeignKey(
                        name: "FK_NFD_BatchTrainers_NFD_Batches_BatchId",
                        column: x => x.BatchId,
                        principalTable: "NFD_Batches",
                        principalColumn: "BatchId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NFD_BatchTrainers_NFD_Trainers_TrainerId",
                        column: x => x.TrainerId,
                        principalTable: "NFD_Trainers",
                        principalColumn: "TrainerId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NFD_CompanyPayments",
                columns: table => new
                {
                    CompanyPaymentId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CompanyId = table.Column<int>(type: "int", nullable: false),
                    BatchId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_CompanyPayments", x => x.CompanyPaymentId);
                    table.ForeignKey(
                        name: "FK_NFD_CompanyPayments_NFD_Batches_BatchId",
                        column: x => x.BatchId,
                        principalTable: "NFD_Batches",
                        principalColumn: "BatchId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_CompanyPayments_NFD_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "NFD_Companies",
                        principalColumn: "CompanyId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_Sessions",
                columns: table => new
                {
                    SessionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SessionDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    StartTime = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    EndTime = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    MeetingLink = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Topic = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    LearningObjectives = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    RecordingUrl = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Summary = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    BatchId = table.Column<int>(type: "int", nullable: false),
                    TrainerId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_Sessions", x => x.SessionId);
                    table.ForeignKey(
                        name: "FK_NFD_Sessions_NFD_Batches_BatchId",
                        column: x => x.BatchId,
                        principalTable: "NFD_Batches",
                        principalColumn: "BatchId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_Sessions_NFD_Trainers_TrainerId",
                        column: x => x.TrainerId,
                        principalTable: "NFD_Trainers",
                        principalColumn: "TrainerId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_Tasks",
                columns: table => new
                {
                    TaskId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DueDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Priority = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    BatchId = table.Column<int>(type: "int", nullable: false),
                    CreatedByUserId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_Tasks", x => x.TaskId);
                    table.ForeignKey(
                        name: "FK_NFD_Tasks_NFD_Batches_BatchId",
                        column: x => x.BatchId,
                        principalTable: "NFD_Batches",
                        principalColumn: "BatchId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_Tasks_NFD_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "NFD_Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_Lessons",
                columns: table => new
                {
                    LessonId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    ContentBody = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    OrderIndex = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    ModuleId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_Lessons", x => x.LessonId);
                    table.ForeignKey(
                        name: "FK_NFD_Lessons_NFD_Modules_ModuleId",
                        column: x => x.ModuleId,
                        principalTable: "NFD_Modules",
                        principalColumn: "ModuleId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_Enrollments",
                columns: table => new
                {
                    EnrollmentId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EnrollmentDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CompletionStatus = table.Column<int>(type: "int", nullable: false),
                    BatchId = table.Column<int>(type: "int", nullable: false),
                    TraineeId = table.Column<int>(type: "int", nullable: false),
                    CompanyId = table.Column<int>(type: "int", nullable: false),
                    DepartmentId = table.Column<int>(type: "int", nullable: true),
                    SupervisorId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_Enrollments", x => x.EnrollmentId);
                    table.ForeignKey(
                        name: "FK_NFD_Enrollments_NFD_Batches_BatchId",
                        column: x => x.BatchId,
                        principalTable: "NFD_Batches",
                        principalColumn: "BatchId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_Enrollments_NFD_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "NFD_Companies",
                        principalColumn: "CompanyId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_Enrollments_NFD_CompanySupervisors_SupervisorId",
                        column: x => x.SupervisorId,
                        principalTable: "NFD_CompanySupervisors",
                        principalColumn: "SupervisorId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_Enrollments_NFD_Departments_DepartmentId",
                        column: x => x.DepartmentId,
                        principalTable: "NFD_Departments",
                        principalColumn: "DepartmentId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_Enrollments_NFD_Trainees_TraineeId",
                        column: x => x.TraineeId,
                        principalTable: "NFD_Trainees",
                        principalColumn: "TraineeId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_ProjectMembers",
                columns: table => new
                {
                    MemberId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Role = table.Column<int>(type: "int", nullable: false),
                    ProjectId = table.Column<int>(type: "int", nullable: false),
                    TraineeId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_ProjectMembers", x => x.MemberId);
                    table.ForeignKey(
                        name: "FK_NFD_ProjectMembers_NFD_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "NFD_Projects",
                        principalColumn: "ProjectId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NFD_ProjectMembers_NFD_Trainees_TraineeId",
                        column: x => x.TraineeId,
                        principalTable: "NFD_Trainees",
                        principalColumn: "TraineeId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_TraineeModuleProgresses",
                columns: table => new
                {
                    ProgressId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Status = table.Column<int>(type: "int", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TraineeId = table.Column<int>(type: "int", nullable: false),
                    ModuleId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_TraineeModuleProgresses", x => x.ProgressId);
                    table.ForeignKey(
                        name: "FK_NFD_TraineeModuleProgresses_NFD_Modules_ModuleId",
                        column: x => x.ModuleId,
                        principalTable: "NFD_Modules",
                        principalColumn: "ModuleId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_TraineeModuleProgresses_NFD_Trainees_TraineeId",
                        column: x => x.TraineeId,
                        principalTable: "NFD_Trainees",
                        principalColumn: "TraineeId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_CompanyPaymentSchedules",
                columns: table => new
                {
                    ScheduleId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MonthNumber = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    MonthLabel = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    DueDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    PaidDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CompanyPaymentId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_CompanyPaymentSchedules", x => x.ScheduleId);
                    table.ForeignKey(
                        name: "FK_NFD_CompanyPaymentSchedules_NFD_CompanyPayments_CompanyPaymentId",
                        column: x => x.CompanyPaymentId,
                        principalTable: "NFD_CompanyPayments",
                        principalColumn: "CompanyPaymentId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NFD_SessionAttendances",
                columns: table => new
                {
                    AttendanceId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    SessionId = table.Column<int>(type: "int", nullable: false),
                    TraineeId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_SessionAttendances", x => x.AttendanceId);
                    table.ForeignKey(
                        name: "FK_NFD_SessionAttendances_NFD_Sessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "NFD_Sessions",
                        principalColumn: "SessionId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_SessionAttendances_NFD_Trainees_TraineeId",
                        column: x => x.TraineeId,
                        principalTable: "NFD_Trainees",
                        principalColumn: "TraineeId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_Rubrics",
                columns: table => new
                {
                    RubricId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Criterion = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Weight = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    MaxScore = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TaskId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_Rubrics", x => x.RubricId);
                    table.ForeignKey(
                        name: "FK_NFD_Rubrics_NFD_Tasks_TaskId",
                        column: x => x.TaskId,
                        principalTable: "NFD_Tasks",
                        principalColumn: "TaskId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NFD_Submissions",
                columns: table => new
                {
                    SubmissionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FileUrl = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    SubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Grade = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Feedback = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    TaskId = table.Column<int>(type: "int", nullable: false),
                    TraineeId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_Submissions", x => x.SubmissionId);
                    table.ForeignKey(
                        name: "FK_NFD_Submissions_NFD_Tasks_TaskId",
                        column: x => x.TaskId,
                        principalTable: "NFD_Tasks",
                        principalColumn: "TaskId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_Submissions_NFD_Trainees_TraineeId",
                        column: x => x.TraineeId,
                        principalTable: "NFD_Trainees",
                        principalColumn: "TraineeId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_TrainingMaterials",
                columns: table => new
                {
                    MaterialId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FileUrl = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    FileType = table.Column<int>(type: "int", nullable: false),
                    UploadDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LessonId = table.Column<int>(type: "int", nullable: false),
                    UploadedByUserId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_TrainingMaterials", x => x.MaterialId);
                    table.ForeignKey(
                        name: "FK_NFD_TrainingMaterials_NFD_Lessons_LessonId",
                        column: x => x.LessonId,
                        principalTable: "NFD_Lessons",
                        principalColumn: "LessonId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_TrainingMaterials_NFD_Users_UploadedByUserId",
                        column: x => x.UploadedByUserId,
                        principalTable: "NFD_Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_Certificates",
                columns: table => new
                {
                    CertificateId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Type = table.Column<int>(type: "int", nullable: false),
                    IssueDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    FileUrl = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    EnrollmentId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_Certificates", x => x.CertificateId);
                    table.ForeignKey(
                        name: "FK_NFD_Certificates_NFD_Enrollments_EnrollmentId",
                        column: x => x.EnrollmentId,
                        principalTable: "NFD_Enrollments",
                        principalColumn: "EnrollmentId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_DailyAttendances",
                columns: table => new
                {
                    DailyAttendanceId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Date = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CheckInTime = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    CheckOutTime = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    IsLate = table.Column<bool>(type: "bit", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    EnrollmentId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_DailyAttendances", x => x.DailyAttendanceId);
                    table.ForeignKey(
                        name: "FK_NFD_DailyAttendances_NFD_Enrollments_EnrollmentId",
                        column: x => x.EnrollmentId,
                        principalTable: "NFD_Enrollments",
                        principalColumn: "EnrollmentId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_Evaluations",
                columns: table => new
                {
                    EvaluationId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Period = table.Column<int>(type: "int", nullable: false),
                    Score = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    EvaluationDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EnrollmentId = table.Column<int>(type: "int", nullable: true),
                    TrainerId = table.Column<int>(type: "int", nullable: true),
                    TemplateId = table.Column<int>(type: "int", nullable: false),
                    EvaluatorUserId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_Evaluations", x => x.EvaluationId);
                    table.ForeignKey(
                        name: "FK_NFD_Evaluations_NFD_Enrollments_EnrollmentId",
                        column: x => x.EnrollmentId,
                        principalTable: "NFD_Enrollments",
                        principalColumn: "EnrollmentId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_Evaluations_NFD_EvaluationTemplates_TemplateId",
                        column: x => x.TemplateId,
                        principalTable: "NFD_EvaluationTemplates",
                        principalColumn: "TemplateId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_Evaluations_NFD_Trainers_TrainerId",
                        column: x => x.TrainerId,
                        principalTable: "NFD_Trainers",
                        principalColumn: "TrainerId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_Evaluations_NFD_Users_EvaluatorUserId",
                        column: x => x.EvaluatorUserId,
                        principalTable: "NFD_Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_TraineePayments",
                columns: table => new
                {
                    TraineePaymentId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TotalAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    EnrollmentId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_TraineePayments", x => x.TraineePaymentId);
                    table.ForeignKey(
                        name: "FK_NFD_TraineePayments_NFD_Enrollments_EnrollmentId",
                        column: x => x.EnrollmentId,
                        principalTable: "NFD_Enrollments",
                        principalColumn: "EnrollmentId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_Warnings",
                columns: table => new
                {
                    WarningId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Type = table.Column<int>(type: "int", nullable: false),
                    Level = table.Column<int>(type: "int", nullable: false),
                    Evidence = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Resolution = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IssuedDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EnrollmentId = table.Column<int>(type: "int", nullable: false),
                    RaisedByUserId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_Warnings", x => x.WarningId);
                    table.ForeignKey(
                        name: "FK_NFD_Warnings_NFD_Enrollments_EnrollmentId",
                        column: x => x.EnrollmentId,
                        principalTable: "NFD_Enrollments",
                        principalColumn: "EnrollmentId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_Warnings_NFD_Users_RaisedByUserId",
                        column: x => x.RaisedByUserId,
                        principalTable: "NFD_Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_Excuses",
                columns: table => new
                {
                    ExcuseId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Reason = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    ProofUrl = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false),
                    DailyAttendanceId = table.Column<int>(type: "int", nullable: false),
                    ReviewedByUserId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_Excuses", x => x.ExcuseId);
                    table.ForeignKey(
                        name: "FK_NFD_Excuses_NFD_DailyAttendances_DailyAttendanceId",
                        column: x => x.DailyAttendanceId,
                        principalTable: "NFD_DailyAttendances",
                        principalColumn: "DailyAttendanceId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_Excuses_NFD_Users_ReviewedByUserId",
                        column: x => x.ReviewedByUserId,
                        principalTable: "NFD_Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_TraineePaymentSchedules",
                columns: table => new
                {
                    ScheduleId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    MonthNumber = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    MonthLabel = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: true),
                    DueDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    PaidDate = table.Column<DateTime>(type: "datetime2", nullable: true),
                    TraineePaymentId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_TraineePaymentSchedules", x => x.ScheduleId);
                    table.ForeignKey(
                        name: "FK_NFD_TraineePaymentSchedules_NFD_TraineePayments_TraineePaymentId",
                        column: x => x.TraineePaymentId,
                        principalTable: "NFD_TraineePayments",
                        principalColumn: "TraineePaymentId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Announcements_CreatedByUserId",
                table: "NFD_Announcements",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_AuditLogs_UserId",
                table: "NFD_AuditLogs",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Batches_ProgramId",
                table: "NFD_Batches",
                column: "ProgramId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_BatchTrainers_TrainerId",
                table: "NFD_BatchTrainers",
                column: "TrainerId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Certificates_EnrollmentId",
                table: "NFD_Certificates",
                column: "EnrollmentId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Companies_UserId",
                table: "NFD_Companies",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NFD_CompanyBranches_CompanyId",
                table: "NFD_CompanyBranches",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_CompanyPayments_BatchId",
                table: "NFD_CompanyPayments",
                column: "BatchId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_CompanyPayments_CompanyId",
                table: "NFD_CompanyPayments",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_CompanyPaymentSchedules_CompanyPaymentId",
                table: "NFD_CompanyPaymentSchedules",
                column: "CompanyPaymentId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_CompanyPrograms_ProgramId",
                table: "NFD_CompanyPrograms",
                column: "ProgramId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_CompanySupervisors_CompanyId",
                table: "NFD_CompanySupervisors",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_CompanySupervisors_UserId",
                table: "NFD_CompanySupervisors",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NFD_DailyAttendances_EnrollmentId",
                table: "NFD_DailyAttendances",
                column: "EnrollmentId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Departments_CompanyId",
                table: "NFD_Departments",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Enrollments_BatchId",
                table: "NFD_Enrollments",
                column: "BatchId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Enrollments_CompanyId",
                table: "NFD_Enrollments",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Enrollments_DepartmentId",
                table: "NFD_Enrollments",
                column: "DepartmentId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Enrollments_SupervisorId",
                table: "NFD_Enrollments",
                column: "SupervisorId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Enrollments_TraineeId",
                table: "NFD_Enrollments",
                column: "TraineeId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_EvaluationCriteria_TemplateId",
                table: "NFD_EvaluationCriteria",
                column: "TemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Evaluations_EnrollmentId",
                table: "NFD_Evaluations",
                column: "EnrollmentId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Evaluations_EvaluatorUserId",
                table: "NFD_Evaluations",
                column: "EvaluatorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Evaluations_TemplateId",
                table: "NFD_Evaluations",
                column: "TemplateId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Evaluations_TrainerId",
                table: "NFD_Evaluations",
                column: "TrainerId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_EvaluationTemplates_CreatedByUserId",
                table: "NFD_EvaluationTemplates",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Excuses_DailyAttendanceId",
                table: "NFD_Excuses",
                column: "DailyAttendanceId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Excuses_ReviewedByUserId",
                table: "NFD_Excuses",
                column: "ReviewedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Lessons_ModuleId",
                table: "NFD_Lessons",
                column: "ModuleId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Messages_ReceiverId",
                table: "NFD_Messages",
                column: "ReceiverId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Messages_SenderId",
                table: "NFD_Messages",
                column: "SenderId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Modules_PrerequisiteModuleId",
                table: "NFD_Modules",
                column: "PrerequisiteModuleId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Modules_ProgramId",
                table: "NFD_Modules",
                column: "ProgramId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Notifications_UserId",
                table: "NFD_Notifications",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Permissions_PermissionKey",
                table: "NFD_Permissions",
                column: "PermissionKey",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Programs_TrackId",
                table: "NFD_Programs",
                column: "TrackId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_ProjectMembers_ProjectId",
                table: "NFD_ProjectMembers",
                column: "ProjectId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_ProjectMembers_TraineeId",
                table: "NFD_ProjectMembers",
                column: "TraineeId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Projects_ProgramId",
                table: "NFD_Projects",
                column: "ProgramId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Reports_GeneratedByUserId",
                table: "NFD_Reports",
                column: "GeneratedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_RolePermissions_PermissionId",
                table: "NFD_RolePermissions",
                column: "PermissionId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Roles_RoleName",
                table: "NFD_Roles",
                column: "RoleName",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Rubrics_TaskId",
                table: "NFD_Rubrics",
                column: "TaskId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_SessionAttendances_SessionId",
                table: "NFD_SessionAttendances",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_SessionAttendances_TraineeId",
                table: "NFD_SessionAttendances",
                column: "TraineeId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Sessions_BatchId",
                table: "NFD_Sessions",
                column: "BatchId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Sessions_TrainerId",
                table: "NFD_Sessions",
                column: "TrainerId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Submissions_TaskId",
                table: "NFD_Submissions",
                column: "TaskId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Submissions_TraineeId",
                table: "NFD_Submissions",
                column: "TraineeId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_SupportTickets_UserId",
                table: "NFD_SupportTickets",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_SystemSettings_Key",
                table: "NFD_SystemSettings",
                column: "Key",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Tasks_BatchId",
                table: "NFD_Tasks",
                column: "BatchId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Tasks_CreatedByUserId",
                table: "NFD_Tasks",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_TraineeModuleProgresses_ModuleId",
                table: "NFD_TraineeModuleProgresses",
                column: "ModuleId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_TraineeModuleProgresses_TraineeId",
                table: "NFD_TraineeModuleProgresses",
                column: "TraineeId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_TraineePayments_EnrollmentId",
                table: "NFD_TraineePayments",
                column: "EnrollmentId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_TraineePaymentSchedules_TraineePaymentId",
                table: "NFD_TraineePaymentSchedules",
                column: "TraineePaymentId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Trainees_CompanyId",
                table: "NFD_Trainees",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Trainees_UserId",
                table: "NFD_Trainees",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Trainers_UserId",
                table: "NFD_Trainers",
                column: "UserId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NFD_TrainingMaterials_LessonId",
                table: "NFD_TrainingMaterials",
                column: "LessonId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_TrainingMaterials_UploadedByUserId",
                table: "NFD_TrainingMaterials",
                column: "UploadedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Users_Email",
                table: "NFD_Users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Users_RoleId",
                table: "NFD_Users",
                column: "RoleId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Warnings_EnrollmentId",
                table: "NFD_Warnings",
                column: "EnrollmentId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Warnings_RaisedByUserId",
                table: "NFD_Warnings",
                column: "RaisedByUserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NFD_Announcements");

            migrationBuilder.DropTable(
                name: "NFD_AuditLogs");

            migrationBuilder.DropTable(
                name: "NFD_BatchTrainers");

            migrationBuilder.DropTable(
                name: "NFD_Certificates");

            migrationBuilder.DropTable(
                name: "NFD_CompanyBranches");

            migrationBuilder.DropTable(
                name: "NFD_CompanyPaymentSchedules");

            migrationBuilder.DropTable(
                name: "NFD_CompanyPrograms");

            migrationBuilder.DropTable(
                name: "NFD_EvaluationCriteria");

            migrationBuilder.DropTable(
                name: "NFD_Evaluations");

            migrationBuilder.DropTable(
                name: "NFD_Excuses");

            migrationBuilder.DropTable(
                name: "NFD_Messages");

            migrationBuilder.DropTable(
                name: "NFD_Notifications");

            migrationBuilder.DropTable(
                name: "NFD_ProjectMembers");

            migrationBuilder.DropTable(
                name: "NFD_Reports");

            migrationBuilder.DropTable(
                name: "NFD_RolePermissions");

            migrationBuilder.DropTable(
                name: "NFD_Rubrics");

            migrationBuilder.DropTable(
                name: "NFD_SessionAttendances");

            migrationBuilder.DropTable(
                name: "NFD_Submissions");

            migrationBuilder.DropTable(
                name: "NFD_SupportTickets");

            migrationBuilder.DropTable(
                name: "NFD_SystemSettings");

            migrationBuilder.DropTable(
                name: "NFD_TraineeModuleProgresses");

            migrationBuilder.DropTable(
                name: "NFD_TraineePaymentSchedules");

            migrationBuilder.DropTable(
                name: "NFD_TrainingMaterials");

            migrationBuilder.DropTable(
                name: "NFD_Warnings");

            migrationBuilder.DropTable(
                name: "NFD_CompanyPayments");

            migrationBuilder.DropTable(
                name: "NFD_EvaluationTemplates");

            migrationBuilder.DropTable(
                name: "NFD_DailyAttendances");

            migrationBuilder.DropTable(
                name: "NFD_Projects");

            migrationBuilder.DropTable(
                name: "NFD_Permissions");

            migrationBuilder.DropTable(
                name: "NFD_Sessions");

            migrationBuilder.DropTable(
                name: "NFD_Tasks");

            migrationBuilder.DropTable(
                name: "NFD_TraineePayments");

            migrationBuilder.DropTable(
                name: "NFD_Lessons");

            migrationBuilder.DropTable(
                name: "NFD_Trainers");

            migrationBuilder.DropTable(
                name: "NFD_Enrollments");

            migrationBuilder.DropTable(
                name: "NFD_Modules");

            migrationBuilder.DropTable(
                name: "NFD_Batches");

            migrationBuilder.DropTable(
                name: "NFD_CompanySupervisors");

            migrationBuilder.DropTable(
                name: "NFD_Departments");

            migrationBuilder.DropTable(
                name: "NFD_Trainees");

            migrationBuilder.DropTable(
                name: "NFD_Programs");

            migrationBuilder.DropTable(
                name: "NFD_Companies");

            migrationBuilder.DropTable(
                name: "NFD_Tracks");

            migrationBuilder.DropTable(
                name: "NFD_Users");

            migrationBuilder.DropTable(
                name: "NFD_Roles");
        }
    }
}
