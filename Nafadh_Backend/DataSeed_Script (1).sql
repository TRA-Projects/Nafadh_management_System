/*
  Nafadh System - Full Database Seed Script
  ------------------------------------------
  Populates all 45 NFD_-prefixed tables with consistent, cross-referenced
  sample data for end-to-end testing (Admin / Company / Trainer / Trainee portals).

  HOW TO RUN (SQL Server Management Studio):
    1. Open a new query window connected to the Nafadh database.
    2. Run this script once, against a freshly migrated (empty) database.
    3. All IDs are assigned explicitly, so re-running against a non-empty
       database will fail on primary-key/unique-constraint violations by design
       (safety net against accidental double-seeding). Truncate the tables in
       reverse-dependency order first if you need to reseed.
*/

SET NOCOUNT ON;

IF EXISTS (SELECT 1 FROM dbo.[NFD_Users])
BEGIN
    PRINT 'NFD_Users already contains data - aborting to avoid duplicate/conflicting seed data.';
    RETURN;
END

BEGIN TRY
BEGIN TRANSACTION;

-- ==============================================================================
-- 1.1 Roles
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_Roles] ON;
INSERT INTO dbo.[NFD_Roles] ([RoleId], [RoleName]) VALUES (1, N'Admin');
INSERT INTO dbo.[NFD_Roles] ([RoleId], [RoleName]) VALUES (2, N'CompanySupervisor');
INSERT INTO dbo.[NFD_Roles] ([RoleId], [RoleName]) VALUES (3, N'Trainer');
INSERT INTO dbo.[NFD_Roles] ([RoleId], [RoleName]) VALUES (4, N'Trainee');
SET IDENTITY_INSERT dbo.[NFD_Roles] OFF;


-- ==============================================================================
-- 1.2 Permissions
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_Permissions] ON;
INSERT INTO dbo.[NFD_Permissions] ([PermissionId], [PermissionKey], [Description]) VALUES (1, N'user.manage', N'Create, update, and deactivate user accounts');
INSERT INTO dbo.[NFD_Permissions] ([PermissionId], [PermissionKey], [Description]) VALUES (2, N'company.approve', N'Approve or suspend a host company');
INSERT INTO dbo.[NFD_Permissions] ([PermissionId], [PermissionKey], [Description]) VALUES (3, N'program.manage', N'Create and update tracks, programs, and modules');
INSERT INTO dbo.[NFD_Permissions] ([PermissionId], [PermissionKey], [Description]) VALUES (4, N'batch.manage', N'Create and manage batches and enrollments');
INSERT INTO dbo.[NFD_Permissions] ([PermissionId], [PermissionKey], [Description]) VALUES (5, N'attendance.mark', N'Record session or daily attendance');
INSERT INTO dbo.[NFD_Permissions] ([PermissionId], [PermissionKey], [Description]) VALUES (6, N'evaluation.submit', N'Submit a trainee or trainer evaluation');
INSERT INTO dbo.[NFD_Permissions] ([PermissionId], [PermissionKey], [Description]) VALUES (7, N'warning.escalate', N'Raise or escalate a trainee warning');
INSERT INTO dbo.[NFD_Permissions] ([PermissionId], [PermissionKey], [Description]) VALUES (8, N'trainee.bulk-import', N'Bulk import trainees from Excel');
INSERT INTO dbo.[NFD_Permissions] ([PermissionId], [PermissionKey], [Description]) VALUES (9, N'report.generate', N'Generate and download platform reports');
INSERT INTO dbo.[NFD_Permissions] ([PermissionId], [PermissionKey], [Description]) VALUES (10, N'payment.manage', N'Create and update payment records and schedules');
SET IDENTITY_INSERT dbo.[NFD_Permissions] OFF;


-- ==============================================================================
-- 1.3 RolePermissions
-- ==============================================================================
INSERT INTO dbo.[NFD_RolePermissions] ([RoleId], [PermissionId]) VALUES (1, 1);
INSERT INTO dbo.[NFD_RolePermissions] ([RoleId], [PermissionId]) VALUES (1, 2);
INSERT INTO dbo.[NFD_RolePermissions] ([RoleId], [PermissionId]) VALUES (1, 3);
INSERT INTO dbo.[NFD_RolePermissions] ([RoleId], [PermissionId]) VALUES (1, 4);
INSERT INTO dbo.[NFD_RolePermissions] ([RoleId], [PermissionId]) VALUES (1, 5);
INSERT INTO dbo.[NFD_RolePermissions] ([RoleId], [PermissionId]) VALUES (1, 6);
INSERT INTO dbo.[NFD_RolePermissions] ([RoleId], [PermissionId]) VALUES (1, 7);
INSERT INTO dbo.[NFD_RolePermissions] ([RoleId], [PermissionId]) VALUES (1, 8);
INSERT INTO dbo.[NFD_RolePermissions] ([RoleId], [PermissionId]) VALUES (1, 9);
INSERT INTO dbo.[NFD_RolePermissions] ([RoleId], [PermissionId]) VALUES (1, 10);
INSERT INTO dbo.[NFD_RolePermissions] ([RoleId], [PermissionId]) VALUES (2, 5);
INSERT INTO dbo.[NFD_RolePermissions] ([RoleId], [PermissionId]) VALUES (2, 7);
INSERT INTO dbo.[NFD_RolePermissions] ([RoleId], [PermissionId]) VALUES (2, 9);
INSERT INTO dbo.[NFD_RolePermissions] ([RoleId], [PermissionId]) VALUES (3, 5);
INSERT INTO dbo.[NFD_RolePermissions] ([RoleId], [PermissionId]) VALUES (3, 6);
INSERT INTO dbo.[NFD_RolePermissions] ([RoleId], [PermissionId]) VALUES (3, 4);

-- ==============================================================================
-- 1.4 Users
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_Users] ON;
INSERT INTO dbo.[NFD_Users] ([UserId], [FullName], [Email], [PasswordHash], [Phone], [Status], [CreatedAt], [RoleId]) VALUES (1, N'Admin User', N'admin@nafadh.om', N'$2a$11$SeedPlaceholderHashDoNotUseInProd', N'+968 90010000', 0, '2025-09-01T08:00:00', 1);
INSERT INTO dbo.[NFD_Users] ([UserId], [FullName], [Email], [PasswordHash], [Phone], [Status], [CreatedAt], [RoleId]) VALUES (2, N'Yousef Al-Balushi', N'yousef.company1@nafadh.test', N'$2a$11$SeedPlaceholderHashDoNotUseInProd', N'+968 90020000', 0, '2025-09-01T08:00:00', 2);
INSERT INTO dbo.[NFD_Users] ([UserId], [FullName], [Email], [PasswordHash], [Phone], [Status], [CreatedAt], [RoleId]) VALUES (3, N'Faisal Al-Harthy', N'faisal.company2@nafadh.test', N'$2a$11$SeedPlaceholderHashDoNotUseInProd', N'+968 90030000', 0, '2025-09-01T08:00:00', 2);
INSERT INTO dbo.[NFD_Users] ([UserId], [FullName], [Email], [PasswordHash], [Phone], [Status], [CreatedAt], [RoleId]) VALUES (4, N'Sultan Al-Kindi', N'sultan.company3@nafadh.test', N'$2a$11$SeedPlaceholderHashDoNotUseInProd', N'+968 90040000', 0, '2025-09-01T08:00:00', 2);
INSERT INTO dbo.[NFD_Users] ([UserId], [FullName], [Email], [PasswordHash], [Phone], [Status], [CreatedAt], [RoleId]) VALUES (5, N'Maryam Al-Riyami', N'maryam.supervisor1@nafadh.test', N'$2a$11$SeedPlaceholderHashDoNotUseInProd', N'+968 90050000', 0, '2025-09-01T08:00:00', 2);
INSERT INTO dbo.[NFD_Users] ([UserId], [FullName], [Email], [PasswordHash], [Phone], [Status], [CreatedAt], [RoleId]) VALUES (6, N'Noura Al-Habsi', N'noura.supervisor2@nafadh.test', N'$2a$11$SeedPlaceholderHashDoNotUseInProd', N'+968 90060000', 0, '2025-09-01T08:00:00', 2);
INSERT INTO dbo.[NFD_Users] ([UserId], [FullName], [Email], [PasswordHash], [Phone], [Status], [CreatedAt], [RoleId]) VALUES (7, N'Salma Al-Farsi', N'salma.supervisor3@nafadh.test', N'$2a$11$SeedPlaceholderHashDoNotUseInProd', N'+968 90070000', 0, '2025-09-01T08:00:00', 2);
INSERT INTO dbo.[NFD_Users] ([UserId], [FullName], [Email], [PasswordHash], [Phone], [Status], [CreatedAt], [RoleId]) VALUES (8, N'Khalid Al-Rawahi', N'khalid.trainer1@nafadh.test', N'$2a$11$SeedPlaceholderHashDoNotUseInProd', N'+968 90080000', 0, '2025-09-01T08:00:00', 3);
INSERT INTO dbo.[NFD_Users] ([UserId], [FullName], [Email], [PasswordHash], [Phone], [Status], [CreatedAt], [RoleId]) VALUES (9, N'Hind Al-Saidi', N'hind.trainer2@nafadh.test', N'$2a$11$SeedPlaceholderHashDoNotUseInProd', N'+968 90090000', 0, '2025-09-01T08:00:00', 3);
INSERT INTO dbo.[NFD_Users] ([UserId], [FullName], [Email], [PasswordHash], [Phone], [Status], [CreatedAt], [RoleId]) VALUES (10, N'Omar Al-Amri', N'omar.trainer3@nafadh.test', N'$2a$11$SeedPlaceholderHashDoNotUseInProd', N'+968 90100000', 0, '2025-09-01T08:00:00', 3);
INSERT INTO dbo.[NFD_Users] ([UserId], [FullName], [Email], [PasswordHash], [Phone], [Status], [CreatedAt], [RoleId]) VALUES (11, N'Reem Al-Mahrooqi', N'reem.trainee1@nafadh.test', N'$2a$11$SeedPlaceholderHashDoNotUseInProd', N'+968 90110000', 0, '2025-09-01T08:00:00', 4);
INSERT INTO dbo.[NFD_Users] ([UserId], [FullName], [Email], [PasswordHash], [Phone], [Status], [CreatedAt], [RoleId]) VALUES (12, N'Ali Al-Balushi', N'ali.trainee2@nafadh.test', N'$2a$11$SeedPlaceholderHashDoNotUseInProd', N'+968 90120000', 0, '2025-09-01T08:00:00', 4);
INSERT INTO dbo.[NFD_Users] ([UserId], [FullName], [Email], [PasswordHash], [Phone], [Status], [CreatedAt], [RoleId]) VALUES (13, N'Layla Al-Harthy', N'layla.trainee3@nafadh.test', N'$2a$11$SeedPlaceholderHashDoNotUseInProd', N'+968 90130000', 0, '2025-09-01T08:00:00', 4);
INSERT INTO dbo.[NFD_Users] ([UserId], [FullName], [Email], [PasswordHash], [Phone], [Status], [CreatedAt], [RoleId]) VALUES (14, N'Nasser Al-Kindi', N'nasser.trainee4@nafadh.test', N'$2a$11$SeedPlaceholderHashDoNotUseInProd', N'+968 90140000', 0, '2025-09-01T08:00:00', 4);
INSERT INTO dbo.[NFD_Users] ([UserId], [FullName], [Email], [PasswordHash], [Phone], [Status], [CreatedAt], [RoleId]) VALUES (15, N'Amal Al-Habsi', N'amal.trainee5@nafadh.test', N'$2a$11$SeedPlaceholderHashDoNotUseInProd', N'+968 90150000', 0, '2025-09-01T08:00:00', 4);
INSERT INTO dbo.[NFD_Users] ([UserId], [FullName], [Email], [PasswordHash], [Phone], [Status], [CreatedAt], [RoleId]) VALUES (16, N'Saif Al-Farsi', N'saif.trainee6@nafadh.test', N'$2a$11$SeedPlaceholderHashDoNotUseInProd', N'+968 90160000', 0, '2025-09-01T08:00:00', 4);
INSERT INTO dbo.[NFD_Users] ([UserId], [FullName], [Email], [PasswordHash], [Phone], [Status], [CreatedAt], [RoleId]) VALUES (17, N'Hamad Al-Rawahi', N'hamad.trainee7@nafadh.test', N'$2a$11$SeedPlaceholderHashDoNotUseInProd', N'+968 90170000', 3, '2025-09-01T08:00:00', 4);
INSERT INTO dbo.[NFD_Users] ([UserId], [FullName], [Email], [PasswordHash], [Phone], [Status], [CreatedAt], [RoleId]) VALUES (18, N'Fatima Al-Saidi', N'fatima.trainee8@nafadh.test', N'$2a$11$SeedPlaceholderHashDoNotUseInProd', N'+968 90180000', 0, '2025-09-01T08:00:00', 4);
INSERT INTO dbo.[NFD_Users] ([UserId], [FullName], [Email], [PasswordHash], [Phone], [Status], [CreatedAt], [RoleId]) VALUES (19, N'Rashid Al-Amri', N'rashid.trainee9@nafadh.test', N'$2a$11$SeedPlaceholderHashDoNotUseInProd', N'+968 90190000', 0, '2025-09-01T08:00:00', 4);
INSERT INTO dbo.[NFD_Users] ([UserId], [FullName], [Email], [PasswordHash], [Phone], [Status], [CreatedAt], [RoleId]) VALUES (20, N'Sara Al-Riyami', N'sara.trainee10@nafadh.test', N'$2a$11$SeedPlaceholderHashDoNotUseInProd', N'+968 90200000', 0, '2025-09-01T08:00:00', 4);
SET IDENTITY_INSERT dbo.[NFD_Users] OFF;


-- ==============================================================================
-- 2.1 Companies
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_Companies] ON;
INSERT INTO dbo.[NFD_Companies] ([CompanyId], [UserId], [CompanyName], [CommercialRegister], [WorkField], [Address], [Phone], [Email], [Logo], [Capacity], [Status], [ApprovalDate]) VALUES (1, 2, N'Gulf Tech Solutions', N'CR-100234', N'Information Technology', N'Al Khuwair, Muscat, Oman', N'+968 24123456', N'info@gulftech.test', N'https://cdn.nafadh.test/logos/company1.png', 200, 1, '2025-09-05');
INSERT INTO dbo.[NFD_Companies] ([CompanyId], [UserId], [CompanyName], [CommercialRegister], [WorkField], [Address], [Phone], [Email], [Logo], [Capacity], [Status], [ApprovalDate]) VALUES (2, 3, N'Al Noor Manufacturing', N'CR-100567', N'Industrial Manufacturing', N'Rusayl Industrial Estate, Muscat, Oman', N'+968 24234567', N'info@alnoor.test', N'https://cdn.nafadh.test/logos/company2.png', 200, 1, '2025-09-06');
INSERT INTO dbo.[NFD_Companies] ([CompanyId], [UserId], [CompanyName], [CommercialRegister], [WorkField], [Address], [Phone], [Email], [Logo], [Capacity], [Status], [ApprovalDate]) VALUES (3, 4, N'Bright Path Consulting', N'CR-100889', N'Business Consulting', N'Qurum, Muscat, Oman', N'+968 24345678', N'info@brightpath.test', N'https://cdn.nafadh.test/logos/company3.png', 200, 0, NULL);
SET IDENTITY_INSERT dbo.[NFD_Companies] OFF;


-- ==============================================================================
-- 2.2 CompanyBranches
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_CompanyBranches] ON;
INSERT INTO dbo.[NFD_CompanyBranches] ([BranchId], [CompanyId], [Location], [ContactPoint]) VALUES (1, 1, N'Muscat - Al Khuwair (HQ)', N'Ahmed Al-Balushi');
INSERT INTO dbo.[NFD_CompanyBranches] ([BranchId], [CompanyId], [Location], [ContactPoint]) VALUES (2, 1, N'Salalah Branch', N'Mona Al-Balushi');
INSERT INTO dbo.[NFD_CompanyBranches] ([BranchId], [CompanyId], [Location], [ContactPoint]) VALUES (3, 2, N'Rusayl Industrial Estate (HQ)', N'Talal Al-Harthy');
INSERT INTO dbo.[NFD_CompanyBranches] ([BranchId], [CompanyId], [Location], [ContactPoint]) VALUES (4, 2, N'Sohar Branch', N'Huda Al-Harthy');
INSERT INTO dbo.[NFD_CompanyBranches] ([BranchId], [CompanyId], [Location], [ContactPoint]) VALUES (5, 3, N'Qurum (HQ)', N'Yaqoub Al-Kindi');
INSERT INTO dbo.[NFD_CompanyBranches] ([BranchId], [CompanyId], [Location], [ContactPoint]) VALUES (6, 3, N'Nizwa Branch', N'Zainab Al-Kindi');
SET IDENTITY_INSERT dbo.[NFD_CompanyBranches] OFF;


-- ==============================================================================
-- 2.3 CompanySupervisors
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_CompanySupervisors] ON;
INSERT INTO dbo.[NFD_CompanySupervisors] ([SupervisorId], [UserId], [CompanyId], [Department], [Position]) VALUES (1, 5, 1, N'Software Engineering', N'Training Supervisor');
INSERT INTO dbo.[NFD_CompanySupervisors] ([SupervisorId], [UserId], [CompanyId], [Department], [Position]) VALUES (2, 6, 2, N'Production Systems', N'HR & Training Lead');
INSERT INTO dbo.[NFD_CompanySupervisors] ([SupervisorId], [UserId], [CompanyId], [Department], [Position]) VALUES (3, 7, 3, N'Client Services', N'Talent Development Manager');
SET IDENTITY_INSERT dbo.[NFD_CompanySupervisors] OFF;


-- ==============================================================================
-- 2.4 Departments
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_Departments] ON;
INSERT INTO dbo.[NFD_Departments] ([DepartmentId], [CompanyId], [Name]) VALUES (1, 1, N'Software Engineering');
INSERT INTO dbo.[NFD_Departments] ([DepartmentId], [CompanyId], [Name]) VALUES (2, 1, N'Quality Assurance');
INSERT INTO dbo.[NFD_Departments] ([DepartmentId], [CompanyId], [Name]) VALUES (3, 2, N'Production Systems');
INSERT INTO dbo.[NFD_Departments] ([DepartmentId], [CompanyId], [Name]) VALUES (4, 2, N'IT Support');
INSERT INTO dbo.[NFD_Departments] ([DepartmentId], [CompanyId], [Name]) VALUES (5, 3, N'Client Services');
INSERT INTO dbo.[NFD_Departments] ([DepartmentId], [CompanyId], [Name]) VALUES (6, 3, N'Business Analysis');
SET IDENTITY_INSERT dbo.[NFD_Departments] OFF;


-- ==============================================================================
-- 3.1 Trainers
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_Trainers] ON;
INSERT INTO dbo.[NFD_Trainers] ([TrainerId], [UserId], [Specialty], [ExperienceYears], [Biography], [CVUrl], [Status]) VALUES (1, 8, N'ASP.NET Core & C# Backend Development', 7, N'Backend engineer specializing in ASP.NET Core, EF Core, and REST API design.', N'https://cdn.nafadh.test/cv/trainer1.pdf', 0);
INSERT INTO dbo.[NFD_Trainers] ([TrainerId], [UserId], [Specialty], [ExperienceYears], [Biography], [CVUrl], [Status]) VALUES (2, 9, N'Frontend Development (Angular)', 5, N'Frontend engineer focused on Angular, TypeScript, and design systems.', N'https://cdn.nafadh.test/cv/trainer2.pdf', 0);
INSERT INTO dbo.[NFD_Trainers] ([TrainerId], [UserId], [Specialty], [ExperienceYears], [Biography], [CVUrl], [Status]) VALUES (3, 10, N'Data Analysis & UX Foundations', 6, N'Trainer covering data analysis fundamentals and UX/UI design thinking.', N'https://cdn.nafadh.test/cv/trainer3.pdf', 0);
SET IDENTITY_INSERT dbo.[NFD_Trainers] OFF;


-- ==============================================================================
-- 3.2 Trainees
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_Trainees] ON;
INSERT INTO dbo.[NFD_Trainees] ([TraineeId], [UserId], [CompanyId], [NationalId], [University], [Major], [AcademicLevel], [Skills], [ResumeUrl], [Status]) VALUES (1, 11, 1, 10112233, N'Sultan Qaboos University', N'Computer Science', N'Bachelor', N'C#, SQL, Git', N'https://cdn.nafadh.test/resumes/trainee1.pdf', 0);
INSERT INTO dbo.[NFD_Trainees] ([TraineeId], [UserId], [CompanyId], [NationalId], [University], [Major], [AcademicLevel], [Skills], [ResumeUrl], [Status]) VALUES (2, 12, 1, 10112234, N'Sultan Qaboos University', N'Information Systems', N'Bachelor', N'Java, SQL, Excel', N'https://cdn.nafadh.test/resumes/trainee2.pdf', 0);
INSERT INTO dbo.[NFD_Trainees] ([TraineeId], [UserId], [CompanyId], [NationalId], [University], [Major], [AcademicLevel], [Skills], [ResumeUrl], [Status]) VALUES (3, 13, 2, 10112235, N'German University of Technology', N'Mechatronics Engineering', N'Bachelor', N'C#, AutoCAD', N'https://cdn.nafadh.test/resumes/trainee3.pdf', 0);
INSERT INTO dbo.[NFD_Trainees] ([TraineeId], [UserId], [CompanyId], [NationalId], [University], [Major], [AcademicLevel], [Skills], [ResumeUrl], [Status]) VALUES (4, 14, 2, 10112236, N'Nizwa University', N'Computer Engineering', N'Bachelor', N'Python, Networking', N'https://cdn.nafadh.test/resumes/trainee4.pdf', 0);
INSERT INTO dbo.[NFD_Trainees] ([TraineeId], [UserId], [CompanyId], [NationalId], [University], [Major], [AcademicLevel], [Skills], [ResumeUrl], [Status]) VALUES (5, 15, 3, 10112237, N'Sultan Qaboos University', N'Business Informatics', N'Bachelor', N'Excel, SQL, Power BI', N'https://cdn.nafadh.test/resumes/trainee5.pdf', 0);
INSERT INTO dbo.[NFD_Trainees] ([TraineeId], [UserId], [CompanyId], [NationalId], [University], [Major], [AcademicLevel], [Skills], [ResumeUrl], [Status]) VALUES (6, 16, 3, 10112238, N'Muscat University', N'Software Engineering', N'Bachelor', N'Angular, TypeScript', N'https://cdn.nafadh.test/resumes/trainee6.pdf', 0);
INSERT INTO dbo.[NFD_Trainees] ([TraineeId], [UserId], [CompanyId], [NationalId], [University], [Major], [AcademicLevel], [Skills], [ResumeUrl], [Status]) VALUES (7, 17, NULL, 10112239, N'Nizwa University', N'Computer Science', N'Diploma', N'HTML, CSS, JavaScript', N'https://cdn.nafadh.test/resumes/trainee7.pdf', 0);
INSERT INTO dbo.[NFD_Trainees] ([TraineeId], [UserId], [CompanyId], [NationalId], [University], [Major], [AcademicLevel], [Skills], [ResumeUrl], [Status]) VALUES (8, 18, NULL, 10112240, N'Sohar University', N'Information Technology', N'Bachelor', N'Java, MySQL', N'https://cdn.nafadh.test/resumes/trainee8.pdf', 0);
INSERT INTO dbo.[NFD_Trainees] ([TraineeId], [UserId], [CompanyId], [NationalId], [University], [Major], [AcademicLevel], [Skills], [ResumeUrl], [Status]) VALUES (9, 19, NULL, 10112241, N'Dhofar University', N'Graphic Design', N'Diploma', N'Figma, UX Research', N'https://cdn.nafadh.test/resumes/trainee9.pdf', 0);
INSERT INTO dbo.[NFD_Trainees] ([TraineeId], [UserId], [CompanyId], [NationalId], [University], [Major], [AcademicLevel], [Skills], [ResumeUrl], [Status]) VALUES (10, 20, NULL, 10112242, N'Sultan Qaboos University', N'Business Administration', N'Bachelor', N'Excel, Communication', N'https://cdn.nafadh.test/resumes/trainee10.pdf', 0);
SET IDENTITY_INSERT dbo.[NFD_Trainees] OFF;


-- ==============================================================================
-- 4.1 Tracks
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_Tracks] ON;
INSERT INTO dbo.[NFD_Tracks] ([TrackId], [Name], [Description], [Status]) VALUES (1, N'.NET Track', N'Backend development with C# and ASP.NET Core.', 0);
INSERT INTO dbo.[NFD_Tracks] ([TrackId], [Name], [Description], [Status]) VALUES (2, N'Frontend Track', N'Client-side web development with Angular.', 0);
INSERT INTO dbo.[NFD_Tracks] ([TrackId], [Name], [Description], [Status]) VALUES (3, N'Data & UX Track', N'Data analysis foundations and UX/UI design thinking.', 0);
SET IDENTITY_INSERT dbo.[NFD_Tracks] OFF;


-- ==============================================================================
-- 4.2 Programs
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_Programs] ON;
INSERT INTO dbo.[NFD_Programs] ([ProgramId], [TrackId], [Title], [Description], [Category], [DurationHours], [Price], [Status]) VALUES (1, 1, N'ASP.NET Core Bootcamp', N'ASP.NET Core Bootcamp - hands-on training program covering backend development skills for placement-ready trainees.', N'Backend Development', 120, 650.0, 1);
INSERT INTO dbo.[NFD_Programs] ([ProgramId], [TrackId], [Title], [Description], [Category], [DurationHours], [Price], [Status]) VALUES (2, 1, N'C# Fundamentals', N'C# Fundamentals - hands-on training program covering backend development skills for placement-ready trainees.', N'Backend Development', 60, 350.0, 1);
INSERT INTO dbo.[NFD_Programs] ([ProgramId], [TrackId], [Title], [Description], [Category], [DurationHours], [Price], [Status]) VALUES (3, 2, N'Angular Bootcamp', N'Angular Bootcamp - hands-on training program covering frontend development skills for placement-ready trainees.', N'Frontend Development', 100, 600.0, 1);
INSERT INTO dbo.[NFD_Programs] ([ProgramId], [TrackId], [Title], [Description], [Category], [DurationHours], [Price], [Status]) VALUES (4, 3, N'UI/UX Foundations', N'UI/UX Foundations - hands-on training program covering design skills for placement-ready trainees.', N'Design', 80, 450.0, 1);
INSERT INTO dbo.[NFD_Programs] ([ProgramId], [TrackId], [Title], [Description], [Category], [DurationHours], [Price], [Status]) VALUES (5, 3, N'Data Analysis with Python', N'Data Analysis with Python - hands-on training program covering data skills for placement-ready trainees.', N'Data', 90, 500.0, 0);
INSERT INTO dbo.[NFD_Programs] ([ProgramId], [TrackId], [Title], [Description], [Category], [DurationHours], [Price], [Status]) VALUES (6, 2, N'TypeScript Essentials', N'TypeScript Essentials - hands-on training program covering frontend development skills for placement-ready trainees.', N'Frontend Development', 40, 250.0, 0);
SET IDENTITY_INSERT dbo.[NFD_Programs] OFF;


-- ==============================================================================
-- 4.3 CompanyPrograms
-- ==============================================================================
INSERT INTO dbo.[NFD_CompanyPrograms] ([CompanyId], [ProgramId]) VALUES (1, 1);
INSERT INTO dbo.[NFD_CompanyPrograms] ([CompanyId], [ProgramId]) VALUES (1, 2);
INSERT INTO dbo.[NFD_CompanyPrograms] ([CompanyId], [ProgramId]) VALUES (2, 3);
INSERT INTO dbo.[NFD_CompanyPrograms] ([CompanyId], [ProgramId]) VALUES (2, 4);
INSERT INTO dbo.[NFD_CompanyPrograms] ([CompanyId], [ProgramId]) VALUES (3, 5);
INSERT INTO dbo.[NFD_CompanyPrograms] ([CompanyId], [ProgramId]) VALUES (3, 6);

-- ==============================================================================
-- 4.4 Batches
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_Batches] ON;
INSERT INTO dbo.[NFD_Batches] ([BatchId], [ProgramId], [BatchName], [StartDate], [EndDate], [Capacity], [Status]) VALUES (1, 1, N'ASP.NET Core Bootcamp - Jan 2026', '2026-01-11', '2026-03-19', 15, 1);
INSERT INTO dbo.[NFD_Batches] ([BatchId], [ProgramId], [BatchName], [StartDate], [EndDate], [Capacity], [Status]) VALUES (2, 2, N'C# Fundamentals - Jan 2026', '2026-01-11', '2026-02-12', 15, 1);
INSERT INTO dbo.[NFD_Batches] ([BatchId], [ProgramId], [BatchName], [StartDate], [EndDate], [Capacity], [Status]) VALUES (3, 3, N'Angular Bootcamp - Jan 2026', '2026-01-18', '2026-03-26', 15, 1);
INSERT INTO dbo.[NFD_Batches] ([BatchId], [ProgramId], [BatchName], [StartDate], [EndDate], [Capacity], [Status]) VALUES (4, 4, N'UI/UX Foundations - Feb 2026', '2026-02-01', '2026-03-19', 15, 0);
SET IDENTITY_INSERT dbo.[NFD_Batches] OFF;


-- ==============================================================================
-- 4.5 BatchTrainers
-- ==============================================================================
INSERT INTO dbo.[NFD_BatchTrainers] ([BatchId], [TrainerId]) VALUES (1, 1);
INSERT INTO dbo.[NFD_BatchTrainers] ([BatchId], [TrainerId]) VALUES (2, 1);
INSERT INTO dbo.[NFD_BatchTrainers] ([BatchId], [TrainerId]) VALUES (3, 2);
INSERT INTO dbo.[NFD_BatchTrainers] ([BatchId], [TrainerId]) VALUES (4, 3);

-- ==============================================================================
-- 4.6 Enrollments
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_Enrollments] ON;
INSERT INTO dbo.[NFD_Enrollments] ([EnrollmentId], [BatchId], [TraineeId], [CompanyId], [DepartmentId], [SupervisorId], [EnrollmentDate], [CompletionStatus]) VALUES (1, 1, 1, 1, 1, 1, '2026-01-11', 1);
INSERT INTO dbo.[NFD_Enrollments] ([EnrollmentId], [BatchId], [TraineeId], [CompanyId], [DepartmentId], [SupervisorId], [EnrollmentDate], [CompletionStatus]) VALUES (2, 1, 2, 1, 2, 1, '2026-01-11', 0);
INSERT INTO dbo.[NFD_Enrollments] ([EnrollmentId], [BatchId], [TraineeId], [CompanyId], [DepartmentId], [SupervisorId], [EnrollmentDate], [CompletionStatus]) VALUES (3, 1, 7, 2, NULL, NULL, '2026-01-11', 0);
INSERT INTO dbo.[NFD_Enrollments] ([EnrollmentId], [BatchId], [TraineeId], [CompanyId], [DepartmentId], [SupervisorId], [EnrollmentDate], [CompletionStatus]) VALUES (4, 2, 3, 2, 3, 2, '2026-01-11', 1);
INSERT INTO dbo.[NFD_Enrollments] ([EnrollmentId], [BatchId], [TraineeId], [CompanyId], [DepartmentId], [SupervisorId], [EnrollmentDate], [CompletionStatus]) VALUES (5, 2, 4, 2, 4, 2, '2026-01-11', 0);
INSERT INTO dbo.[NFD_Enrollments] ([EnrollmentId], [BatchId], [TraineeId], [CompanyId], [DepartmentId], [SupervisorId], [EnrollmentDate], [CompletionStatus]) VALUES (6, 2, 8, 3, NULL, NULL, '2026-01-11', 0);
INSERT INTO dbo.[NFD_Enrollments] ([EnrollmentId], [BatchId], [TraineeId], [CompanyId], [DepartmentId], [SupervisorId], [EnrollmentDate], [CompletionStatus]) VALUES (7, 3, 5, 3, 5, 3, '2026-01-18', 0);
INSERT INTO dbo.[NFD_Enrollments] ([EnrollmentId], [BatchId], [TraineeId], [CompanyId], [DepartmentId], [SupervisorId], [EnrollmentDate], [CompletionStatus]) VALUES (8, 3, 6, 3, 6, 3, '2026-01-18', 0);
INSERT INTO dbo.[NFD_Enrollments] ([EnrollmentId], [BatchId], [TraineeId], [CompanyId], [DepartmentId], [SupervisorId], [EnrollmentDate], [CompletionStatus]) VALUES (9, 3, 9, 1, NULL, NULL, '2026-01-18', 2);
INSERT INTO dbo.[NFD_Enrollments] ([EnrollmentId], [BatchId], [TraineeId], [CompanyId], [DepartmentId], [SupervisorId], [EnrollmentDate], [CompletionStatus]) VALUES (10, 4, 10, 1, 1, 1, '2026-02-01', 0);
INSERT INTO dbo.[NFD_Enrollments] ([EnrollmentId], [BatchId], [TraineeId], [CompanyId], [DepartmentId], [SupervisorId], [EnrollmentDate], [CompletionStatus]) VALUES (11, 4, 1, 1, 2, 1, '2026-02-01', 0);
INSERT INTO dbo.[NFD_Enrollments] ([EnrollmentId], [BatchId], [TraineeId], [CompanyId], [DepartmentId], [SupervisorId], [EnrollmentDate], [CompletionStatus]) VALUES (12, 4, 5, 3, 5, 3, '2026-02-01', 3);
SET IDENTITY_INSERT dbo.[NFD_Enrollments] OFF;


-- ==============================================================================
-- 5.1 Modules
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_Modules] ON;
INSERT INTO dbo.[NFD_Modules] ([ModuleId], [ProgramId], [Title], [OrderIndex], [AvailableFrom], [AvailableTo], [IsArchived], [PrerequisiteModuleId]) VALUES (1, 1, N'Setting up ASP.NET Core', 1, '2026-01-11', '2026-03-19', 0, NULL);
INSERT INTO dbo.[NFD_Modules] ([ModuleId], [ProgramId], [Title], [OrderIndex], [AvailableFrom], [AvailableTo], [IsArchived], [PrerequisiteModuleId]) VALUES (2, 1, N'Building REST APIs', 2, '2026-01-11', '2026-03-19', 0, 1);
INSERT INTO dbo.[NFD_Modules] ([ModuleId], [ProgramId], [Title], [OrderIndex], [AvailableFrom], [AvailableTo], [IsArchived], [PrerequisiteModuleId]) VALUES (3, 1, N'EF Core & Databases', 3, '2026-01-11', '2026-03-19', 0, 2);
INSERT INTO dbo.[NFD_Modules] ([ModuleId], [ProgramId], [Title], [OrderIndex], [AvailableFrom], [AvailableTo], [IsArchived], [PrerequisiteModuleId]) VALUES (4, 2, N'C# Syntax Basics', 1, '2026-01-11', '2026-02-12', 0, NULL);
INSERT INTO dbo.[NFD_Modules] ([ModuleId], [ProgramId], [Title], [OrderIndex], [AvailableFrom], [AvailableTo], [IsArchived], [PrerequisiteModuleId]) VALUES (5, 2, N'OOP in C#', 2, '2026-01-11', '2026-02-12', 0, 4);
INSERT INTO dbo.[NFD_Modules] ([ModuleId], [ProgramId], [Title], [OrderIndex], [AvailableFrom], [AvailableTo], [IsArchived], [PrerequisiteModuleId]) VALUES (6, 2, N'Collections & LINQ', 3, '2026-01-11', '2026-02-12', 0, 5);
INSERT INTO dbo.[NFD_Modules] ([ModuleId], [ProgramId], [Title], [OrderIndex], [AvailableFrom], [AvailableTo], [IsArchived], [PrerequisiteModuleId]) VALUES (7, 3, N'Angular Fundamentals', 1, '2026-01-18', '2026-03-26', 0, NULL);
INSERT INTO dbo.[NFD_Modules] ([ModuleId], [ProgramId], [Title], [OrderIndex], [AvailableFrom], [AvailableTo], [IsArchived], [PrerequisiteModuleId]) VALUES (8, 3, N'Components & Services', 2, '2026-01-18', '2026-03-26', 0, 7);
INSERT INTO dbo.[NFD_Modules] ([ModuleId], [ProgramId], [Title], [OrderIndex], [AvailableFrom], [AvailableTo], [IsArchived], [PrerequisiteModuleId]) VALUES (9, 3, N'Routing & Forms', 3, '2026-01-18', '2026-03-26', 0, 8);
INSERT INTO dbo.[NFD_Modules] ([ModuleId], [ProgramId], [Title], [OrderIndex], [AvailableFrom], [AvailableTo], [IsArchived], [PrerequisiteModuleId]) VALUES (10, 4, N'Design Thinking Basics', 1, '2026-02-01', '2026-03-19', 0, NULL);
INSERT INTO dbo.[NFD_Modules] ([ModuleId], [ProgramId], [Title], [OrderIndex], [AvailableFrom], [AvailableTo], [IsArchived], [PrerequisiteModuleId]) VALUES (11, 4, N'Wireframing & Prototyping', 2, '2026-02-01', '2026-03-19', 0, 10);
INSERT INTO dbo.[NFD_Modules] ([ModuleId], [ProgramId], [Title], [OrderIndex], [AvailableFrom], [AvailableTo], [IsArchived], [PrerequisiteModuleId]) VALUES (12, 4, N'Usability Testing', 3, '2026-02-01', '2026-03-19', 0, 11);
SET IDENTITY_INSERT dbo.[NFD_Modules] OFF;


-- ==============================================================================
-- 5.2 Lessons
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_Lessons] ON;
INSERT INTO dbo.[NFD_Lessons] ([LessonId], [ModuleId], [Title], [ContentBody], [OrderIndex]) VALUES (1, 1, N'Setting up ASP.NET Core - Part 1', N'Lesson content covering setting up asp.net core (part 1 of 2).', 1);
INSERT INTO dbo.[NFD_Lessons] ([LessonId], [ModuleId], [Title], [ContentBody], [OrderIndex]) VALUES (2, 1, N'Setting up ASP.NET Core - Part 2', N'Lesson content covering setting up asp.net core (part 2 of 2).', 2);
INSERT INTO dbo.[NFD_Lessons] ([LessonId], [ModuleId], [Title], [ContentBody], [OrderIndex]) VALUES (3, 2, N'Building REST APIs - Part 1', N'Lesson content covering building rest apis (part 1 of 2).', 1);
INSERT INTO dbo.[NFD_Lessons] ([LessonId], [ModuleId], [Title], [ContentBody], [OrderIndex]) VALUES (4, 2, N'Building REST APIs - Part 2', N'Lesson content covering building rest apis (part 2 of 2).', 2);
INSERT INTO dbo.[NFD_Lessons] ([LessonId], [ModuleId], [Title], [ContentBody], [OrderIndex]) VALUES (5, 3, N'EF Core & Databases - Part 1', N'Lesson content covering ef core & databases (part 1 of 2).', 1);
INSERT INTO dbo.[NFD_Lessons] ([LessonId], [ModuleId], [Title], [ContentBody], [OrderIndex]) VALUES (6, 3, N'EF Core & Databases - Part 2', N'Lesson content covering ef core & databases (part 2 of 2).', 2);
INSERT INTO dbo.[NFD_Lessons] ([LessonId], [ModuleId], [Title], [ContentBody], [OrderIndex]) VALUES (7, 4, N'C# Syntax Basics - Part 1', N'Lesson content covering c# syntax basics (part 1 of 2).', 1);
INSERT INTO dbo.[NFD_Lessons] ([LessonId], [ModuleId], [Title], [ContentBody], [OrderIndex]) VALUES (8, 4, N'C# Syntax Basics - Part 2', N'Lesson content covering c# syntax basics (part 2 of 2).', 2);
INSERT INTO dbo.[NFD_Lessons] ([LessonId], [ModuleId], [Title], [ContentBody], [OrderIndex]) VALUES (9, 5, N'OOP in C# - Part 1', N'Lesson content covering oop in c# (part 1 of 2).', 1);
INSERT INTO dbo.[NFD_Lessons] ([LessonId], [ModuleId], [Title], [ContentBody], [OrderIndex]) VALUES (10, 5, N'OOP in C# - Part 2', N'Lesson content covering oop in c# (part 2 of 2).', 2);
INSERT INTO dbo.[NFD_Lessons] ([LessonId], [ModuleId], [Title], [ContentBody], [OrderIndex]) VALUES (11, 6, N'Collections & LINQ - Part 1', N'Lesson content covering collections & linq (part 1 of 2).', 1);
INSERT INTO dbo.[NFD_Lessons] ([LessonId], [ModuleId], [Title], [ContentBody], [OrderIndex]) VALUES (12, 6, N'Collections & LINQ - Part 2', N'Lesson content covering collections & linq (part 2 of 2).', 2);
INSERT INTO dbo.[NFD_Lessons] ([LessonId], [ModuleId], [Title], [ContentBody], [OrderIndex]) VALUES (13, 7, N'Angular Fundamentals - Part 1', N'Lesson content covering angular fundamentals (part 1 of 2).', 1);
INSERT INTO dbo.[NFD_Lessons] ([LessonId], [ModuleId], [Title], [ContentBody], [OrderIndex]) VALUES (14, 7, N'Angular Fundamentals - Part 2', N'Lesson content covering angular fundamentals (part 2 of 2).', 2);
INSERT INTO dbo.[NFD_Lessons] ([LessonId], [ModuleId], [Title], [ContentBody], [OrderIndex]) VALUES (15, 8, N'Components & Services - Part 1', N'Lesson content covering components & services (part 1 of 2).', 1);
INSERT INTO dbo.[NFD_Lessons] ([LessonId], [ModuleId], [Title], [ContentBody], [OrderIndex]) VALUES (16, 8, N'Components & Services - Part 2', N'Lesson content covering components & services (part 2 of 2).', 2);
INSERT INTO dbo.[NFD_Lessons] ([LessonId], [ModuleId], [Title], [ContentBody], [OrderIndex]) VALUES (17, 9, N'Routing & Forms - Part 1', N'Lesson content covering routing & forms (part 1 of 2).', 1);
INSERT INTO dbo.[NFD_Lessons] ([LessonId], [ModuleId], [Title], [ContentBody], [OrderIndex]) VALUES (18, 9, N'Routing & Forms - Part 2', N'Lesson content covering routing & forms (part 2 of 2).', 2);
INSERT INTO dbo.[NFD_Lessons] ([LessonId], [ModuleId], [Title], [ContentBody], [OrderIndex]) VALUES (19, 10, N'Design Thinking Basics - Part 1', N'Lesson content covering design thinking basics (part 1 of 2).', 1);
INSERT INTO dbo.[NFD_Lessons] ([LessonId], [ModuleId], [Title], [ContentBody], [OrderIndex]) VALUES (20, 10, N'Design Thinking Basics - Part 2', N'Lesson content covering design thinking basics (part 2 of 2).', 2);
INSERT INTO dbo.[NFD_Lessons] ([LessonId], [ModuleId], [Title], [ContentBody], [OrderIndex]) VALUES (21, 11, N'Wireframing & Prototyping - Part 1', N'Lesson content covering wireframing & prototyping (part 1 of 2).', 1);
INSERT INTO dbo.[NFD_Lessons] ([LessonId], [ModuleId], [Title], [ContentBody], [OrderIndex]) VALUES (22, 11, N'Wireframing & Prototyping - Part 2', N'Lesson content covering wireframing & prototyping (part 2 of 2).', 2);
INSERT INTO dbo.[NFD_Lessons] ([LessonId], [ModuleId], [Title], [ContentBody], [OrderIndex]) VALUES (23, 12, N'Usability Testing - Part 1', N'Lesson content covering usability testing (part 1 of 2).', 1);
INSERT INTO dbo.[NFD_Lessons] ([LessonId], [ModuleId], [Title], [ContentBody], [OrderIndex]) VALUES (24, 12, N'Usability Testing - Part 2', N'Lesson content covering usability testing (part 2 of 2).', 2);
SET IDENTITY_INSERT dbo.[NFD_Lessons] OFF;


-- ==============================================================================
-- 5.3 TrainingMaterials
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_TrainingMaterials] ON;
INSERT INTO dbo.[NFD_TrainingMaterials] ([MaterialId], [LessonId], [FileUrl], [FileType], [UploadDate], [UploadedByUserId]) VALUES (1, 1, N'https://cdn.nafadh.test/materials/lesson1.pdf', 0, '2025-12-15T10:00:00', 8);
INSERT INTO dbo.[NFD_TrainingMaterials] ([MaterialId], [LessonId], [FileUrl], [FileType], [UploadDate], [UploadedByUserId]) VALUES (2, 2, N'https://cdn.nafadh.test/materials/lesson2.video', 1, '2025-12-15T10:00:00', 8);
INSERT INTO dbo.[NFD_TrainingMaterials] ([MaterialId], [LessonId], [FileUrl], [FileType], [UploadDate], [UploadedByUserId]) VALUES (3, 3, N'https://cdn.nafadh.test/materials/lesson3.document', 3, '2025-12-15T10:00:00', 8);
INSERT INTO dbo.[NFD_TrainingMaterials] ([MaterialId], [LessonId], [FileUrl], [FileType], [UploadDate], [UploadedByUserId]) VALUES (4, 4, N'https://cdn.nafadh.test/materials/lesson4.pdf', 0, '2025-12-15T10:00:00', 8);
INSERT INTO dbo.[NFD_TrainingMaterials] ([MaterialId], [LessonId], [FileUrl], [FileType], [UploadDate], [UploadedByUserId]) VALUES (5, 5, N'https://cdn.nafadh.test/materials/lesson5.video', 1, '2025-12-15T10:00:00', 8);
INSERT INTO dbo.[NFD_TrainingMaterials] ([MaterialId], [LessonId], [FileUrl], [FileType], [UploadDate], [UploadedByUserId]) VALUES (6, 6, N'https://cdn.nafadh.test/materials/lesson6.document', 3, '2025-12-15T10:00:00', 8);
INSERT INTO dbo.[NFD_TrainingMaterials] ([MaterialId], [LessonId], [FileUrl], [FileType], [UploadDate], [UploadedByUserId]) VALUES (7, 7, N'https://cdn.nafadh.test/materials/lesson7.pdf', 0, '2025-12-15T10:00:00', 8);
INSERT INTO dbo.[NFD_TrainingMaterials] ([MaterialId], [LessonId], [FileUrl], [FileType], [UploadDate], [UploadedByUserId]) VALUES (8, 8, N'https://cdn.nafadh.test/materials/lesson8.video', 1, '2025-12-15T10:00:00', 8);
INSERT INTO dbo.[NFD_TrainingMaterials] ([MaterialId], [LessonId], [FileUrl], [FileType], [UploadDate], [UploadedByUserId]) VALUES (9, 9, N'https://cdn.nafadh.test/materials/lesson9.document', 3, '2025-12-15T10:00:00', 8);
INSERT INTO dbo.[NFD_TrainingMaterials] ([MaterialId], [LessonId], [FileUrl], [FileType], [UploadDate], [UploadedByUserId]) VALUES (10, 10, N'https://cdn.nafadh.test/materials/lesson10.pdf', 0, '2025-12-15T10:00:00', 8);
INSERT INTO dbo.[NFD_TrainingMaterials] ([MaterialId], [LessonId], [FileUrl], [FileType], [UploadDate], [UploadedByUserId]) VALUES (11, 11, N'https://cdn.nafadh.test/materials/lesson11.video', 1, '2025-12-15T10:00:00', 8);
INSERT INTO dbo.[NFD_TrainingMaterials] ([MaterialId], [LessonId], [FileUrl], [FileType], [UploadDate], [UploadedByUserId]) VALUES (12, 12, N'https://cdn.nafadh.test/materials/lesson12.document', 3, '2025-12-15T10:00:00', 8);
INSERT INTO dbo.[NFD_TrainingMaterials] ([MaterialId], [LessonId], [FileUrl], [FileType], [UploadDate], [UploadedByUserId]) VALUES (13, 13, N'https://cdn.nafadh.test/materials/lesson13.pdf', 0, '2025-12-15T10:00:00', 9);
INSERT INTO dbo.[NFD_TrainingMaterials] ([MaterialId], [LessonId], [FileUrl], [FileType], [UploadDate], [UploadedByUserId]) VALUES (14, 14, N'https://cdn.nafadh.test/materials/lesson14.video', 1, '2025-12-15T10:00:00', 9);
INSERT INTO dbo.[NFD_TrainingMaterials] ([MaterialId], [LessonId], [FileUrl], [FileType], [UploadDate], [UploadedByUserId]) VALUES (15, 15, N'https://cdn.nafadh.test/materials/lesson15.document', 3, '2025-12-15T10:00:00', 9);
INSERT INTO dbo.[NFD_TrainingMaterials] ([MaterialId], [LessonId], [FileUrl], [FileType], [UploadDate], [UploadedByUserId]) VALUES (16, 16, N'https://cdn.nafadh.test/materials/lesson16.pdf', 0, '2025-12-15T10:00:00', 9);
INSERT INTO dbo.[NFD_TrainingMaterials] ([MaterialId], [LessonId], [FileUrl], [FileType], [UploadDate], [UploadedByUserId]) VALUES (17, 17, N'https://cdn.nafadh.test/materials/lesson17.video', 1, '2025-12-15T10:00:00', 9);
INSERT INTO dbo.[NFD_TrainingMaterials] ([MaterialId], [LessonId], [FileUrl], [FileType], [UploadDate], [UploadedByUserId]) VALUES (18, 18, N'https://cdn.nafadh.test/materials/lesson18.document', 3, '2025-12-15T10:00:00', 9);
INSERT INTO dbo.[NFD_TrainingMaterials] ([MaterialId], [LessonId], [FileUrl], [FileType], [UploadDate], [UploadedByUserId]) VALUES (19, 19, N'https://cdn.nafadh.test/materials/lesson19.pdf', 0, '2025-12-15T10:00:00', 10);
INSERT INTO dbo.[NFD_TrainingMaterials] ([MaterialId], [LessonId], [FileUrl], [FileType], [UploadDate], [UploadedByUserId]) VALUES (20, 20, N'https://cdn.nafadh.test/materials/lesson20.video', 1, '2025-12-15T10:00:00', 10);
INSERT INTO dbo.[NFD_TrainingMaterials] ([MaterialId], [LessonId], [FileUrl], [FileType], [UploadDate], [UploadedByUserId]) VALUES (21, 21, N'https://cdn.nafadh.test/materials/lesson21.document', 3, '2025-12-15T10:00:00', 10);
INSERT INTO dbo.[NFD_TrainingMaterials] ([MaterialId], [LessonId], [FileUrl], [FileType], [UploadDate], [UploadedByUserId]) VALUES (22, 22, N'https://cdn.nafadh.test/materials/lesson22.pdf', 0, '2025-12-15T10:00:00', 10);
INSERT INTO dbo.[NFD_TrainingMaterials] ([MaterialId], [LessonId], [FileUrl], [FileType], [UploadDate], [UploadedByUserId]) VALUES (23, 23, N'https://cdn.nafadh.test/materials/lesson23.video', 1, '2025-12-15T10:00:00', 10);
INSERT INTO dbo.[NFD_TrainingMaterials] ([MaterialId], [LessonId], [FileUrl], [FileType], [UploadDate], [UploadedByUserId]) VALUES (24, 24, N'https://cdn.nafadh.test/materials/lesson24.document', 3, '2025-12-15T10:00:00', 10);
SET IDENTITY_INSERT dbo.[NFD_TrainingMaterials] OFF;


-- ==============================================================================
-- 5.4 TraineeModuleProgress
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_TraineeModuleProgresses] ON;
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (1, 1, 1, 2, '2026-03-10T00:00:00');
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (2, 1, 2, 2, '2026-03-10T00:00:00');
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (3, 1, 3, 2, '2026-03-10T00:00:00');
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (4, 2, 1, 2, '2026-01-20T00:00:00');
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (5, 2, 2, 1, NULL);
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (6, 2, 3, 0, NULL);
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (7, 7, 1, 2, '2026-01-20T00:00:00');
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (8, 7, 2, 1, NULL);
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (9, 7, 3, 0, NULL);
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (10, 3, 4, 2, '2026-03-10T00:00:00');
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (11, 3, 5, 2, '2026-03-10T00:00:00');
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (12, 3, 6, 2, '2026-03-10T00:00:00');
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (13, 4, 4, 2, '2026-01-20T00:00:00');
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (14, 4, 5, 1, NULL);
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (15, 4, 6, 0, NULL);
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (16, 8, 4, 2, '2026-01-20T00:00:00');
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (17, 8, 5, 1, NULL);
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (18, 8, 6, 0, NULL);
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (19, 5, 7, 2, '2026-01-20T00:00:00');
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (20, 5, 8, 1, NULL);
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (21, 5, 9, 0, NULL);
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (22, 6, 7, 2, '2026-01-20T00:00:00');
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (23, 6, 8, 1, NULL);
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (24, 6, 9, 0, NULL);
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (25, 9, 7, 2, '2026-01-20T00:00:00');
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (26, 9, 8, 1, NULL);
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (27, 9, 9, 0, NULL);
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (28, 10, 10, 2, '2026-01-20T00:00:00');
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (29, 10, 11, 1, NULL);
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (30, 10, 12, 0, NULL);
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (31, 1, 10, 2, '2026-01-20T00:00:00');
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (32, 1, 11, 1, NULL);
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (33, 1, 12, 0, NULL);
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (34, 5, 10, 2, '2026-01-20T00:00:00');
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (35, 5, 11, 1, NULL);
INSERT INTO dbo.[NFD_TraineeModuleProgresses] ([ProgressId], [TraineeId], [ModuleId], [Status], [CompletedAt]) VALUES (36, 5, 12, 0, NULL);
SET IDENTITY_INSERT dbo.[NFD_TraineeModuleProgresses] OFF;


-- ==============================================================================
-- 6.1 Sessions
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_Sessions] ON;
INSERT INTO dbo.[NFD_Sessions] ([SessionId], [BatchId], [TrainerId], [SessionDate], [StartTime], [EndTime], [MeetingLink], [Topic], [LearningObjectives], [RecordingUrl], [Summary], [Status]) VALUES (1, 1, 1, '2026-01-11', N'09:00 AM', N'12:00 PM', N'https://meet.nafadh.test/session1', N'Introduction & Environment Setup', N'By the end of this session, trainees will understand: introduction & environment setup.', N'https://cdn.nafadh.test/recordings/session1.mp4', N'Session covered introduction & environment setup with hands-on exercises.', 1);
INSERT INTO dbo.[NFD_Sessions] ([SessionId], [BatchId], [TrainerId], [SessionDate], [StartTime], [EndTime], [MeetingLink], [Topic], [LearningObjectives], [RecordingUrl], [Summary], [Status]) VALUES (2, 1, 1, '2026-01-13', N'09:00 AM', N'12:00 PM', N'https://meet.nafadh.test/session2', N'Building Your First API', N'By the end of this session, trainees will understand: building your first api.', N'https://cdn.nafadh.test/recordings/session2.mp4', N'Session covered building your first api with hands-on exercises.', 1);
INSERT INTO dbo.[NFD_Sessions] ([SessionId], [BatchId], [TrainerId], [SessionDate], [StartTime], [EndTime], [MeetingLink], [Topic], [LearningObjectives], [RecordingUrl], [Summary], [Status]) VALUES (3, 2, 1, '2026-01-12', N'01:00 PM', N'04:00 PM', N'https://meet.nafadh.test/session3', N'C# Syntax Deep Dive', N'By the end of this session, trainees will understand: c# syntax deep dive.', N'https://cdn.nafadh.test/recordings/session3.mp4', N'Session covered c# syntax deep dive with hands-on exercises.', 1);
INSERT INTO dbo.[NFD_Sessions] ([SessionId], [BatchId], [TrainerId], [SessionDate], [StartTime], [EndTime], [MeetingLink], [Topic], [LearningObjectives], [RecordingUrl], [Summary], [Status]) VALUES (4, 2, 1, '2026-01-14', N'01:00 PM', N'04:00 PM', N'https://meet.nafadh.test/session4', N'Object-Oriented Programming', N'By the end of this session, trainees will understand: object-oriented programming.', N'https://cdn.nafadh.test/recordings/session4.mp4', N'Session covered object-oriented programming with hands-on exercises.', 1);
INSERT INTO dbo.[NFD_Sessions] ([SessionId], [BatchId], [TrainerId], [SessionDate], [StartTime], [EndTime], [MeetingLink], [Topic], [LearningObjectives], [RecordingUrl], [Summary], [Status]) VALUES (5, 3, 2, '2026-01-18', N'09:00 AM', N'12:00 PM', N'https://meet.nafadh.test/session5', N'Angular CLI & Components', N'By the end of this session, trainees will understand: angular cli & components.', N'https://cdn.nafadh.test/recordings/session5.mp4', N'Session covered angular cli & components with hands-on exercises.', 1);
INSERT INTO dbo.[NFD_Sessions] ([SessionId], [BatchId], [TrainerId], [SessionDate], [StartTime], [EndTime], [MeetingLink], [Topic], [LearningObjectives], [RecordingUrl], [Summary], [Status]) VALUES (6, 3, 2, '2026-01-20', N'09:00 AM', N'12:00 PM', N'https://meet.nafadh.test/session6', N'Services & Dependency Injection', N'By the end of this session, trainees will understand: services & dependency injection.', N'https://cdn.nafadh.test/recordings/session6.mp4', N'Session covered services & dependency injection with hands-on exercises.', 1);
INSERT INTO dbo.[NFD_Sessions] ([SessionId], [BatchId], [TrainerId], [SessionDate], [StartTime], [EndTime], [MeetingLink], [Topic], [LearningObjectives], [RecordingUrl], [Summary], [Status]) VALUES (7, 4, 3, '2026-02-01', N'10:00 AM', N'01:00 PM', N'https://meet.nafadh.test/session7', N'Design Thinking Workshop', N'By the end of this session, trainees will understand: design thinking workshop.', NULL, NULL, 0);
INSERT INTO dbo.[NFD_Sessions] ([SessionId], [BatchId], [TrainerId], [SessionDate], [StartTime], [EndTime], [MeetingLink], [Topic], [LearningObjectives], [RecordingUrl], [Summary], [Status]) VALUES (8, 4, 3, '2026-02-03', N'10:00 AM', N'01:00 PM', N'https://meet.nafadh.test/session8', N'Wireframing Lab', N'By the end of this session, trainees will understand: wireframing lab.', NULL, NULL, 0);
SET IDENTITY_INSERT dbo.[NFD_Sessions] OFF;


-- ==============================================================================
-- 6.2 SessionAttendance
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_SessionAttendances] ON;
INSERT INTO dbo.[NFD_SessionAttendances] ([AttendanceId], [SessionId], [TraineeId], [Status], [Note]) VALUES (1, 1, 1, 0, NULL);
INSERT INTO dbo.[NFD_SessionAttendances] ([AttendanceId], [SessionId], [TraineeId], [Status], [Note]) VALUES (2, 1, 2, 0, NULL);
INSERT INTO dbo.[NFD_SessionAttendances] ([AttendanceId], [SessionId], [TraineeId], [Status], [Note]) VALUES (3, 1, 7, 0, NULL);
INSERT INTO dbo.[NFD_SessionAttendances] ([AttendanceId], [SessionId], [TraineeId], [Status], [Note]) VALUES (4, 2, 1, 0, NULL);
INSERT INTO dbo.[NFD_SessionAttendances] ([AttendanceId], [SessionId], [TraineeId], [Status], [Note]) VALUES (5, 2, 2, 2, N'Arrived 15 minutes late.');
INSERT INTO dbo.[NFD_SessionAttendances] ([AttendanceId], [SessionId], [TraineeId], [Status], [Note]) VALUES (6, 2, 7, 0, NULL);
INSERT INTO dbo.[NFD_SessionAttendances] ([AttendanceId], [SessionId], [TraineeId], [Status], [Note]) VALUES (7, 3, 3, 0, NULL);
INSERT INTO dbo.[NFD_SessionAttendances] ([AttendanceId], [SessionId], [TraineeId], [Status], [Note]) VALUES (8, 3, 4, 0, NULL);
INSERT INTO dbo.[NFD_SessionAttendances] ([AttendanceId], [SessionId], [TraineeId], [Status], [Note]) VALUES (9, 3, 8, 0, NULL);
INSERT INTO dbo.[NFD_SessionAttendances] ([AttendanceId], [SessionId], [TraineeId], [Status], [Note]) VALUES (10, 4, 3, 0, NULL);
INSERT INTO dbo.[NFD_SessionAttendances] ([AttendanceId], [SessionId], [TraineeId], [Status], [Note]) VALUES (11, 4, 4, 0, NULL);
INSERT INTO dbo.[NFD_SessionAttendances] ([AttendanceId], [SessionId], [TraineeId], [Status], [Note]) VALUES (12, 4, 8, 0, NULL);
INSERT INTO dbo.[NFD_SessionAttendances] ([AttendanceId], [SessionId], [TraineeId], [Status], [Note]) VALUES (13, 5, 5, 0, NULL);
INSERT INTO dbo.[NFD_SessionAttendances] ([AttendanceId], [SessionId], [TraineeId], [Status], [Note]) VALUES (14, 5, 6, 0, NULL);
INSERT INTO dbo.[NFD_SessionAttendances] ([AttendanceId], [SessionId], [TraineeId], [Status], [Note]) VALUES (15, 5, 9, 0, NULL);
INSERT INTO dbo.[NFD_SessionAttendances] ([AttendanceId], [SessionId], [TraineeId], [Status], [Note]) VALUES (16, 6, 5, 0, NULL);
INSERT INTO dbo.[NFD_SessionAttendances] ([AttendanceId], [SessionId], [TraineeId], [Status], [Note]) VALUES (17, 6, 6, 0, NULL);
INSERT INTO dbo.[NFD_SessionAttendances] ([AttendanceId], [SessionId], [TraineeId], [Status], [Note]) VALUES (18, 6, 9, 1, N'Notified trainer in advance.');
SET IDENTITY_INSERT dbo.[NFD_SessionAttendances] OFF;


-- ==============================================================================
-- 6.3 DailyAttendance
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_DailyAttendances] ON;
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (1, 1, '2026-01-11', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (2, 1, '2026-01-12', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (3, 1, '2026-01-13', N'08:00 AM', N'04:00 PM', 2, 1, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (4, 1, '2026-01-14', NULL, NULL, 1, 0, N'No check-in recorded.');
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (5, 1, '2026-01-15', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (6, 2, '2026-01-11', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (7, 2, '2026-01-12', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (8, 2, '2026-01-13', N'08:00 AM', N'04:00 PM', 2, 1, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (9, 2, '2026-01-14', NULL, NULL, 1, 0, N'No check-in recorded.');
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (10, 2, '2026-01-15', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (11, 3, '2026-01-11', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (12, 3, '2026-01-12', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (13, 3, '2026-01-13', N'08:00 AM', N'04:00 PM', 2, 1, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (14, 3, '2026-01-14', NULL, NULL, 1, 0, N'No check-in recorded.');
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (15, 3, '2026-01-15', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (16, 4, '2026-01-11', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (17, 4, '2026-01-12', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (18, 4, '2026-01-13', N'08:00 AM', N'04:00 PM', 2, 1, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (19, 4, '2026-01-14', NULL, NULL, 1, 0, N'No check-in recorded.');
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (20, 4, '2026-01-15', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (21, 5, '2026-01-11', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (22, 5, '2026-01-12', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (23, 5, '2026-01-13', N'08:00 AM', N'04:00 PM', 2, 1, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (24, 5, '2026-01-14', NULL, NULL, 1, 0, N'No check-in recorded.');
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (25, 5, '2026-01-15', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (26, 6, '2026-01-11', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (27, 6, '2026-01-12', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (28, 6, '2026-01-13', N'08:00 AM', N'04:00 PM', 2, 1, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (29, 6, '2026-01-14', NULL, NULL, 1, 0, N'No check-in recorded.');
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (30, 6, '2026-01-15', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (31, 7, '2026-01-18', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (32, 7, '2026-01-19', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (33, 7, '2026-01-20', N'08:00 AM', N'04:00 PM', 2, 1, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (34, 7, '2026-01-21', NULL, NULL, 1, 0, N'No check-in recorded.');
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (35, 7, '2026-01-22', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (36, 8, '2026-01-18', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (37, 8, '2026-01-19', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (38, 8, '2026-01-20', N'08:00 AM', N'04:00 PM', 2, 1, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (39, 8, '2026-01-21', NULL, NULL, 1, 0, N'No check-in recorded.');
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (40, 8, '2026-01-22', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (41, 9, '2026-01-18', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (42, 9, '2026-01-19', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (43, 9, '2026-01-20', N'08:00 AM', N'04:00 PM', 2, 1, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (44, 9, '2026-01-21', NULL, NULL, 1, 0, N'No check-in recorded.');
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (45, 9, '2026-01-22', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (46, 10, '2026-02-01', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (47, 10, '2026-02-02', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (48, 10, '2026-02-03', N'08:00 AM', N'04:00 PM', 2, 1, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (49, 10, '2026-02-04', NULL, NULL, 1, 0, N'No check-in recorded.');
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (50, 10, '2026-02-05', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (51, 11, '2026-02-01', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (52, 11, '2026-02-02', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (53, 11, '2026-02-03', N'08:00 AM', N'04:00 PM', 2, 1, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (54, 11, '2026-02-04', NULL, NULL, 1, 0, N'No check-in recorded.');
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (55, 11, '2026-02-05', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (56, 12, '2026-02-01', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (57, 12, '2026-02-02', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (58, 12, '2026-02-03', N'08:00 AM', N'04:00 PM', 2, 1, NULL);
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (59, 12, '2026-02-04', NULL, NULL, 1, 0, N'No check-in recorded.');
INSERT INTO dbo.[NFD_DailyAttendances] ([DailyAttendanceId], [EnrollmentId], [Date], [CheckInTime], [CheckOutTime], [Status], [IsLate], [Note]) VALUES (60, 12, '2026-02-05', N'08:00 AM', N'04:00 PM', 0, 0, NULL);
SET IDENTITY_INSERT dbo.[NFD_DailyAttendances] OFF;


-- ==============================================================================
-- 6.4 Excuses
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_Excuses] ON;
INSERT INTO dbo.[NFD_Excuses] ([ExcuseId], [DailyAttendanceId], [Reason], [ProofUrl], [Status], [ReviewedByUserId]) VALUES (1, 14, N'Medical appointment - doctor''s note attached.', N'https://cdn.nafadh.test/excuses/excuse1.pdf', 1, 1);
INSERT INTO dbo.[NFD_Excuses] ([ExcuseId], [DailyAttendanceId], [Reason], [ProofUrl], [Status], [ReviewedByUserId]) VALUES (2, 29, N'Family emergency.', N'https://cdn.nafadh.test/excuses/excuse2.pdf', 1, 1);
INSERT INTO dbo.[NFD_Excuses] ([ExcuseId], [DailyAttendanceId], [Reason], [ProofUrl], [Status], [ReviewedByUserId]) VALUES (3, 44, N'Public transport disruption.', N'https://cdn.nafadh.test/excuses/excuse3.pdf', 0, NULL);
INSERT INTO dbo.[NFD_Excuses] ([ExcuseId], [DailyAttendanceId], [Reason], [ProofUrl], [Status], [ReviewedByUserId]) VALUES (4, 59, N'Did not provide sufficient justification.', N'https://cdn.nafadh.test/excuses/excuse4.pdf', 2, 1);
SET IDENTITY_INSERT dbo.[NFD_Excuses] OFF;


-- ==============================================================================
-- 7.1 Tasks
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_Tasks] ON;
INSERT INTO dbo.[NFD_Tasks] ([TaskId], [BatchId], [Title], [Description], [DueDate], [Priority], [Status], [CreatedByUserId]) VALUES (1, 1, N'Build a Todo REST API', N'Deliverable: Build a Todo REST API. Submit your work via the trainee portal before the due date.', '2026-01-25', 2, 1, 8);
INSERT INTO dbo.[NFD_Tasks] ([TaskId], [BatchId], [Title], [Description], [DueDate], [Priority], [Status], [CreatedByUserId]) VALUES (2, 1, N'Add EF Core Migrations to the Todo API', N'Deliverable: Add EF Core Migrations to the Todo API. Submit your work via the trainee portal before the due date.', '2026-02-10', 1, 0, 8);
INSERT INTO dbo.[NFD_Tasks] ([TaskId], [BatchId], [Title], [Description], [DueDate], [Priority], [Status], [CreatedByUserId]) VALUES (3, 2, N'C# Console Calculator', N'Deliverable: C# Console Calculator. Submit your work via the trainee portal before the due date.', '2026-01-25', 1, 1, 8);
INSERT INTO dbo.[NFD_Tasks] ([TaskId], [BatchId], [Title], [Description], [DueDate], [Priority], [Status], [CreatedByUserId]) VALUES (4, 2, N'LINQ Practice Exercises', N'Deliverable: LINQ Practice Exercises. Submit your work via the trainee portal before the due date.', '2026-02-05', 1, 0, 8);
INSERT INTO dbo.[NFD_Tasks] ([TaskId], [BatchId], [Title], [Description], [DueDate], [Priority], [Status], [CreatedByUserId]) VALUES (5, 3, N'Build a Component Library', N'Deliverable: Build a Component Library. Submit your work via the trainee portal before the due date.', '2026-02-01', 2, 1, 9);
INSERT INTO dbo.[NFD_Tasks] ([TaskId], [BatchId], [Title], [Description], [DueDate], [Priority], [Status], [CreatedByUserId]) VALUES (6, 3, N'Implement Reactive Forms', N'Deliverable: Implement Reactive Forms. Submit your work via the trainee portal before the due date.', '2026-02-15', 1, 0, 9);
INSERT INTO dbo.[NFD_Tasks] ([TaskId], [BatchId], [Title], [Description], [DueDate], [Priority], [Status], [CreatedByUserId]) VALUES (7, 4, N'Wireframe a Mobile App Flow', N'Deliverable: Wireframe a Mobile App Flow. Submit your work via the trainee portal before the due date.', '2026-02-20', 1, 0, 10);
INSERT INTO dbo.[NFD_Tasks] ([TaskId], [BatchId], [Title], [Description], [DueDate], [Priority], [Status], [CreatedByUserId]) VALUES (8, 4, N'Conduct a Usability Test', N'Deliverable: Conduct a Usability Test. Submit your work via the trainee portal before the due date.', '2026-03-01', 0, 0, 10);
SET IDENTITY_INSERT dbo.[NFD_Tasks] OFF;


-- ==============================================================================
-- 7.2 Rubrics
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_Rubrics] ON;
INSERT INTO dbo.[NFD_Rubrics] ([RubricId], [TaskId], [Criterion], [Weight], [MaxScore]) VALUES (1, 1, N'Functionality', 60, 100);
INSERT INTO dbo.[NFD_Rubrics] ([RubricId], [TaskId], [Criterion], [Weight], [MaxScore]) VALUES (2, 1, N'Code Quality', 40, 100);
INSERT INTO dbo.[NFD_Rubrics] ([RubricId], [TaskId], [Criterion], [Weight], [MaxScore]) VALUES (3, 2, N'Migration Correctness', 50, 100);
INSERT INTO dbo.[NFD_Rubrics] ([RubricId], [TaskId], [Criterion], [Weight], [MaxScore]) VALUES (4, 2, N'Documentation', 50, 100);
INSERT INTO dbo.[NFD_Rubrics] ([RubricId], [TaskId], [Criterion], [Weight], [MaxScore]) VALUES (5, 3, N'Correct Output', 70, 100);
INSERT INTO dbo.[NFD_Rubrics] ([RubricId], [TaskId], [Criterion], [Weight], [MaxScore]) VALUES (6, 3, N'Code Style', 30, 100);
INSERT INTO dbo.[NFD_Rubrics] ([RubricId], [TaskId], [Criterion], [Weight], [MaxScore]) VALUES (7, 4, N'Query Correctness', 60, 100);
INSERT INTO dbo.[NFD_Rubrics] ([RubricId], [TaskId], [Criterion], [Weight], [MaxScore]) VALUES (8, 4, N'Performance', 40, 100);
INSERT INTO dbo.[NFD_Rubrics] ([RubricId], [TaskId], [Criterion], [Weight], [MaxScore]) VALUES (9, 5, N'Reusability', 50, 100);
INSERT INTO dbo.[NFD_Rubrics] ([RubricId], [TaskId], [Criterion], [Weight], [MaxScore]) VALUES (10, 5, N'Styling Consistency', 50, 100);
INSERT INTO dbo.[NFD_Rubrics] ([RubricId], [TaskId], [Criterion], [Weight], [MaxScore]) VALUES (11, 6, N'Validation Logic', 60, 100);
INSERT INTO dbo.[NFD_Rubrics] ([RubricId], [TaskId], [Criterion], [Weight], [MaxScore]) VALUES (12, 6, N'UX Feedback', 40, 100);
INSERT INTO dbo.[NFD_Rubrics] ([RubricId], [TaskId], [Criterion], [Weight], [MaxScore]) VALUES (13, 7, N'Flow Clarity', 60, 100);
INSERT INTO dbo.[NFD_Rubrics] ([RubricId], [TaskId], [Criterion], [Weight], [MaxScore]) VALUES (14, 7, N'Creativity', 40, 100);
INSERT INTO dbo.[NFD_Rubrics] ([RubricId], [TaskId], [Criterion], [Weight], [MaxScore]) VALUES (15, 8, N'Test Plan Quality', 50, 100);
INSERT INTO dbo.[NFD_Rubrics] ([RubricId], [TaskId], [Criterion], [Weight], [MaxScore]) VALUES (16, 8, N'Insights Reported', 50, 100);
SET IDENTITY_INSERT dbo.[NFD_Rubrics] OFF;


-- ==============================================================================
-- 7.3 Submissions
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_Submissions] ON;
INSERT INTO dbo.[NFD_Submissions] ([SubmissionId], [TaskId], [TraineeId], [FileUrl], [SubmittedAt], [Status], [Grade], [Feedback]) VALUES (1, 1, 1, N'https://cdn.nafadh.test/submissions/task1_trainee1.zip', '2026-01-24T18:00:00', 2, N'88', N'Good work, meets all requirements.');
INSERT INTO dbo.[NFD_Submissions] ([SubmissionId], [TaskId], [TraineeId], [FileUrl], [SubmittedAt], [Status], [Grade], [Feedback]) VALUES (2, 1, 2, N'https://cdn.nafadh.test/submissions/task1_trainee2.zip', '2026-01-24T18:00:00', 2, N'88', N'Good work, meets all requirements.');
INSERT INTO dbo.[NFD_Submissions] ([SubmissionId], [TaskId], [TraineeId], [FileUrl], [SubmittedAt], [Status], [Grade], [Feedback]) VALUES (3, 1, 7, N'https://cdn.nafadh.test/submissions/task1_trainee7.zip', '2026-01-24T18:00:00', 2, N'88', N'Good work, meets all requirements.');
INSERT INTO dbo.[NFD_Submissions] ([SubmissionId], [TaskId], [TraineeId], [FileUrl], [SubmittedAt], [Status], [Grade], [Feedback]) VALUES (4, 2, 1, N'https://cdn.nafadh.test/submissions/task2_trainee1.zip', '2026-01-24T18:00:00', 0, NULL, NULL);
INSERT INTO dbo.[NFD_Submissions] ([SubmissionId], [TaskId], [TraineeId], [FileUrl], [SubmittedAt], [Status], [Grade], [Feedback]) VALUES (5, 2, 2, N'https://cdn.nafadh.test/submissions/task2_trainee2.zip', '2026-01-24T18:00:00', 0, NULL, NULL);
INSERT INTO dbo.[NFD_Submissions] ([SubmissionId], [TaskId], [TraineeId], [FileUrl], [SubmittedAt], [Status], [Grade], [Feedback]) VALUES (6, 2, 7, N'https://cdn.nafadh.test/submissions/task2_trainee7.zip', '2026-01-24T18:00:00', 0, NULL, NULL);
INSERT INTO dbo.[NFD_Submissions] ([SubmissionId], [TaskId], [TraineeId], [FileUrl], [SubmittedAt], [Status], [Grade], [Feedback]) VALUES (7, 3, 3, N'https://cdn.nafadh.test/submissions/task3_trainee3.zip', '2026-01-24T18:00:00', 2, N'88', N'Good work, meets all requirements.');
INSERT INTO dbo.[NFD_Submissions] ([SubmissionId], [TaskId], [TraineeId], [FileUrl], [SubmittedAt], [Status], [Grade], [Feedback]) VALUES (8, 3, 4, N'https://cdn.nafadh.test/submissions/task3_trainee4.zip', '2026-01-24T18:00:00', 2, N'88', N'Good work, meets all requirements.');
INSERT INTO dbo.[NFD_Submissions] ([SubmissionId], [TaskId], [TraineeId], [FileUrl], [SubmittedAt], [Status], [Grade], [Feedback]) VALUES (9, 3, 8, N'https://cdn.nafadh.test/submissions/task3_trainee8.zip', '2026-01-24T18:00:00', 2, N'88', N'Good work, meets all requirements.');
INSERT INTO dbo.[NFD_Submissions] ([SubmissionId], [TaskId], [TraineeId], [FileUrl], [SubmittedAt], [Status], [Grade], [Feedback]) VALUES (10, 4, 3, N'https://cdn.nafadh.test/submissions/task4_trainee3.zip', '2026-01-24T18:00:00', 0, NULL, NULL);
INSERT INTO dbo.[NFD_Submissions] ([SubmissionId], [TaskId], [TraineeId], [FileUrl], [SubmittedAt], [Status], [Grade], [Feedback]) VALUES (11, 4, 4, N'https://cdn.nafadh.test/submissions/task4_trainee4.zip', '2026-01-24T18:00:00', 0, NULL, NULL);
INSERT INTO dbo.[NFD_Submissions] ([SubmissionId], [TaskId], [TraineeId], [FileUrl], [SubmittedAt], [Status], [Grade], [Feedback]) VALUES (12, 4, 8, N'https://cdn.nafadh.test/submissions/task4_trainee8.zip', '2026-01-24T18:00:00', 0, NULL, NULL);
INSERT INTO dbo.[NFD_Submissions] ([SubmissionId], [TaskId], [TraineeId], [FileUrl], [SubmittedAt], [Status], [Grade], [Feedback]) VALUES (13, 5, 5, N'https://cdn.nafadh.test/submissions/task5_trainee5.zip', '2026-01-24T18:00:00', 2, N'88', N'Good work, meets all requirements.');
INSERT INTO dbo.[NFD_Submissions] ([SubmissionId], [TaskId], [TraineeId], [FileUrl], [SubmittedAt], [Status], [Grade], [Feedback]) VALUES (14, 5, 6, N'https://cdn.nafadh.test/submissions/task5_trainee6.zip', '2026-01-24T18:00:00', 2, N'88', N'Good work, meets all requirements.');
INSERT INTO dbo.[NFD_Submissions] ([SubmissionId], [TaskId], [TraineeId], [FileUrl], [SubmittedAt], [Status], [Grade], [Feedback]) VALUES (15, 5, 9, N'https://cdn.nafadh.test/submissions/task5_trainee9.zip', '2026-01-24T18:00:00', 2, N'88', N'Good work, meets all requirements.');
INSERT INTO dbo.[NFD_Submissions] ([SubmissionId], [TaskId], [TraineeId], [FileUrl], [SubmittedAt], [Status], [Grade], [Feedback]) VALUES (16, 6, 5, N'https://cdn.nafadh.test/submissions/task6_trainee5.zip', '2026-01-24T18:00:00', 0, NULL, NULL);
INSERT INTO dbo.[NFD_Submissions] ([SubmissionId], [TaskId], [TraineeId], [FileUrl], [SubmittedAt], [Status], [Grade], [Feedback]) VALUES (17, 6, 6, N'https://cdn.nafadh.test/submissions/task6_trainee6.zip', '2026-01-24T18:00:00', 0, NULL, NULL);
INSERT INTO dbo.[NFD_Submissions] ([SubmissionId], [TaskId], [TraineeId], [FileUrl], [SubmittedAt], [Status], [Grade], [Feedback]) VALUES (18, 6, 9, N'https://cdn.nafadh.test/submissions/task6_trainee9.zip', '2026-01-24T18:00:00', 0, NULL, NULL);
INSERT INTO dbo.[NFD_Submissions] ([SubmissionId], [TaskId], [TraineeId], [FileUrl], [SubmittedAt], [Status], [Grade], [Feedback]) VALUES (19, 7, 10, N'https://cdn.nafadh.test/submissions/task7_trainee10.zip', '2026-01-24T18:00:00', 0, NULL, NULL);
INSERT INTO dbo.[NFD_Submissions] ([SubmissionId], [TaskId], [TraineeId], [FileUrl], [SubmittedAt], [Status], [Grade], [Feedback]) VALUES (20, 7, 1, N'https://cdn.nafadh.test/submissions/task7_trainee1.zip', '2026-01-24T18:00:00', 0, NULL, NULL);
INSERT INTO dbo.[NFD_Submissions] ([SubmissionId], [TaskId], [TraineeId], [FileUrl], [SubmittedAt], [Status], [Grade], [Feedback]) VALUES (21, 7, 5, N'https://cdn.nafadh.test/submissions/task7_trainee5.zip', '2026-01-24T18:00:00', 0, NULL, NULL);
INSERT INTO dbo.[NFD_Submissions] ([SubmissionId], [TaskId], [TraineeId], [FileUrl], [SubmittedAt], [Status], [Grade], [Feedback]) VALUES (22, 8, 10, N'https://cdn.nafadh.test/submissions/task8_trainee10.zip', '2026-01-24T18:00:00', 0, NULL, NULL);
INSERT INTO dbo.[NFD_Submissions] ([SubmissionId], [TaskId], [TraineeId], [FileUrl], [SubmittedAt], [Status], [Grade], [Feedback]) VALUES (23, 8, 1, N'https://cdn.nafadh.test/submissions/task8_trainee1.zip', '2026-01-24T18:00:00', 0, NULL, NULL);
INSERT INTO dbo.[NFD_Submissions] ([SubmissionId], [TaskId], [TraineeId], [FileUrl], [SubmittedAt], [Status], [Grade], [Feedback]) VALUES (24, 8, 5, N'https://cdn.nafadh.test/submissions/task8_trainee5.zip', '2026-01-24T18:00:00', 0, NULL, NULL);
SET IDENTITY_INSERT dbo.[NFD_Submissions] OFF;


-- ==============================================================================
-- 8.1 Projects
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_Projects] ON;
INSERT INTO dbo.[NFD_Projects] ([ProjectId], [ProgramId], [Title], [Description], [StartDate], [EndDate], [Status]) VALUES (1, 1, N'Capstone: Training Management Mini-API', N'Team capstone project applying the skills learned throughout the program.', '2026-03-01', '2026-03-19', 1);
INSERT INTO dbo.[NFD_Projects] ([ProjectId], [ProgramId], [Title], [Description], [StartDate], [EndDate], [Status]) VALUES (2, 2, N'Capstone: Console Inventory System', N'Team capstone project applying the skills learned throughout the program.', '2026-02-01', '2026-02-12', 2);
INSERT INTO dbo.[NFD_Projects] ([ProjectId], [ProgramId], [Title], [Description], [StartDate], [EndDate], [Status]) VALUES (3, 3, N'Capstone: Angular Dashboard App', N'Team capstone project applying the skills learned throughout the program.', '2026-03-05', '2026-03-26', 1);
INSERT INTO dbo.[NFD_Projects] ([ProjectId], [ProgramId], [Title], [Description], [StartDate], [EndDate], [Status]) VALUES (4, 4, N'Capstone: Mobile App Redesign', N'Team capstone project applying the skills learned throughout the program.', '2026-03-01', '2026-03-19', 0);
SET IDENTITY_INSERT dbo.[NFD_Projects] OFF;


-- ==============================================================================
-- 8.2 ProjectMembers
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_ProjectMembers] ON;
INSERT INTO dbo.[NFD_ProjectMembers] ([MemberId], [ProjectId], [TraineeId], [Role]) VALUES (1, 1, 1, 0);
INSERT INTO dbo.[NFD_ProjectMembers] ([MemberId], [ProjectId], [TraineeId], [Role]) VALUES (2, 1, 2, 1);
INSERT INTO dbo.[NFD_ProjectMembers] ([MemberId], [ProjectId], [TraineeId], [Role]) VALUES (3, 1, 7, 1);
INSERT INTO dbo.[NFD_ProjectMembers] ([MemberId], [ProjectId], [TraineeId], [Role]) VALUES (4, 2, 3, 0);
INSERT INTO dbo.[NFD_ProjectMembers] ([MemberId], [ProjectId], [TraineeId], [Role]) VALUES (5, 2, 4, 1);
INSERT INTO dbo.[NFD_ProjectMembers] ([MemberId], [ProjectId], [TraineeId], [Role]) VALUES (6, 2, 8, 1);
INSERT INTO dbo.[NFD_ProjectMembers] ([MemberId], [ProjectId], [TraineeId], [Role]) VALUES (7, 3, 5, 0);
INSERT INTO dbo.[NFD_ProjectMembers] ([MemberId], [ProjectId], [TraineeId], [Role]) VALUES (8, 3, 6, 1);
INSERT INTO dbo.[NFD_ProjectMembers] ([MemberId], [ProjectId], [TraineeId], [Role]) VALUES (9, 3, 9, 1);
INSERT INTO dbo.[NFD_ProjectMembers] ([MemberId], [ProjectId], [TraineeId], [Role]) VALUES (10, 4, 10, 0);
INSERT INTO dbo.[NFD_ProjectMembers] ([MemberId], [ProjectId], [TraineeId], [Role]) VALUES (11, 4, 1, 1);
INSERT INTO dbo.[NFD_ProjectMembers] ([MemberId], [ProjectId], [TraineeId], [Role]) VALUES (12, 4, 5, 1);
SET IDENTITY_INSERT dbo.[NFD_ProjectMembers] OFF;


-- ==============================================================================
-- 9.1 EvaluationTemplates
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_EvaluationTemplates] ON;
INSERT INTO dbo.[NFD_EvaluationTemplates] ([TemplateId], [Type], [CreatedByUserId]) VALUES (1, 0, 1);
INSERT INTO dbo.[NFD_EvaluationTemplates] ([TemplateId], [Type], [CreatedByUserId]) VALUES (2, 1, 1);
INSERT INTO dbo.[NFD_EvaluationTemplates] ([TemplateId], [Type], [CreatedByUserId]) VALUES (3, 4, 1);
SET IDENTITY_INSERT dbo.[NFD_EvaluationTemplates] OFF;


-- ==============================================================================
-- 9.2 EvaluationCriteria
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_EvaluationCriteria] ON;
INSERT INTO dbo.[NFD_EvaluationCriteria] ([CriteriaId], [TemplateId], [Name], [Weight]) VALUES (1, 1, N'Code Quality', 40);
INSERT INTO dbo.[NFD_EvaluationCriteria] ([CriteriaId], [TemplateId], [Name], [Weight]) VALUES (2, 1, N'Problem Solving', 30);
INSERT INTO dbo.[NFD_EvaluationCriteria] ([CriteriaId], [TemplateId], [Name], [Weight]) VALUES (3, 1, N'Best Practices', 30);
INSERT INTO dbo.[NFD_EvaluationCriteria] ([CriteriaId], [TemplateId], [Name], [Weight]) VALUES (4, 2, N'Communication', 40);
INSERT INTO dbo.[NFD_EvaluationCriteria] ([CriteriaId], [TemplateId], [Name], [Weight]) VALUES (5, 2, N'Teamwork', 30);
INSERT INTO dbo.[NFD_EvaluationCriteria] ([CriteriaId], [TemplateId], [Name], [Weight]) VALUES (6, 2, N'Commitment', 30);
INSERT INTO dbo.[NFD_EvaluationCriteria] ([CriteriaId], [TemplateId], [Name], [Weight]) VALUES (7, 3, N'Content Delivery', 40);
INSERT INTO dbo.[NFD_EvaluationCriteria] ([CriteriaId], [TemplateId], [Name], [Weight]) VALUES (8, 3, N'Engagement', 30);
INSERT INTO dbo.[NFD_EvaluationCriteria] ([CriteriaId], [TemplateId], [Name], [Weight]) VALUES (9, 3, N'Punctuality', 30);
SET IDENTITY_INSERT dbo.[NFD_EvaluationCriteria] OFF;


-- ==============================================================================
-- 9.3 Evaluations
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_Evaluations] ON;
INSERT INTO dbo.[NFD_Evaluations] ([EvaluationId], [EnrollmentId], [TrainerId], [TemplateId], [EvaluatorUserId], [Period], [Score], [Notes], [EvaluationDate]) VALUES (1, 1, NULL, 1, 8, 3, 92, N'Excellent grasp of backend concepts.', '2026-03-15T00:00:00');
INSERT INTO dbo.[NFD_Evaluations] ([EvaluationId], [EnrollmentId], [TrainerId], [TemplateId], [EvaluatorUserId], [Period], [Score], [Notes], [EvaluationDate]) VALUES (2, 2, NULL, 1, 8, 2, 78, N'Good progress, needs more API design practice.', '2026-02-10T00:00:00');
INSERT INTO dbo.[NFD_Evaluations] ([EvaluationId], [EnrollmentId], [TrainerId], [TemplateId], [EvaluatorUserId], [Period], [Score], [Notes], [EvaluationDate]) VALUES (3, 4, NULL, 1, 8, 3, 88, N'Strong fundamentals.', '2026-02-11T00:00:00');
INSERT INTO dbo.[NFD_Evaluations] ([EvaluationId], [EnrollmentId], [TrainerId], [TemplateId], [EvaluatorUserId], [Period], [Score], [Notes], [EvaluationDate]) VALUES (4, 7, NULL, 1, 9, 2, 81, N'Solid Angular component structure.', '2026-02-15T00:00:00');
INSERT INTO dbo.[NFD_Evaluations] ([EvaluationId], [EnrollmentId], [TrainerId], [TemplateId], [EvaluatorUserId], [Period], [Score], [Notes], [EvaluationDate]) VALUES (5, 2, NULL, 2, 5, 2, 85, N'Communicates well with the team.', '2026-02-10T00:00:00');
INSERT INTO dbo.[NFD_Evaluations] ([EvaluationId], [EnrollmentId], [TrainerId], [TemplateId], [EvaluatorUserId], [Period], [Score], [Notes], [EvaluationDate]) VALUES (6, 5, NULL, 2, 6, 2, 74, N'Needs to speak up more in stand-ups.', '2026-02-10T00:00:00');
INSERT INTO dbo.[NFD_Evaluations] ([EvaluationId], [EnrollmentId], [TrainerId], [TemplateId], [EvaluatorUserId], [Period], [Score], [Notes], [EvaluationDate]) VALUES (7, NULL, 1, 3, 1, 3, 90, N'Consistently high trainee satisfaction.', '2026-03-19T00:00:00');
INSERT INTO dbo.[NFD_Evaluations] ([EvaluationId], [EnrollmentId], [TrainerId], [TemplateId], [EvaluatorUserId], [Period], [Score], [Notes], [EvaluationDate]) VALUES (8, NULL, 2, 3, 1, 3, 87, N'Strong delivery, minor pacing issues.', '2026-03-19T00:00:00');
INSERT INTO dbo.[NFD_Evaluations] ([EvaluationId], [EnrollmentId], [TrainerId], [TemplateId], [EvaluatorUserId], [Period], [Score], [Notes], [EvaluationDate]) VALUES (9, NULL, 3, 3, 1, 3, 84, N'Good engagement, room to grow.', '2026-03-19T00:00:00');
SET IDENTITY_INSERT dbo.[NFD_Evaluations] OFF;


-- ==============================================================================
-- 10.1 Warnings
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_Warnings] ON;
INSERT INTO dbo.[NFD_Warnings] ([WarningId], [EnrollmentId], [RaisedByUserId], [Type], [Level], [Evidence], [Status], [Resolution], [IssuedDate]) VALUES (1, 3, 8, 0, 1, N'Missed check-in on 2026-01-14 without prior notice.', 1, NULL, '2026-01-15T00:00:00');
INSERT INTO dbo.[NFD_Warnings] ([WarningId], [EnrollmentId], [RaisedByUserId], [Type], [Level], [Evidence], [Status], [Resolution], [IssuedDate]) VALUES (2, 6, 9, 1, 0, N'Late submission of C# Console Calculator task.', 2, N'Trainee submitted a revised task and improved subsequent performance.', '2026-01-27T00:00:00');
INSERT INTO dbo.[NFD_Warnings] ([WarningId], [EnrollmentId], [RaisedByUserId], [Type], [Level], [Evidence], [Status], [Resolution], [IssuedDate]) VALUES (3, 9, 2, 0, 2, N'Repeated absences during weeks 2-3 of the batch.', 3, NULL, '2026-01-25T00:00:00');
SET IDENTITY_INSERT dbo.[NFD_Warnings] OFF;


-- ==============================================================================
-- 10.2 SupportTickets
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_SupportTickets] ON;
INSERT INTO dbo.[NFD_SupportTickets] ([TicketId], [UserId], [Subject], [Message], [Status], [CreatedAt]) VALUES (1, 11, N'Cannot access session recording', N'The recording link for session 2 returns a 404 error.', 2, '2026-01-14T10:00:00');
INSERT INTO dbo.[NFD_SupportTickets] ([TicketId], [UserId], [Subject], [Message], [Status], [CreatedAt]) VALUES (2, 14, N'Question about task deadline', N'Can the LINQ Practice Exercises deadline be extended by 2 days?', 0, '2026-02-03T09:00:00');
INSERT INTO dbo.[NFD_SupportTickets] ([TicketId], [UserId], [Subject], [Message], [Status], [CreatedAt]) VALUES (3, 5, N'Need help adding a new department', N'How do I add a new department for our company?', 3, '2025-12-10T11:00:00');
INSERT INTO dbo.[NFD_SupportTickets] ([TicketId], [UserId], [Subject], [Message], [Status], [CreatedAt]) VALUES (4, 8, N'Payroll question for training stipend', N'When are trainer payments processed each month?', 1, '2026-01-20T14:00:00');
SET IDENTITY_INSERT dbo.[NFD_SupportTickets] OFF;


-- ==============================================================================
-- 11.1 Notifications
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_Notifications] ON;
INSERT INTO dbo.[NFD_Notifications] ([NotificationId], [UserId], [Title], [Message], [RelatedEntity], [IsRead], [CreatedAt]) VALUES (1, 11, N'Task Graded', N'Your submission for ''Build a Todo REST API'' has been graded: 88/100.', N'Submission', 1, '2026-01-26T09:00:00');
INSERT INTO dbo.[NFD_Notifications] ([NotificationId], [UserId], [Title], [Message], [RelatedEntity], [IsRead], [CreatedAt]) VALUES (2, 12, N'Warning Issued', N'A warning has been raised on your enrollment. Please check your dashboard.', N'Warning', 0, '2026-01-25T10:00:00');
INSERT INTO dbo.[NFD_Notifications] ([NotificationId], [UserId], [Title], [Message], [RelatedEntity], [IsRead], [CreatedAt]) VALUES (3, 13, N'New Session Scheduled', N'A new session ''Angular CLI & Components'' has been scheduled.', N'Session', 1, '2026-01-16T08:00:00');
INSERT INTO dbo.[NFD_Notifications] ([NotificationId], [UserId], [Title], [Message], [RelatedEntity], [IsRead], [CreatedAt]) VALUES (4, 14, N'Task Due Soon', N'''LINQ Practice Exercises'' is due in 2 days.', N'Task', 0, '2026-02-03T08:00:00');
INSERT INTO dbo.[NFD_Notifications] ([NotificationId], [UserId], [Title], [Message], [RelatedEntity], [IsRead], [CreatedAt]) VALUES (5, 15, N'Evaluation Posted', N'Your midterm evaluation has been posted. Score: 85/100.', N'Evaluation', 1, '2026-02-10T12:00:00');
INSERT INTO dbo.[NFD_Notifications] ([NotificationId], [UserId], [Title], [Message], [RelatedEntity], [IsRead], [CreatedAt]) VALUES (6, 16, N'Attendance Reminder', N'You have an unexcused absence recorded on 2026-01-14.', N'DailyAttendance', 0, '2026-01-15T09:00:00');
INSERT INTO dbo.[NFD_Notifications] ([NotificationId], [UserId], [Title], [Message], [RelatedEntity], [IsRead], [CreatedAt]) VALUES (7, 17, N'Warning Escalated', N'A warning on your enrollment has been escalated to the Authority.', N'Warning', 0, '2026-01-25T11:00:00');
INSERT INTO dbo.[NFD_Notifications] ([NotificationId], [UserId], [Title], [Message], [RelatedEntity], [IsRead], [CreatedAt]) VALUES (8, 18, N'New Announcement', N'A new platform announcement has been published.', N'Announcement', 0, '2026-01-05T09:00:00');
INSERT INTO dbo.[NFD_Notifications] ([NotificationId], [UserId], [Title], [Message], [RelatedEntity], [IsRead], [CreatedAt]) VALUES (9, 19, N'Certificate Issued', N'Congratulations! Your certificate is ready to download.', N'Certificate', 0, '2026-03-20T10:00:00');
INSERT INTO dbo.[NFD_Notifications] ([NotificationId], [UserId], [Title], [Message], [RelatedEntity], [IsRead], [CreatedAt]) VALUES (10, 20, N'Task Due Soon', N'''Conduct a Usability Test'' is due soon.', N'Task', 0, '2026-02-25T08:00:00');
INSERT INTO dbo.[NFD_Notifications] ([NotificationId], [UserId], [Title], [Message], [RelatedEntity], [IsRead], [CreatedAt]) VALUES (11, 1, N'New Support Ticket', N'A new support ticket has been opened by Nasser Al-Kindi.', N'SupportTicket', 0, '2026-02-03T09:05:00');
INSERT INTO dbo.[NFD_Notifications] ([NotificationId], [UserId], [Title], [Message], [RelatedEntity], [IsRead], [CreatedAt]) VALUES (12, 5, N'Excuse Submitted', N'A trainee submitted an excuse request pending your review.', N'Excuse', 0, '2026-01-22T10:00:00');
INSERT INTO dbo.[NFD_Notifications] ([NotificationId], [UserId], [Title], [Message], [RelatedEntity], [IsRead], [CreatedAt]) VALUES (13, 8, N'New Message', N'You have received a new message from a trainee.', N'Message', 1, '2026-01-20T15:00:00');
INSERT INTO dbo.[NFD_Notifications] ([NotificationId], [UserId], [Title], [Message], [RelatedEntity], [IsRead], [CreatedAt]) VALUES (14, 2, N'Payment Reminder', N'Your February installment is due in 3 days.', N'TraineePaymentSchedule', 0, '2026-02-25T08:00:00');
INSERT INTO dbo.[NFD_Notifications] ([NotificationId], [UserId], [Title], [Message], [RelatedEntity], [IsRead], [CreatedAt]) VALUES (15, 1, N'Company Pending Approval', N'Bright Path Consulting is awaiting approval.', N'Company', 0, '2025-09-06T08:00:00');
SET IDENTITY_INSERT dbo.[NFD_Notifications] OFF;


-- ==============================================================================
-- 11.2 Announcements
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_Announcements] ON;
INSERT INTO dbo.[NFD_Announcements] ([AnnouncementId], [ScopeType], [ScopeId], [CreatedByUserId], [Message], [Date]) VALUES (1, 0, NULL, 1, N'Welcome to the Nafadh training platform! Please complete your profile.', '2025-09-01T08:00:00');
INSERT INTO dbo.[NFD_Announcements] ([AnnouncementId], [ScopeType], [ScopeId], [CreatedByUserId], [Message], [Date]) VALUES (2, 2, 1, 1, N'Reminder: the ASP.NET Core Bootcamp mid-program survey closes this Friday.', '2026-02-05T08:00:00');
INSERT INTO dbo.[NFD_Announcements] ([AnnouncementId], [ScopeType], [ScopeId], [CreatedByUserId], [Message], [Date]) VALUES (3, 1, 1, 1, N'Gulf Tech Solutions: new department ''Quality Assurance'' has been added.', '2025-11-01T08:00:00');
SET IDENTITY_INSERT dbo.[NFD_Announcements] OFF;


-- ==============================================================================
-- 11.3 Messages
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_Messages] ON;
INSERT INTO dbo.[NFD_Messages] ([MessageId], [SenderId], [ReceiverId], [Content], [SentDate], [Status]) VALUES (1, 11, 8, N'Hi, could you clarify the requirements for the Todo API task?', '2026-01-20T14:00:00', 2);
INSERT INTO dbo.[NFD_Messages] ([MessageId], [SenderId], [ReceiverId], [Content], [SentDate], [Status]) VALUES (2, 8, 11, N'Sure - you need CRUD endpoints plus basic validation. I''ll share an example.', '2026-01-20T14:15:00', 2);
INSERT INTO dbo.[NFD_Messages] ([MessageId], [SenderId], [ReceiverId], [Content], [SentDate], [Status]) VALUES (3, 12, 5, N'Could I get an extension on my daily check-in today? Running late.', '2026-01-14T07:45:00', 2);
INSERT INTO dbo.[NFD_Messages] ([MessageId], [SenderId], [ReceiverId], [Content], [SentDate], [Status]) VALUES (4, 5, 12, N'Noted, please make sure to check in before 9am next time.', '2026-01-14T07:50:00', 2);
INSERT INTO dbo.[NFD_Messages] ([MessageId], [SenderId], [ReceiverId], [Content], [SentDate], [Status]) VALUES (5, 15, 9, N'I''m not sure how to structure the Angular services for the dashboard project.', '2026-02-20T10:00:00', 1);
INSERT INTO dbo.[NFD_Messages] ([MessageId], [SenderId], [ReceiverId], [Content], [SentDate], [Status]) VALUES (6, 19, 10, N'Do we need to submit a written report along with the usability test?', '2026-02-22T09:00:00', 0);
INSERT INTO dbo.[NFD_Messages] ([MessageId], [SenderId], [ReceiverId], [Content], [SentDate], [Status]) VALUES (7, 8, 1, N'Trainee Nasser Al-Kindi has an unexcused absence, flagging for review.', '2026-01-15T09:10:00', 2);
INSERT INTO dbo.[NFD_Messages] ([MessageId], [SenderId], [ReceiverId], [Content], [SentDate], [Status]) VALUES (8, 1, 8, N'Thanks for flagging - a warning has been logged.', '2026-01-15T09:20:00', 2);
INSERT INTO dbo.[NFD_Messages] ([MessageId], [SenderId], [ReceiverId], [Content], [SentDate], [Status]) VALUES (9, 6, 16, N'Please remember to submit your LINQ exercises by Thursday.', '2026-02-01T08:00:00', 1);
INSERT INTO dbo.[NFD_Messages] ([MessageId], [SenderId], [ReceiverId], [Content], [SentDate], [Status]) VALUES (10, 9, 13, N'Great progress on the components lab this week!', '2026-01-21T16:00:00', 2);
SET IDENTITY_INSERT dbo.[NFD_Messages] OFF;


-- ==============================================================================
-- 12.1 Certificates
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_Certificates] ON;
INSERT INTO dbo.[NFD_Certificates] ([CertificateId], [EnrollmentId], [Type], [IssueDate], [FileUrl]) VALUES (1, 1, 0, '2026-03-20', N'https://cdn.nafadh.test/certificates/certificate1.pdf');
INSERT INTO dbo.[NFD_Certificates] ([CertificateId], [EnrollmentId], [Type], [IssueDate], [FileUrl]) VALUES (2, 4, 2, '2026-02-13', N'https://cdn.nafadh.test/certificates/certificate2.pdf');
SET IDENTITY_INSERT dbo.[NFD_Certificates] OFF;


-- ==============================================================================
-- 12.2 Reports
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_Reports] ON;
INSERT INTO dbo.[NFD_Reports] ([ReportId], [Type], [GeneratedByUserId], [FiltersJson], [GeneratedAt], [FileUrl]) VALUES (1, 0, 1, N'{"batchId":1,"month":"2026-01"}', '2026-02-01T09:00:00', N'https://cdn.nafadh.test/reports/report1.pdf');
INSERT INTO dbo.[NFD_Reports] ([ReportId], [Type], [GeneratedByUserId], [FiltersJson], [GeneratedAt], [FileUrl]) VALUES (2, 1, 1, N'{"programId":1}', '2026-03-21T09:00:00', N'https://cdn.nafadh.test/reports/report2.pdf');
INSERT INTO dbo.[NFD_Reports] ([ReportId], [Type], [GeneratedByUserId], [FiltersJson], [GeneratedAt], [FileUrl]) VALUES (3, 2, 1, N'{"quarter":"2026-Q1"}', '2026-03-31T09:00:00', N'https://cdn.nafadh.test/reports/report3.pdf');
SET IDENTITY_INSERT dbo.[NFD_Reports] OFF;


-- ==============================================================================
-- 13.1 SystemSettings
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_SystemSettings] ON;
INSERT INTO dbo.[NFD_SystemSettings] ([SettingId], [Key], [Value], [Description]) VALUES (1, N'MaxTraineesPerBatch', N'30', N'Maximum number of trainees allowed per batch.');
INSERT INTO dbo.[NFD_SystemSettings] ([SettingId], [Key], [Value], [Description]) VALUES (2, N'DefaultCurrency', N'OMR', N'Default currency used across payment records.');
INSERT INTO dbo.[NFD_SystemSettings] ([SettingId], [Key], [Value], [Description]) VALUES (3, N'SupportEmail', N'support@nafadh.om', N'Primary contact email shown in the support portal.');
INSERT INTO dbo.[NFD_SystemSettings] ([SettingId], [Key], [Value], [Description]) VALUES (4, N'AttendanceGraceMinutes', N'15', N'Grace period before a check-in is marked late.');
INSERT INTO dbo.[NFD_SystemSettings] ([SettingId], [Key], [Value], [Description]) VALUES (5, N'CertificateTemplateVersion', N'v1', N'Active certificate template version.');
SET IDENTITY_INSERT dbo.[NFD_SystemSettings] OFF;


-- ==============================================================================
-- 14.1 TraineePayments
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_TraineePayments] ON;
INSERT INTO dbo.[NFD_TraineePayments] ([TraineePaymentId], [EnrollmentId], [TotalAmount], [Status]) VALUES (1, 1, 650.0, 2);
INSERT INTO dbo.[NFD_TraineePayments] ([TraineePaymentId], [EnrollmentId], [TotalAmount], [Status]) VALUES (2, 2, 650.0, 1);
INSERT INTO dbo.[NFD_TraineePayments] ([TraineePaymentId], [EnrollmentId], [TotalAmount], [Status]) VALUES (3, 4, 350.0, 2);
INSERT INTO dbo.[NFD_TraineePayments] ([TraineePaymentId], [EnrollmentId], [TotalAmount], [Status]) VALUES (4, 5, 350.0, 1);
INSERT INTO dbo.[NFD_TraineePayments] ([TraineePaymentId], [EnrollmentId], [TotalAmount], [Status]) VALUES (5, 7, 600.0, 0);
INSERT INTO dbo.[NFD_TraineePayments] ([TraineePaymentId], [EnrollmentId], [TotalAmount], [Status]) VALUES (6, 10, 450.0, 0);
SET IDENTITY_INSERT dbo.[NFD_TraineePayments] OFF;


-- ==============================================================================
-- 14.2 TraineePaymentSchedules
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_TraineePaymentSchedules] ON;
INSERT INTO dbo.[NFD_TraineePaymentSchedules] ([ScheduleId], [TraineePaymentId], [MonthNumber], [MonthLabel], [DueDate], [Amount], [Status], [PaidDate]) VALUES (1, 1, N'1', N'January 2026', '2026-01-15', 216.67, 1, '2026-01-15');
INSERT INTO dbo.[NFD_TraineePaymentSchedules] ([ScheduleId], [TraineePaymentId], [MonthNumber], [MonthLabel], [DueDate], [Amount], [Status], [PaidDate]) VALUES (2, 1, N'2', N'February 2026', '2026-02-15', 216.67, 1, '2026-02-15');
INSERT INTO dbo.[NFD_TraineePaymentSchedules] ([ScheduleId], [TraineePaymentId], [MonthNumber], [MonthLabel], [DueDate], [Amount], [Status], [PaidDate]) VALUES (3, 1, N'3', N'March 2026', '2026-03-15', 216.67, 1, '2026-03-15');
INSERT INTO dbo.[NFD_TraineePaymentSchedules] ([ScheduleId], [TraineePaymentId], [MonthNumber], [MonthLabel], [DueDate], [Amount], [Status], [PaidDate]) VALUES (4, 2, N'1', N'January 2026', '2026-01-15', 216.67, 1, '2026-01-15');
INSERT INTO dbo.[NFD_TraineePaymentSchedules] ([ScheduleId], [TraineePaymentId], [MonthNumber], [MonthLabel], [DueDate], [Amount], [Status], [PaidDate]) VALUES (5, 2, N'2', N'February 2026', '2026-02-15', 216.67, 0, NULL);
INSERT INTO dbo.[NFD_TraineePaymentSchedules] ([ScheduleId], [TraineePaymentId], [MonthNumber], [MonthLabel], [DueDate], [Amount], [Status], [PaidDate]) VALUES (6, 2, N'3', N'March 2026', '2026-03-15', 216.67, 0, NULL);
INSERT INTO dbo.[NFD_TraineePaymentSchedules] ([ScheduleId], [TraineePaymentId], [MonthNumber], [MonthLabel], [DueDate], [Amount], [Status], [PaidDate]) VALUES (7, 3, N'1', N'January 2026', '2026-01-15', 116.67, 1, '2026-01-15');
INSERT INTO dbo.[NFD_TraineePaymentSchedules] ([ScheduleId], [TraineePaymentId], [MonthNumber], [MonthLabel], [DueDate], [Amount], [Status], [PaidDate]) VALUES (8, 3, N'2', N'February 2026', '2026-02-15', 116.67, 1, '2026-02-15');
INSERT INTO dbo.[NFD_TraineePaymentSchedules] ([ScheduleId], [TraineePaymentId], [MonthNumber], [MonthLabel], [DueDate], [Amount], [Status], [PaidDate]) VALUES (9, 3, N'3', N'March 2026', '2026-03-15', 116.67, 1, '2026-03-15');
INSERT INTO dbo.[NFD_TraineePaymentSchedules] ([ScheduleId], [TraineePaymentId], [MonthNumber], [MonthLabel], [DueDate], [Amount], [Status], [PaidDate]) VALUES (10, 4, N'1', N'January 2026', '2026-01-15', 116.67, 1, '2026-01-15');
INSERT INTO dbo.[NFD_TraineePaymentSchedules] ([ScheduleId], [TraineePaymentId], [MonthNumber], [MonthLabel], [DueDate], [Amount], [Status], [PaidDate]) VALUES (11, 4, N'2', N'February 2026', '2026-02-15', 116.67, 0, NULL);
INSERT INTO dbo.[NFD_TraineePaymentSchedules] ([ScheduleId], [TraineePaymentId], [MonthNumber], [MonthLabel], [DueDate], [Amount], [Status], [PaidDate]) VALUES (12, 4, N'3', N'March 2026', '2026-03-15', 116.67, 0, NULL);
INSERT INTO dbo.[NFD_TraineePaymentSchedules] ([ScheduleId], [TraineePaymentId], [MonthNumber], [MonthLabel], [DueDate], [Amount], [Status], [PaidDate]) VALUES (13, 5, N'1', N'January 2026', '2026-01-15', 200.0, 0, NULL);
INSERT INTO dbo.[NFD_TraineePaymentSchedules] ([ScheduleId], [TraineePaymentId], [MonthNumber], [MonthLabel], [DueDate], [Amount], [Status], [PaidDate]) VALUES (14, 5, N'2', N'February 2026', '2026-02-15', 200.0, 0, NULL);
INSERT INTO dbo.[NFD_TraineePaymentSchedules] ([ScheduleId], [TraineePaymentId], [MonthNumber], [MonthLabel], [DueDate], [Amount], [Status], [PaidDate]) VALUES (15, 5, N'3', N'March 2026', '2026-03-15', 200.0, 0, NULL);
INSERT INTO dbo.[NFD_TraineePaymentSchedules] ([ScheduleId], [TraineePaymentId], [MonthNumber], [MonthLabel], [DueDate], [Amount], [Status], [PaidDate]) VALUES (16, 6, N'1', N'January 2026', '2026-01-15', 150.0, 0, NULL);
INSERT INTO dbo.[NFD_TraineePaymentSchedules] ([ScheduleId], [TraineePaymentId], [MonthNumber], [MonthLabel], [DueDate], [Amount], [Status], [PaidDate]) VALUES (17, 6, N'2', N'February 2026', '2026-02-15', 150.0, 0, NULL);
INSERT INTO dbo.[NFD_TraineePaymentSchedules] ([ScheduleId], [TraineePaymentId], [MonthNumber], [MonthLabel], [DueDate], [Amount], [Status], [PaidDate]) VALUES (18, 6, N'3', N'March 2026', '2026-03-15', 150.0, 0, NULL);
SET IDENTITY_INSERT dbo.[NFD_TraineePaymentSchedules] OFF;


-- ==============================================================================
-- 14.3 CompanyPayments
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_CompanyPayments] ON;
INSERT INTO dbo.[NFD_CompanyPayments] ([CompanyPaymentId], [CompanyId], [BatchId], [TotalAmount], [Status]) VALUES (1, 1, 1, 1950.0, 2);
INSERT INTO dbo.[NFD_CompanyPayments] ([CompanyPaymentId], [CompanyId], [BatchId], [TotalAmount], [Status]) VALUES (2, 2, 2, 1050.0, 1);
INSERT INTO dbo.[NFD_CompanyPayments] ([CompanyPaymentId], [CompanyId], [BatchId], [TotalAmount], [Status]) VALUES (3, 3, 3, 1800.0, 0);
INSERT INTO dbo.[NFD_CompanyPayments] ([CompanyPaymentId], [CompanyId], [BatchId], [TotalAmount], [Status]) VALUES (4, 1, 4, 1350.0, 0);
SET IDENTITY_INSERT dbo.[NFD_CompanyPayments] OFF;


-- ==============================================================================
-- 14.4 CompanyPaymentSchedules
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_CompanyPaymentSchedules] ON;
INSERT INTO dbo.[NFD_CompanyPaymentSchedules] ([ScheduleId], [CompanyPaymentId], [MonthNumber], [MonthLabel], [DueDate], [Amount], [Status], [PaidDate]) VALUES (1, 1, N'1', N'January 2026', '2026-01-15', 650.0, 1, '2026-01-15');
INSERT INTO dbo.[NFD_CompanyPaymentSchedules] ([ScheduleId], [CompanyPaymentId], [MonthNumber], [MonthLabel], [DueDate], [Amount], [Status], [PaidDate]) VALUES (2, 1, N'2', N'February 2026', '2026-02-15', 650.0, 1, '2026-02-15');
INSERT INTO dbo.[NFD_CompanyPaymentSchedules] ([ScheduleId], [CompanyPaymentId], [MonthNumber], [MonthLabel], [DueDate], [Amount], [Status], [PaidDate]) VALUES (3, 1, N'3', N'March 2026', '2026-03-15', 650.0, 1, '2026-03-15');
INSERT INTO dbo.[NFD_CompanyPaymentSchedules] ([ScheduleId], [CompanyPaymentId], [MonthNumber], [MonthLabel], [DueDate], [Amount], [Status], [PaidDate]) VALUES (4, 2, N'1', N'January 2026', '2026-01-15', 350.0, 1, '2026-01-15');
INSERT INTO dbo.[NFD_CompanyPaymentSchedules] ([ScheduleId], [CompanyPaymentId], [MonthNumber], [MonthLabel], [DueDate], [Amount], [Status], [PaidDate]) VALUES (5, 2, N'2', N'February 2026', '2026-02-15', 350.0, 0, NULL);
INSERT INTO dbo.[NFD_CompanyPaymentSchedules] ([ScheduleId], [CompanyPaymentId], [MonthNumber], [MonthLabel], [DueDate], [Amount], [Status], [PaidDate]) VALUES (6, 2, N'3', N'March 2026', '2026-03-15', 350.0, 0, NULL);
INSERT INTO dbo.[NFD_CompanyPaymentSchedules] ([ScheduleId], [CompanyPaymentId], [MonthNumber], [MonthLabel], [DueDate], [Amount], [Status], [PaidDate]) VALUES (7, 3, N'1', N'January 2026', '2026-01-15', 600.0, 0, NULL);
INSERT INTO dbo.[NFD_CompanyPaymentSchedules] ([ScheduleId], [CompanyPaymentId], [MonthNumber], [MonthLabel], [DueDate], [Amount], [Status], [PaidDate]) VALUES (8, 3, N'2', N'February 2026', '2026-02-15', 600.0, 0, NULL);
INSERT INTO dbo.[NFD_CompanyPaymentSchedules] ([ScheduleId], [CompanyPaymentId], [MonthNumber], [MonthLabel], [DueDate], [Amount], [Status], [PaidDate]) VALUES (9, 3, N'3', N'March 2026', '2026-03-15', 600.0, 0, NULL);
INSERT INTO dbo.[NFD_CompanyPaymentSchedules] ([ScheduleId], [CompanyPaymentId], [MonthNumber], [MonthLabel], [DueDate], [Amount], [Status], [PaidDate]) VALUES (10, 4, N'1', N'January 2026', '2026-01-15', 450.0, 0, NULL);
INSERT INTO dbo.[NFD_CompanyPaymentSchedules] ([ScheduleId], [CompanyPaymentId], [MonthNumber], [MonthLabel], [DueDate], [Amount], [Status], [PaidDate]) VALUES (11, 4, N'2', N'February 2026', '2026-02-15', 450.0, 0, NULL);
INSERT INTO dbo.[NFD_CompanyPaymentSchedules] ([ScheduleId], [CompanyPaymentId], [MonthNumber], [MonthLabel], [DueDate], [Amount], [Status], [PaidDate]) VALUES (12, 4, N'3', N'March 2026', '2026-03-15', 450.0, 0, NULL);
SET IDENTITY_INSERT dbo.[NFD_CompanyPaymentSchedules] OFF;


-- ==============================================================================
-- 15.1 AuditLogs
-- ==============================================================================
SET IDENTITY_INSERT dbo.[NFD_AuditLogs] ON;
INSERT INTO dbo.[NFD_AuditLogs] ([LogId], [UserId], [Action], [EntityName], [EntityId], [Details], [Timestamp]) VALUES (1, 1, N'Approve', N'NFD_Companies', 1, N'Approved company ''Gulf Tech Solutions''.', '2025-09-05T09:00:00');
INSERT INTO dbo.[NFD_AuditLogs] ([LogId], [UserId], [Action], [EntityName], [EntityId], [Details], [Timestamp]) VALUES (2, 1, N'Approve', N'NFD_Companies', 2, N'Approved company ''Al Noor Manufacturing''.', '2025-09-06T09:00:00');
INSERT INTO dbo.[NFD_AuditLogs] ([LogId], [UserId], [Action], [EntityName], [EntityId], [Details], [Timestamp]) VALUES (3, 1, N'Create', N'NFD_Batches', 1, N'Created batch ''ASP.NET Core Bootcamp - Jan 2026''.', '2025-12-20T09:00:00');
INSERT INTO dbo.[NFD_AuditLogs] ([LogId], [UserId], [Action], [EntityName], [EntityId], [Details], [Timestamp]) VALUES (4, 8, N'Mark', N'NFD_SessionAttendances', 6, N'Marked trainee 9 absent for session 6.', '2026-01-20T12:30:00');
INSERT INTO dbo.[NFD_AuditLogs] ([LogId], [UserId], [Action], [EntityName], [EntityId], [Details], [Timestamp]) VALUES (5, 8, N'Raise', N'NFD_Warnings', 1, N'Raised an attendance warning on enrollment 3.', '2026-01-15T09:00:00');
INSERT INTO dbo.[NFD_AuditLogs] ([LogId], [UserId], [Action], [EntityName], [EntityId], [Details], [Timestamp]) VALUES (6, 2, N'Approve', N'NFD_Excuses', 1, N'Approved excuse for daily attendance record 14.', '2026-01-16T10:00:00');
INSERT INTO dbo.[NFD_AuditLogs] ([LogId], [UserId], [Action], [EntityName], [EntityId], [Details], [Timestamp]) VALUES (7, 1, N'Issue', N'NFD_Certificates', 1, N'Issued completion certificate for enrollment 1.', '2026-03-20T10:00:00');
INSERT INTO dbo.[NFD_AuditLogs] ([LogId], [UserId], [Action], [EntityName], [EntityId], [Details], [Timestamp]) VALUES (8, 1, N'Generate', N'NFD_Reports', 3, N'Generated Q1 2026 financial report.', '2026-03-31T09:00:00');
SET IDENTITY_INSERT dbo.[NFD_AuditLogs] OFF;


-- ==============================================================================
COMMIT TRANSACTION;
PRINT 'Nafadh seed data loaded successfully: 45 tables populated.';
END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
    PRINT 'Seed script failed - transaction rolled back.';
    THROW;
END CATCH