IF OBJECT_ID(N'[__EFMigrationsHistory]') IS NULL
BEGIN
    CREATE TABLE [__EFMigrationsHistory] (
        [MigrationId] nvarchar(150) NOT NULL,
        [ProductVersion] nvarchar(32) NOT NULL,
        CONSTRAINT [PK___EFMigrationsHistory] PRIMARY KEY ([MigrationId])
    );
END;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_Permissions] (
        [PermissionId] int NOT NULL IDENTITY,
        [PermissionKey] nvarchar(100) NOT NULL,
        [Description] nvarchar(300) NULL,
        CONSTRAINT [PK_NFD_Permissions] PRIMARY KEY ([PermissionId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_Roles] (
        [RoleId] int NOT NULL IDENTITY,
        [RoleName] nvarchar(50) NOT NULL,
        CONSTRAINT [PK_NFD_Roles] PRIMARY KEY ([RoleId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_SystemSettings] (
        [SettingId] int NOT NULL IDENTITY,
        [Key] nvarchar(100) NOT NULL,
        [Value] nvarchar(max) NOT NULL,
        [Description] nvarchar(300) NULL,
        CONSTRAINT [PK_NFD_SystemSettings] PRIMARY KEY ([SettingId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_Tracks] (
        [TrackId] int NOT NULL IDENTITY,
        [Name] nvarchar(150) NOT NULL,
        [Description] nvarchar(max) NULL,
        [Status] int NOT NULL,
        CONSTRAINT [PK_NFD_Tracks] PRIMARY KEY ([TrackId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_RolePermissions] (
        [RoleId] int NOT NULL,
        [PermissionId] int NOT NULL,
        CONSTRAINT [PK_NFD_RolePermissions] PRIMARY KEY ([RoleId], [PermissionId]),
        CONSTRAINT [FK_NFD_RolePermissions_NFD_Permissions_PermissionId] FOREIGN KEY ([PermissionId]) REFERENCES [NFD_Permissions] ([PermissionId]) ON DELETE CASCADE,
        CONSTRAINT [FK_NFD_RolePermissions_NFD_Roles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [NFD_Roles] ([RoleId]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_Users] (
        [UserId] int NOT NULL IDENTITY,
        [FullName] nvarchar(150) NOT NULL,
        [Email] nvarchar(150) NOT NULL,
        [PasswordHash] nvarchar(255) NOT NULL,
        [Phone] nvarchar(20) NULL,
        [Status] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [RoleId] int NOT NULL,
        CONSTRAINT [PK_NFD_Users] PRIMARY KEY ([UserId]),
        CONSTRAINT [FK_NFD_Users_NFD_Roles_RoleId] FOREIGN KEY ([RoleId]) REFERENCES [NFD_Roles] ([RoleId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_Programs] (
        [ProgramId] int NOT NULL IDENTITY,
        [Title] nvarchar(150) NOT NULL,
        [Description] nvarchar(max) NULL,
        [Category] nvarchar(100) NULL,
        [DurationHours] decimal(18,2) NOT NULL,
        [Price] decimal(18,2) NOT NULL,
        [Status] int NOT NULL,
        [TrackId] int NOT NULL,
        CONSTRAINT [PK_NFD_Programs] PRIMARY KEY ([ProgramId]),
        CONSTRAINT [FK_NFD_Programs_NFD_Tracks_TrackId] FOREIGN KEY ([TrackId]) REFERENCES [NFD_Tracks] ([TrackId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_Announcements] (
        [AnnouncementId] int NOT NULL IDENTITY,
        [ScopeType] int NOT NULL,
        [ScopeId] int NULL,
        [Message] nvarchar(max) NOT NULL,
        [Date] datetime2 NOT NULL,
        [CreatedByUserId] int NOT NULL,
        CONSTRAINT [PK_NFD_Announcements] PRIMARY KEY ([AnnouncementId]),
        CONSTRAINT [FK_NFD_Announcements_NFD_Users_CreatedByUserId] FOREIGN KEY ([CreatedByUserId]) REFERENCES [NFD_Users] ([UserId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_AuditLogs] (
        [LogId] int NOT NULL IDENTITY,
        [Action] nvarchar(100) NOT NULL,
        [EntityName] nvarchar(100) NOT NULL,
        [EntityId] int NOT NULL,
        [Details] nvarchar(max) NULL,
        [Timestamp] datetime2 NOT NULL,
        [UserId] int NOT NULL,
        CONSTRAINT [PK_NFD_AuditLogs] PRIMARY KEY ([LogId]),
        CONSTRAINT [FK_NFD_AuditLogs_NFD_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [NFD_Users] ([UserId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_Companies] (
        [CompanyId] int NOT NULL IDENTITY,
        [CompanyName] nvarchar(150) NOT NULL,
        [CommercialRegister] nvarchar(50) NULL,
        [WorkField] nvarchar(100) NULL,
        [Address] nvarchar(250) NULL,
        [Phone] nvarchar(20) NULL,
        [Email] nvarchar(150) NULL,
        [Logo] nvarchar(300) NULL,
        [Capacity] decimal(18,2) NOT NULL,
        [Status] int NOT NULL,
        [ApprovalDate] datetime2 NULL,
        [UserId] int NOT NULL,
        CONSTRAINT [PK_NFD_Companies] PRIMARY KEY ([CompanyId]),
        CONSTRAINT [FK_NFD_Companies_NFD_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [NFD_Users] ([UserId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_EvaluationTemplates] (
        [TemplateId] int NOT NULL IDENTITY,
        [Type] int NOT NULL,
        [CreatedByUserId] int NOT NULL,
        CONSTRAINT [PK_NFD_EvaluationTemplates] PRIMARY KEY ([TemplateId]),
        CONSTRAINT [FK_NFD_EvaluationTemplates_NFD_Users_CreatedByUserId] FOREIGN KEY ([CreatedByUserId]) REFERENCES [NFD_Users] ([UserId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_Messages] (
        [MessageId] int NOT NULL IDENTITY,
        [Content] nvarchar(max) NOT NULL,
        [SentDate] datetime2 NOT NULL,
        [Status] int NOT NULL,
        [SenderId] int NOT NULL,
        [ReceiverId] int NOT NULL,
        CONSTRAINT [PK_NFD_Messages] PRIMARY KEY ([MessageId]),
        CONSTRAINT [FK_NFD_Messages_NFD_Users_ReceiverId] FOREIGN KEY ([ReceiverId]) REFERENCES [NFD_Users] ([UserId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_Messages_NFD_Users_SenderId] FOREIGN KEY ([SenderId]) REFERENCES [NFD_Users] ([UserId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_Notifications] (
        [NotificationId] int NOT NULL IDENTITY,
        [Title] nvarchar(150) NOT NULL,
        [Message] nvarchar(max) NOT NULL,
        [RelatedEntity] nvarchar(100) NULL,
        [IsRead] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UserId] int NOT NULL,
        CONSTRAINT [PK_NFD_Notifications] PRIMARY KEY ([NotificationId]),
        CONSTRAINT [FK_NFD_Notifications_NFD_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [NFD_Users] ([UserId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_Reports] (
        [ReportId] int NOT NULL IDENTITY,
        [Type] int NOT NULL,
        [FiltersJson] nvarchar(max) NULL,
        [GeneratedAt] datetime2 NOT NULL,
        [FileUrl] nvarchar(300) NULL,
        [GeneratedByUserId] int NOT NULL,
        CONSTRAINT [PK_NFD_Reports] PRIMARY KEY ([ReportId]),
        CONSTRAINT [FK_NFD_Reports_NFD_Users_GeneratedByUserId] FOREIGN KEY ([GeneratedByUserId]) REFERENCES [NFD_Users] ([UserId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_SupportTickets] (
        [TicketId] int NOT NULL IDENTITY,
        [Subject] nvarchar(150) NOT NULL,
        [Message] nvarchar(max) NOT NULL,
        [Status] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UserId] int NOT NULL,
        CONSTRAINT [PK_NFD_SupportTickets] PRIMARY KEY ([TicketId]),
        CONSTRAINT [FK_NFD_SupportTickets_NFD_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [NFD_Users] ([UserId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_Trainers] (
        [TrainerId] int NOT NULL IDENTITY,
        [Specialty] nvarchar(150) NULL,
        [ExperienceYears] decimal(18,2) NOT NULL,
        [Biography] nvarchar(max) NULL,
        [CVUrl] nvarchar(300) NULL,
        [Status] int NOT NULL,
        [UserId] int NOT NULL,
        CONSTRAINT [PK_NFD_Trainers] PRIMARY KEY ([TrainerId]),
        CONSTRAINT [FK_NFD_Trainers_NFD_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [NFD_Users] ([UserId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_Batches] (
        [BatchId] int NOT NULL IDENTITY,
        [BatchName] nvarchar(150) NOT NULL,
        [StartDate] datetime2 NOT NULL,
        [EndDate] datetime2 NOT NULL,
        [Capacity] decimal(18,2) NOT NULL,
        [Status] int NOT NULL,
        [ProgramId] int NOT NULL,
        CONSTRAINT [PK_NFD_Batches] PRIMARY KEY ([BatchId]),
        CONSTRAINT [FK_NFD_Batches_NFD_Programs_ProgramId] FOREIGN KEY ([ProgramId]) REFERENCES [NFD_Programs] ([ProgramId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_Modules] (
        [ModuleId] int NOT NULL IDENTITY,
        [Title] nvarchar(150) NOT NULL,
        [OrderIndex] decimal(18,2) NOT NULL,
        [AvailableFrom] datetime2 NULL,
        [AvailableTo] datetime2 NULL,
        [IsArchived] bit NOT NULL,
        [ProgramId] int NOT NULL,
        [PrerequisiteModuleId] int NULL,
        CONSTRAINT [PK_NFD_Modules] PRIMARY KEY ([ModuleId]),
        CONSTRAINT [FK_NFD_Modules_NFD_Modules_PrerequisiteModuleId] FOREIGN KEY ([PrerequisiteModuleId]) REFERENCES [NFD_Modules] ([ModuleId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_Modules_NFD_Programs_ProgramId] FOREIGN KEY ([ProgramId]) REFERENCES [NFD_Programs] ([ProgramId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_Projects] (
        [ProjectId] int NOT NULL IDENTITY,
        [Title] nvarchar(150) NOT NULL,
        [Description] nvarchar(max) NULL,
        [StartDate] datetime2 NOT NULL,
        [EndDate] datetime2 NOT NULL,
        [Status] int NOT NULL,
        [ProgramId] int NOT NULL,
        CONSTRAINT [PK_NFD_Projects] PRIMARY KEY ([ProjectId]),
        CONSTRAINT [FK_NFD_Projects_NFD_Programs_ProgramId] FOREIGN KEY ([ProgramId]) REFERENCES [NFD_Programs] ([ProgramId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_CompanyBranches] (
        [BranchId] int NOT NULL IDENTITY,
        [Location] nvarchar(200) NOT NULL,
        [ContactPoint] nvarchar(150) NULL,
        [CompanyId] int NOT NULL,
        CONSTRAINT [PK_NFD_CompanyBranches] PRIMARY KEY ([BranchId]),
        CONSTRAINT [FK_NFD_CompanyBranches_NFD_Companies_CompanyId] FOREIGN KEY ([CompanyId]) REFERENCES [NFD_Companies] ([CompanyId]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_CompanyPrograms] (
        [CompanyId] int NOT NULL,
        [ProgramId] int NOT NULL,
        CONSTRAINT [PK_NFD_CompanyPrograms] PRIMARY KEY ([CompanyId], [ProgramId]),
        CONSTRAINT [FK_NFD_CompanyPrograms_NFD_Companies_CompanyId] FOREIGN KEY ([CompanyId]) REFERENCES [NFD_Companies] ([CompanyId]) ON DELETE CASCADE,
        CONSTRAINT [FK_NFD_CompanyPrograms_NFD_Programs_ProgramId] FOREIGN KEY ([ProgramId]) REFERENCES [NFD_Programs] ([ProgramId]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_CompanySupervisors] (
        [SupervisorId] int NOT NULL IDENTITY,
        [Department] nvarchar(100) NULL,
        [Position] nvarchar(100) NULL,
        [UserId] int NOT NULL,
        [CompanyId] int NOT NULL,
        CONSTRAINT [PK_NFD_CompanySupervisors] PRIMARY KEY ([SupervisorId]),
        CONSTRAINT [FK_NFD_CompanySupervisors_NFD_Companies_CompanyId] FOREIGN KEY ([CompanyId]) REFERENCES [NFD_Companies] ([CompanyId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_CompanySupervisors_NFD_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [NFD_Users] ([UserId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_Departments] (
        [DepartmentId] int NOT NULL IDENTITY,
        [Name] nvarchar(100) NOT NULL,
        [CompanyId] int NOT NULL,
        CONSTRAINT [PK_NFD_Departments] PRIMARY KEY ([DepartmentId]),
        CONSTRAINT [FK_NFD_Departments_NFD_Companies_CompanyId] FOREIGN KEY ([CompanyId]) REFERENCES [NFD_Companies] ([CompanyId]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_Trainees] (
        [TraineeId] int NOT NULL IDENTITY,
        [NationalId] int NOT NULL,
        [University] nvarchar(150) NULL,
        [Major] nvarchar(100) NULL,
        [AcademicLevel] nvarchar(50) NULL,
        [Skills] nvarchar(max) NULL,
        [ResumeUrl] nvarchar(300) NULL,
        [Status] int NOT NULL,
        [UserId] int NOT NULL,
        [CompanyId] int NULL,
        CONSTRAINT [PK_NFD_Trainees] PRIMARY KEY ([TraineeId]),
        CONSTRAINT [FK_NFD_Trainees_NFD_Companies_CompanyId] FOREIGN KEY ([CompanyId]) REFERENCES [NFD_Companies] ([CompanyId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_Trainees_NFD_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [NFD_Users] ([UserId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_EvaluationCriteria] (
        [CriteriaId] int NOT NULL IDENTITY,
        [Name] nvarchar(150) NOT NULL,
        [Weight] decimal(18,2) NOT NULL,
        [TemplateId] int NOT NULL,
        CONSTRAINT [PK_NFD_EvaluationCriteria] PRIMARY KEY ([CriteriaId]),
        CONSTRAINT [FK_NFD_EvaluationCriteria_NFD_EvaluationTemplates_TemplateId] FOREIGN KEY ([TemplateId]) REFERENCES [NFD_EvaluationTemplates] ([TemplateId]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_BatchTrainers] (
        [BatchId] int NOT NULL,
        [TrainerId] int NOT NULL,
        CONSTRAINT [PK_NFD_BatchTrainers] PRIMARY KEY ([BatchId], [TrainerId]),
        CONSTRAINT [FK_NFD_BatchTrainers_NFD_Batches_BatchId] FOREIGN KEY ([BatchId]) REFERENCES [NFD_Batches] ([BatchId]) ON DELETE CASCADE,
        CONSTRAINT [FK_NFD_BatchTrainers_NFD_Trainers_TrainerId] FOREIGN KEY ([TrainerId]) REFERENCES [NFD_Trainers] ([TrainerId]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_CompanyPayments] (
        [CompanyPaymentId] int NOT NULL IDENTITY,
        [TotalAmount] decimal(18,2) NOT NULL,
        [Status] int NOT NULL,
        [CompanyId] int NOT NULL,
        [BatchId] int NOT NULL,
        CONSTRAINT [PK_NFD_CompanyPayments] PRIMARY KEY ([CompanyPaymentId]),
        CONSTRAINT [FK_NFD_CompanyPayments_NFD_Batches_BatchId] FOREIGN KEY ([BatchId]) REFERENCES [NFD_Batches] ([BatchId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_CompanyPayments_NFD_Companies_CompanyId] FOREIGN KEY ([CompanyId]) REFERENCES [NFD_Companies] ([CompanyId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_Sessions] (
        [SessionId] int NOT NULL IDENTITY,
        [SessionDate] datetime2 NOT NULL,
        [StartTime] nvarchar(20) NULL,
        [EndTime] nvarchar(20) NULL,
        [MeetingLink] nvarchar(300) NULL,
        [Topic] nvarchar(200) NULL,
        [LearningObjectives] nvarchar(max) NULL,
        [RecordingUrl] nvarchar(300) NULL,
        [Summary] nvarchar(max) NULL,
        [Status] int NOT NULL,
        [BatchId] int NOT NULL,
        [TrainerId] int NOT NULL,
        CONSTRAINT [PK_NFD_Sessions] PRIMARY KEY ([SessionId]),
        CONSTRAINT [FK_NFD_Sessions_NFD_Batches_BatchId] FOREIGN KEY ([BatchId]) REFERENCES [NFD_Batches] ([BatchId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_Sessions_NFD_Trainers_TrainerId] FOREIGN KEY ([TrainerId]) REFERENCES [NFD_Trainers] ([TrainerId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_Tasks] (
        [TaskId] int NOT NULL IDENTITY,
        [Title] nvarchar(150) NOT NULL,
        [Description] nvarchar(max) NULL,
        [DueDate] datetime2 NOT NULL,
        [Priority] int NOT NULL,
        [Status] int NOT NULL,
        [BatchId] int NOT NULL,
        [CreatedByUserId] int NOT NULL,
        CONSTRAINT [PK_NFD_Tasks] PRIMARY KEY ([TaskId]),
        CONSTRAINT [FK_NFD_Tasks_NFD_Batches_BatchId] FOREIGN KEY ([BatchId]) REFERENCES [NFD_Batches] ([BatchId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_Tasks_NFD_Users_CreatedByUserId] FOREIGN KEY ([CreatedByUserId]) REFERENCES [NFD_Users] ([UserId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_Lessons] (
        [LessonId] int NOT NULL IDENTITY,
        [Title] nvarchar(150) NOT NULL,
        [ContentBody] nvarchar(max) NULL,
        [OrderIndex] decimal(18,2) NOT NULL,
        [ModuleId] int NOT NULL,
        CONSTRAINT [PK_NFD_Lessons] PRIMARY KEY ([LessonId]),
        CONSTRAINT [FK_NFD_Lessons_NFD_Modules_ModuleId] FOREIGN KEY ([ModuleId]) REFERENCES [NFD_Modules] ([ModuleId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_Enrollments] (
        [EnrollmentId] int NOT NULL IDENTITY,
        [EnrollmentDate] datetime2 NOT NULL,
        [CompletionStatus] int NOT NULL,
        [BatchId] int NOT NULL,
        [TraineeId] int NOT NULL,
        [CompanyId] int NOT NULL,
        [DepartmentId] int NULL,
        [SupervisorId] int NULL,
        CONSTRAINT [PK_NFD_Enrollments] PRIMARY KEY ([EnrollmentId]),
        CONSTRAINT [FK_NFD_Enrollments_NFD_Batches_BatchId] FOREIGN KEY ([BatchId]) REFERENCES [NFD_Batches] ([BatchId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_Enrollments_NFD_Companies_CompanyId] FOREIGN KEY ([CompanyId]) REFERENCES [NFD_Companies] ([CompanyId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_Enrollments_NFD_CompanySupervisors_SupervisorId] FOREIGN KEY ([SupervisorId]) REFERENCES [NFD_CompanySupervisors] ([SupervisorId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_Enrollments_NFD_Departments_DepartmentId] FOREIGN KEY ([DepartmentId]) REFERENCES [NFD_Departments] ([DepartmentId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_Enrollments_NFD_Trainees_TraineeId] FOREIGN KEY ([TraineeId]) REFERENCES [NFD_Trainees] ([TraineeId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_ProjectMembers] (
        [MemberId] int NOT NULL IDENTITY,
        [Role] int NOT NULL,
        [ProjectId] int NOT NULL,
        [TraineeId] int NOT NULL,
        CONSTRAINT [PK_NFD_ProjectMembers] PRIMARY KEY ([MemberId]),
        CONSTRAINT [FK_NFD_ProjectMembers_NFD_Projects_ProjectId] FOREIGN KEY ([ProjectId]) REFERENCES [NFD_Projects] ([ProjectId]) ON DELETE CASCADE,
        CONSTRAINT [FK_NFD_ProjectMembers_NFD_Trainees_TraineeId] FOREIGN KEY ([TraineeId]) REFERENCES [NFD_Trainees] ([TraineeId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_TraineeModuleProgresses] (
        [ProgressId] int NOT NULL IDENTITY,
        [Status] int NOT NULL,
        [CompletedAt] datetime2 NULL,
        [TraineeId] int NOT NULL,
        [ModuleId] int NOT NULL,
        CONSTRAINT [PK_NFD_TraineeModuleProgresses] PRIMARY KEY ([ProgressId]),
        CONSTRAINT [FK_NFD_TraineeModuleProgresses_NFD_Modules_ModuleId] FOREIGN KEY ([ModuleId]) REFERENCES [NFD_Modules] ([ModuleId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_TraineeModuleProgresses_NFD_Trainees_TraineeId] FOREIGN KEY ([TraineeId]) REFERENCES [NFD_Trainees] ([TraineeId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_CompanyPaymentSchedules] (
        [ScheduleId] int NOT NULL IDENTITY,
        [MonthNumber] decimal(18,2) NOT NULL,
        [MonthLabel] nvarchar(30) NULL,
        [DueDate] datetime2 NOT NULL,
        [Amount] decimal(18,2) NOT NULL,
        [Status] int NOT NULL,
        [PaidDate] datetime2 NULL,
        [CompanyPaymentId] int NOT NULL,
        CONSTRAINT [PK_NFD_CompanyPaymentSchedules] PRIMARY KEY ([ScheduleId]),
        CONSTRAINT [FK_NFD_CompanyPaymentSchedules_NFD_CompanyPayments_CompanyPaymentId] FOREIGN KEY ([CompanyPaymentId]) REFERENCES [NFD_CompanyPayments] ([CompanyPaymentId]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_SessionAttendances] (
        [AttendanceId] int NOT NULL IDENTITY,
        [Status] int NOT NULL,
        [Note] nvarchar(300) NULL,
        [SessionId] int NOT NULL,
        [TraineeId] int NOT NULL,
        CONSTRAINT [PK_NFD_SessionAttendances] PRIMARY KEY ([AttendanceId]),
        CONSTRAINT [FK_NFD_SessionAttendances_NFD_Sessions_SessionId] FOREIGN KEY ([SessionId]) REFERENCES [NFD_Sessions] ([SessionId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_SessionAttendances_NFD_Trainees_TraineeId] FOREIGN KEY ([TraineeId]) REFERENCES [NFD_Trainees] ([TraineeId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_Rubrics] (
        [RubricId] int NOT NULL IDENTITY,
        [Criterion] nvarchar(150) NOT NULL,
        [Weight] decimal(18,2) NOT NULL,
        [MaxScore] decimal(18,2) NOT NULL,
        [TaskId] int NOT NULL,
        CONSTRAINT [PK_NFD_Rubrics] PRIMARY KEY ([RubricId]),
        CONSTRAINT [FK_NFD_Rubrics_NFD_Tasks_TaskId] FOREIGN KEY ([TaskId]) REFERENCES [NFD_Tasks] ([TaskId]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_Submissions] (
        [SubmissionId] int NOT NULL IDENTITY,
        [FileUrl] nvarchar(300) NULL,
        [SubmittedAt] datetime2 NOT NULL,
        [Status] int NOT NULL,
        [Grade] nvarchar(20) NULL,
        [Feedback] nvarchar(max) NULL,
        [TaskId] int NOT NULL,
        [TraineeId] int NOT NULL,
        CONSTRAINT [PK_NFD_Submissions] PRIMARY KEY ([SubmissionId]),
        CONSTRAINT [FK_NFD_Submissions_NFD_Tasks_TaskId] FOREIGN KEY ([TaskId]) REFERENCES [NFD_Tasks] ([TaskId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_Submissions_NFD_Trainees_TraineeId] FOREIGN KEY ([TraineeId]) REFERENCES [NFD_Trainees] ([TraineeId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_TrainingMaterials] (
        [MaterialId] int NOT NULL IDENTITY,
        [FileUrl] nvarchar(300) NOT NULL,
        [FileType] int NOT NULL,
        [UploadDate] datetime2 NOT NULL,
        [LessonId] int NOT NULL,
        [UploadedByUserId] int NOT NULL,
        CONSTRAINT [PK_NFD_TrainingMaterials] PRIMARY KEY ([MaterialId]),
        CONSTRAINT [FK_NFD_TrainingMaterials_NFD_Lessons_LessonId] FOREIGN KEY ([LessonId]) REFERENCES [NFD_Lessons] ([LessonId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_TrainingMaterials_NFD_Users_UploadedByUserId] FOREIGN KEY ([UploadedByUserId]) REFERENCES [NFD_Users] ([UserId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_Certificates] (
        [CertificateId] int NOT NULL IDENTITY,
        [Type] int NOT NULL,
        [IssueDate] datetime2 NOT NULL,
        [FileUrl] nvarchar(300) NULL,
        [EnrollmentId] int NOT NULL,
        CONSTRAINT [PK_NFD_Certificates] PRIMARY KEY ([CertificateId]),
        CONSTRAINT [FK_NFD_Certificates_NFD_Enrollments_EnrollmentId] FOREIGN KEY ([EnrollmentId]) REFERENCES [NFD_Enrollments] ([EnrollmentId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_DailyAttendances] (
        [DailyAttendanceId] int NOT NULL IDENTITY,
        [Date] datetime2 NOT NULL,
        [CheckInTime] nvarchar(20) NULL,
        [CheckOutTime] nvarchar(20) NULL,
        [Status] int NOT NULL,
        [IsLate] bit NOT NULL,
        [Note] nvarchar(300) NULL,
        [EnrollmentId] int NOT NULL,
        CONSTRAINT [PK_NFD_DailyAttendances] PRIMARY KEY ([DailyAttendanceId]),
        CONSTRAINT [FK_NFD_DailyAttendances_NFD_Enrollments_EnrollmentId] FOREIGN KEY ([EnrollmentId]) REFERENCES [NFD_Enrollments] ([EnrollmentId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_Evaluations] (
        [EvaluationId] int NOT NULL IDENTITY,
        [Period] int NOT NULL,
        [Score] decimal(18,2) NOT NULL,
        [Notes] nvarchar(max) NULL,
        [EvaluationDate] datetime2 NOT NULL,
        [EnrollmentId] int NULL,
        [TrainerId] int NULL,
        [TemplateId] int NOT NULL,
        [EvaluatorUserId] int NOT NULL,
        CONSTRAINT [PK_NFD_Evaluations] PRIMARY KEY ([EvaluationId]),
        CONSTRAINT [FK_NFD_Evaluations_NFD_Enrollments_EnrollmentId] FOREIGN KEY ([EnrollmentId]) REFERENCES [NFD_Enrollments] ([EnrollmentId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_Evaluations_NFD_EvaluationTemplates_TemplateId] FOREIGN KEY ([TemplateId]) REFERENCES [NFD_EvaluationTemplates] ([TemplateId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_Evaluations_NFD_Trainers_TrainerId] FOREIGN KEY ([TrainerId]) REFERENCES [NFD_Trainers] ([TrainerId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_Evaluations_NFD_Users_EvaluatorUserId] FOREIGN KEY ([EvaluatorUserId]) REFERENCES [NFD_Users] ([UserId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_TraineePayments] (
        [TraineePaymentId] int NOT NULL IDENTITY,
        [TotalAmount] decimal(18,2) NOT NULL,
        [Status] int NOT NULL,
        [EnrollmentId] int NOT NULL,
        CONSTRAINT [PK_NFD_TraineePayments] PRIMARY KEY ([TraineePaymentId]),
        CONSTRAINT [FK_NFD_TraineePayments_NFD_Enrollments_EnrollmentId] FOREIGN KEY ([EnrollmentId]) REFERENCES [NFD_Enrollments] ([EnrollmentId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_Warnings] (
        [WarningId] int NOT NULL IDENTITY,
        [Type] int NOT NULL,
        [Level] int NOT NULL,
        [Evidence] nvarchar(max) NULL,
        [Status] int NOT NULL,
        [Resolution] nvarchar(max) NULL,
        [IssuedDate] datetime2 NOT NULL,
        [EnrollmentId] int NOT NULL,
        [RaisedByUserId] int NOT NULL,
        CONSTRAINT [PK_NFD_Warnings] PRIMARY KEY ([WarningId]),
        CONSTRAINT [FK_NFD_Warnings_NFD_Enrollments_EnrollmentId] FOREIGN KEY ([EnrollmentId]) REFERENCES [NFD_Enrollments] ([EnrollmentId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_Warnings_NFD_Users_RaisedByUserId] FOREIGN KEY ([RaisedByUserId]) REFERENCES [NFD_Users] ([UserId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_Excuses] (
        [ExcuseId] int NOT NULL IDENTITY,
        [Reason] nvarchar(300) NOT NULL,
        [ProofUrl] nvarchar(300) NULL,
        [Status] int NOT NULL,
        [DailyAttendanceId] int NOT NULL,
        [ReviewedByUserId] int NULL,
        CONSTRAINT [PK_NFD_Excuses] PRIMARY KEY ([ExcuseId]),
        CONSTRAINT [FK_NFD_Excuses_NFD_DailyAttendances_DailyAttendanceId] FOREIGN KEY ([DailyAttendanceId]) REFERENCES [NFD_DailyAttendances] ([DailyAttendanceId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_Excuses_NFD_Users_ReviewedByUserId] FOREIGN KEY ([ReviewedByUserId]) REFERENCES [NFD_Users] ([UserId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE TABLE [NFD_TraineePaymentSchedules] (
        [ScheduleId] int NOT NULL IDENTITY,
        [MonthNumber] decimal(18,2) NOT NULL,
        [MonthLabel] nvarchar(30) NULL,
        [DueDate] datetime2 NOT NULL,
        [Amount] decimal(18,2) NOT NULL,
        [Status] int NOT NULL,
        [PaidDate] datetime2 NULL,
        [TraineePaymentId] int NOT NULL,
        CONSTRAINT [PK_NFD_TraineePaymentSchedules] PRIMARY KEY ([ScheduleId]),
        CONSTRAINT [FK_NFD_TraineePaymentSchedules_NFD_TraineePayments_TraineePaymentId] FOREIGN KEY ([TraineePaymentId]) REFERENCES [NFD_TraineePayments] ([TraineePaymentId]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Announcements_CreatedByUserId] ON [NFD_Announcements] ([CreatedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_AuditLogs_UserId] ON [NFD_AuditLogs] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Batches_ProgramId] ON [NFD_Batches] ([ProgramId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_BatchTrainers_TrainerId] ON [NFD_BatchTrainers] ([TrainerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Certificates_EnrollmentId] ON [NFD_Certificates] ([EnrollmentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_NFD_Companies_UserId] ON [NFD_Companies] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_CompanyBranches_CompanyId] ON [NFD_CompanyBranches] ([CompanyId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_CompanyPayments_BatchId] ON [NFD_CompanyPayments] ([BatchId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_CompanyPayments_CompanyId] ON [NFD_CompanyPayments] ([CompanyId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_CompanyPaymentSchedules_CompanyPaymentId] ON [NFD_CompanyPaymentSchedules] ([CompanyPaymentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_CompanyPrograms_ProgramId] ON [NFD_CompanyPrograms] ([ProgramId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_CompanySupervisors_CompanyId] ON [NFD_CompanySupervisors] ([CompanyId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_NFD_CompanySupervisors_UserId] ON [NFD_CompanySupervisors] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_DailyAttendances_EnrollmentId] ON [NFD_DailyAttendances] ([EnrollmentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Departments_CompanyId] ON [NFD_Departments] ([CompanyId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Enrollments_BatchId] ON [NFD_Enrollments] ([BatchId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Enrollments_CompanyId] ON [NFD_Enrollments] ([CompanyId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Enrollments_DepartmentId] ON [NFD_Enrollments] ([DepartmentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Enrollments_SupervisorId] ON [NFD_Enrollments] ([SupervisorId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Enrollments_TraineeId] ON [NFD_Enrollments] ([TraineeId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_EvaluationCriteria_TemplateId] ON [NFD_EvaluationCriteria] ([TemplateId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Evaluations_EnrollmentId] ON [NFD_Evaluations] ([EnrollmentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Evaluations_EvaluatorUserId] ON [NFD_Evaluations] ([EvaluatorUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Evaluations_TemplateId] ON [NFD_Evaluations] ([TemplateId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Evaluations_TrainerId] ON [NFD_Evaluations] ([TrainerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_EvaluationTemplates_CreatedByUserId] ON [NFD_EvaluationTemplates] ([CreatedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Excuses_DailyAttendanceId] ON [NFD_Excuses] ([DailyAttendanceId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Excuses_ReviewedByUserId] ON [NFD_Excuses] ([ReviewedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Lessons_ModuleId] ON [NFD_Lessons] ([ModuleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Messages_ReceiverId] ON [NFD_Messages] ([ReceiverId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Messages_SenderId] ON [NFD_Messages] ([SenderId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Modules_PrerequisiteModuleId] ON [NFD_Modules] ([PrerequisiteModuleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Modules_ProgramId] ON [NFD_Modules] ([ProgramId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Notifications_UserId] ON [NFD_Notifications] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_NFD_Permissions_PermissionKey] ON [NFD_Permissions] ([PermissionKey]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Programs_TrackId] ON [NFD_Programs] ([TrackId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_ProjectMembers_ProjectId] ON [NFD_ProjectMembers] ([ProjectId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_ProjectMembers_TraineeId] ON [NFD_ProjectMembers] ([TraineeId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Projects_ProgramId] ON [NFD_Projects] ([ProgramId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Reports_GeneratedByUserId] ON [NFD_Reports] ([GeneratedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_RolePermissions_PermissionId] ON [NFD_RolePermissions] ([PermissionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_NFD_Roles_RoleName] ON [NFD_Roles] ([RoleName]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Rubrics_TaskId] ON [NFD_Rubrics] ([TaskId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_SessionAttendances_SessionId] ON [NFD_SessionAttendances] ([SessionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_SessionAttendances_TraineeId] ON [NFD_SessionAttendances] ([TraineeId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Sessions_BatchId] ON [NFD_Sessions] ([BatchId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Sessions_TrainerId] ON [NFD_Sessions] ([TrainerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Submissions_TaskId] ON [NFD_Submissions] ([TaskId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Submissions_TraineeId] ON [NFD_Submissions] ([TraineeId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_SupportTickets_UserId] ON [NFD_SupportTickets] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_NFD_SystemSettings_Key] ON [NFD_SystemSettings] ([Key]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Tasks_BatchId] ON [NFD_Tasks] ([BatchId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Tasks_CreatedByUserId] ON [NFD_Tasks] ([CreatedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_TraineeModuleProgresses_ModuleId] ON [NFD_TraineeModuleProgresses] ([ModuleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_TraineeModuleProgresses_TraineeId] ON [NFD_TraineeModuleProgresses] ([TraineeId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_TraineePayments_EnrollmentId] ON [NFD_TraineePayments] ([EnrollmentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_TraineePaymentSchedules_TraineePaymentId] ON [NFD_TraineePaymentSchedules] ([TraineePaymentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Trainees_CompanyId] ON [NFD_Trainees] ([CompanyId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_NFD_Trainees_UserId] ON [NFD_Trainees] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_NFD_Trainers_UserId] ON [NFD_Trainers] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_TrainingMaterials_LessonId] ON [NFD_TrainingMaterials] ([LessonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_TrainingMaterials_UploadedByUserId] ON [NFD_TrainingMaterials] ([UploadedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE UNIQUE INDEX [IX_NFD_Users_Email] ON [NFD_Users] ([Email]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Users_RoleId] ON [NFD_Users] ([RoleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Warnings_EnrollmentId] ON [NFD_Warnings] ([EnrollmentId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    CREATE INDEX [IX_NFD_Warnings_RaisedByUserId] ON [NFD_Warnings] ([RaisedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260804111347_initialCreate'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260804111347_initialCreate', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260805081039_AddSupervisorStatus'
)
BEGIN
    ALTER TABLE [NFD_CompanySupervisors] ADD [Status] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260805081039_AddSupervisorStatus'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260805081039_AddSupervisorStatus', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    DECLARE @var nvarchar(max);
    SELECT @var = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[NFD_Warnings]') AND [c].[name] = N'EnrollmentId');
    IF @var IS NOT NULL EXEC(N'ALTER TABLE [NFD_Warnings] DROP CONSTRAINT ' + @var + ';');
    ALTER TABLE [NFD_Warnings] ALTER COLUMN [EnrollmentId] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    ALTER TABLE [NFD_Warnings] ADD [CompanyId] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    ALTER TABLE [NFD_Warnings] ADD [Scope] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    ALTER TABLE [NFD_Trainees] ADD [GitHubUrl] nvarchar(300) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    ALTER TABLE [NFD_Trainees] ADD [LinkedInUrl] nvarchar(300) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    ALTER TABLE [NFD_Trainees] ADD [VerificationStatus] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    ALTER TABLE [NFD_SupportTickets] ADD [Category] nvarchar(150) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    ALTER TABLE [NFD_SupportTickets] ADD [Type] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    DECLARE @var1 nvarchar(max);
    SELECT @var1 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[NFD_Messages]') AND [c].[name] = N'ReceiverId');
    IF @var1 IS NOT NULL EXEC(N'ALTER TABLE [NFD_Messages] DROP CONSTRAINT ' + @var1 + ';');
    ALTER TABLE [NFD_Messages] ALTER COLUMN [ReceiverId] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    ALTER TABLE [NFD_Messages] ADD [TicketId] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    ALTER TABLE [NFD_EvaluationTemplates] ADD [ModuleId] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    ALTER TABLE [NFD_EvaluationTemplates] ADD [Stage] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    ALTER TABLE [NFD_EvaluationCriteria] ADD [MaxPoints] decimal(18,2) NOT NULL DEFAULT 0.0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    CREATE TABLE [NFD_Badges] (
        [BadgeId] int NOT NULL IDENTITY,
        [Name] nvarchar(100) NOT NULL,
        [Description] nvarchar(300) NOT NULL,
        [Icon] nvarchar(20) NULL,
        [ConditionType] int NOT NULL,
        [ConditionValue] decimal(18,2) NOT NULL,
        CONSTRAINT [PK_NFD_Badges] PRIMARY KEY ([BadgeId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    CREATE TABLE [NFD_EvaluationCriterionScores] (
        [ScoreId] int NOT NULL IDENTITY,
        [Score] decimal(18,2) NOT NULL,
        [EvaluationId] int NOT NULL,
        [CriteriaId] int NOT NULL,
        CONSTRAINT [PK_NFD_EvaluationCriterionScores] PRIMARY KEY ([ScoreId]),
        CONSTRAINT [FK_NFD_EvaluationCriterionScores_NFD_EvaluationCriteria_CriteriaId] FOREIGN KEY ([CriteriaId]) REFERENCES [NFD_EvaluationCriteria] ([CriteriaId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_EvaluationCriterionScores_NFD_Evaluations_EvaluationId] FOREIGN KEY ([EvaluationId]) REFERENCES [NFD_Evaluations] ([EvaluationId]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    CREATE TABLE [NFD_FeedbackCriteria] (
        [CriterionId] int NOT NULL IDENTITY,
        [AppliesTo] int NOT NULL,
        [Name] nvarchar(150) NOT NULL,
        [OrderIndex] int NOT NULL,
        CONSTRAINT [PK_NFD_FeedbackCriteria] PRIMARY KEY ([CriterionId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    CREATE TABLE [NFD_Feedbacks] (
        [FeedbackId] int NOT NULL IDENTITY,
        [Type] int NOT NULL,
        [Comment] nvarchar(max) NULL,
        [SubmittedAt] datetime2 NOT NULL,
        [TraineeId] int NOT NULL,
        [ModuleId] int NOT NULL,
        [TrainerId] int NULL,
        [BatchId] int NULL,
        CONSTRAINT [PK_NFD_Feedbacks] PRIMARY KEY ([FeedbackId]),
        CONSTRAINT [FK_NFD_Feedbacks_NFD_Batches_BatchId] FOREIGN KEY ([BatchId]) REFERENCES [NFD_Batches] ([BatchId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_Feedbacks_NFD_Modules_ModuleId] FOREIGN KEY ([ModuleId]) REFERENCES [NFD_Modules] ([ModuleId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_Feedbacks_NFD_Trainees_TraineeId] FOREIGN KEY ([TraineeId]) REFERENCES [NFD_Trainees] ([TraineeId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_Feedbacks_NFD_Trainers_TrainerId] FOREIGN KEY ([TrainerId]) REFERENCES [NFD_Trainers] ([TrainerId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    CREATE TABLE [NFD_TraineeBadges] (
        [TraineeBadgeId] int NOT NULL IDENTITY,
        [EarnedAt] datetime2 NOT NULL,
        [TraineeId] int NOT NULL,
        [BadgeId] int NOT NULL,
        CONSTRAINT [PK_NFD_TraineeBadges] PRIMARY KEY ([TraineeBadgeId]),
        CONSTRAINT [FK_NFD_TraineeBadges_NFD_Badges_BadgeId] FOREIGN KEY ([BadgeId]) REFERENCES [NFD_Badges] ([BadgeId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_TraineeBadges_NFD_Trainees_TraineeId] FOREIGN KEY ([TraineeId]) REFERENCES [NFD_Trainees] ([TraineeId]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    CREATE TABLE [NFD_FeedbackScores] (
        [FeedbackScoreId] int NOT NULL IDENTITY,
        [Score] int NOT NULL,
        [FeedbackId] int NOT NULL,
        [CriterionId] int NOT NULL,
        CONSTRAINT [PK_NFD_FeedbackScores] PRIMARY KEY ([FeedbackScoreId]),
        CONSTRAINT [FK_NFD_FeedbackScores_NFD_FeedbackCriteria_CriterionId] FOREIGN KEY ([CriterionId]) REFERENCES [NFD_FeedbackCriteria] ([CriterionId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_FeedbackScores_NFD_Feedbacks_FeedbackId] FOREIGN KEY ([FeedbackId]) REFERENCES [NFD_Feedbacks] ([FeedbackId]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    CREATE INDEX [IX_NFD_Warnings_CompanyId] ON [NFD_Warnings] ([CompanyId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    CREATE INDEX [IX_NFD_Messages_TicketId] ON [NFD_Messages] ([TicketId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    CREATE INDEX [IX_NFD_EvaluationTemplates_ModuleId] ON [NFD_EvaluationTemplates] ([ModuleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    CREATE INDEX [IX_NFD_EvaluationCriterionScores_CriteriaId] ON [NFD_EvaluationCriterionScores] ([CriteriaId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    CREATE INDEX [IX_NFD_EvaluationCriterionScores_EvaluationId] ON [NFD_EvaluationCriterionScores] ([EvaluationId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    CREATE INDEX [IX_NFD_Feedbacks_BatchId] ON [NFD_Feedbacks] ([BatchId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    CREATE INDEX [IX_NFD_Feedbacks_ModuleId] ON [NFD_Feedbacks] ([ModuleId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    CREATE INDEX [IX_NFD_Feedbacks_TraineeId] ON [NFD_Feedbacks] ([TraineeId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    CREATE INDEX [IX_NFD_Feedbacks_TrainerId] ON [NFD_Feedbacks] ([TrainerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    CREATE INDEX [IX_NFD_FeedbackScores_CriterionId] ON [NFD_FeedbackScores] ([CriterionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    CREATE INDEX [IX_NFD_FeedbackScores_FeedbackId] ON [NFD_FeedbackScores] ([FeedbackId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    CREATE INDEX [IX_NFD_TraineeBadges_BadgeId] ON [NFD_TraineeBadges] ([BadgeId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    CREATE UNIQUE INDEX [IX_NFD_TraineeBadges_TraineeId_BadgeId] ON [NFD_TraineeBadges] ([TraineeId], [BadgeId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    ALTER TABLE [NFD_EvaluationTemplates] ADD CONSTRAINT [FK_NFD_EvaluationTemplates_NFD_Modules_ModuleId] FOREIGN KEY ([ModuleId]) REFERENCES [NFD_Modules] ([ModuleId]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    ALTER TABLE [NFD_Messages] ADD CONSTRAINT [FK_NFD_Messages_NFD_SupportTickets_TicketId] FOREIGN KEY ([TicketId]) REFERENCES [NFD_SupportTickets] ([TicketId]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    ALTER TABLE [NFD_Warnings] ADD CONSTRAINT [FK_NFD_Warnings_NFD_Companies_CompanyId] FOREIGN KEY ([CompanyId]) REFERENCES [NFD_Companies] ([CompanyId]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260815220616_updateBusinessCases'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260815220616_updateBusinessCases', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260818093425_MakeUserIdNullableInCompany'
)
BEGIN
    DROP INDEX [IX_NFD_Companies_UserId] ON [NFD_Companies];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260818093425_MakeUserIdNullableInCompany'
)
BEGIN
    DECLARE @var2 nvarchar(max);
    SELECT @var2 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[NFD_Companies]') AND [c].[name] = N'UserId');
    IF @var2 IS NOT NULL EXEC(N'ALTER TABLE [NFD_Companies] DROP CONSTRAINT ' + @var2 + ';');
    ALTER TABLE [NFD_Companies] ALTER COLUMN [UserId] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260818093425_MakeUserIdNullableInCompany'
)
BEGIN
    EXEC(N'CREATE UNIQUE INDEX [IX_NFD_Companies_UserId] ON [NFD_Companies] ([UserId]) WHERE [UserId] IS NOT NULL');
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260818093425_MakeUserIdNullableInCompany'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260818093425_MakeUserIdNullableInCompany', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260824100026_AddProfileImagesToTrainerAndTrainee'
)
BEGIN
    ALTER TABLE [NFD_Trainers] ADD [ProfileImageUrl] nvarchar(300) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260824100026_AddProfileImagesToTrainerAndTrainee'
)
BEGIN
    ALTER TABLE [NFD_Trainees] ADD [ProfileImageUrl] nvarchar(300) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20260824100026_AddProfileImagesToTrainerAndTrainee'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20260824100026_AddProfileImagesToTrainerAndTrainee', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261006050558_AddLessonFeedback'
)
BEGIN
    CREATE TABLE [NFD_LessonFeedbacks] (
        [LessonFeedbackId] int NOT NULL IDENTITY,
        [LessonId] int NOT NULL,
        [TraineeId] int NOT NULL,
        [Note] nvarchar(2000) NULL,
        [Rating] int NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        CONSTRAINT [PK_NFD_LessonFeedbacks] PRIMARY KEY ([LessonFeedbackId]),
        CONSTRAINT [FK_NFD_LessonFeedbacks_NFD_Lessons_LessonId] FOREIGN KEY ([LessonId]) REFERENCES [NFD_Lessons] ([LessonId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_LessonFeedbacks_NFD_Trainees_TraineeId] FOREIGN KEY ([TraineeId]) REFERENCES [NFD_Trainees] ([TraineeId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261006050558_AddLessonFeedback'
)
BEGIN
    CREATE INDEX [IX_NFD_LessonFeedbacks_LessonId] ON [NFD_LessonFeedbacks] ([LessonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261006050558_AddLessonFeedback'
)
BEGIN
    CREATE UNIQUE INDEX [IX_NFD_LessonFeedbacks_TraineeId_LessonId] ON [NFD_LessonFeedbacks] ([TraineeId], [LessonId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261006050558_AddLessonFeedback'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261006050558_AddLessonFeedback', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261006112644_AddConversationAttachments'
)
BEGIN
    ALTER TABLE [NFD_Messages] ADD [AttachmentContentType] nvarchar(100) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261006112644_AddConversationAttachments'
)
BEGIN
    ALTER TABLE [NFD_Messages] ADD [AttachmentFileName] nvarchar(255) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261006112644_AddConversationAttachments'
)
BEGIN
    ALTER TABLE [NFD_Messages] ADD [AttachmentFileSize] bigint NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261006112644_AddConversationAttachments'
)
BEGIN
    ALTER TABLE [NFD_Messages] ADD [AttachmentUrl] nvarchar(500) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261006112644_AddConversationAttachments'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261006112644_AddConversationAttachments', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007054313_AddTrainerCertificates'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261007054313_AddTrainerCertificates', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007060957_CreateTrainerCertificatesTable'
)
BEGIN
    CREATE TABLE [NFD_TrainerCertificates] (
        [TrainerCertificateId] int NOT NULL IDENTITY,
        [TrainerId] int NOT NULL,
        [CertificateName] nvarchar(200) NOT NULL,
        [Issuer] nvarchar(200) NULL,
        [IssueDate] datetime2 NULL,
        [ExpiryDate] datetime2 NULL,
        [FileUrl] nvarchar(500) NOT NULL,
        [OriginalFileName] nvarchar(255) NULL,
        [ContentType] nvarchar(100) NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_NFD_TrainerCertificates] PRIMARY KEY ([TrainerCertificateId]),
        CONSTRAINT [FK_NFD_TrainerCertificates_NFD_Trainers_TrainerId] FOREIGN KEY ([TrainerId]) REFERENCES [NFD_Trainers] ([TrainerId]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007060957_CreateTrainerCertificatesTable'
)
BEGIN
    CREATE INDEX [IX_NFD_TrainerCertificates_TrainerId] ON [NFD_TrainerCertificates] ([TrainerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007060957_CreateTrainerCertificatesTable'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261007060957_CreateTrainerCertificatesTable', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007071146_AddTrainerAttendance'
)
BEGIN
    CREATE TABLE [NFD_TrainerAttendances] (
        [TrainerAttendanceId] int NOT NULL IDENTITY,
        [Date] date NOT NULL,
        [Status] int NOT NULL,
        [CheckInTime] time NULL,
        [CheckOutTime] time NULL,
        [Reason] nvarchar(500) NULL,
        [ExcuseProofUrl] nvarchar(300) NULL,
        [IsConfirmed] bit NOT NULL,
        [ConfirmedAt] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NULL,
        [CompanyId] int NOT NULL,
        [TrainerId] int NOT NULL,
        CONSTRAINT [PK_NFD_TrainerAttendances] PRIMARY KEY ([TrainerAttendanceId]),
        CONSTRAINT [FK_NFD_TrainerAttendances_NFD_Companies_CompanyId] FOREIGN KEY ([CompanyId]) REFERENCES [NFD_Companies] ([CompanyId]) ON DELETE CASCADE,
        CONSTRAINT [FK_NFD_TrainerAttendances_NFD_Trainers_TrainerId] FOREIGN KEY ([TrainerId]) REFERENCES [NFD_Trainers] ([TrainerId]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007071146_AddTrainerAttendance'
)
BEGIN
    CREATE INDEX [IX_NFD_TrainerAttendances_CompanyId] ON [NFD_TrainerAttendances] ([CompanyId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007071146_AddTrainerAttendance'
)
BEGIN
    CREATE INDEX [IX_NFD_TrainerAttendances_TrainerId] ON [NFD_TrainerAttendances] ([TrainerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007071146_AddTrainerAttendance'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261007071146_AddTrainerAttendance', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007071750_AddAttendance'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261007071750_AddAttendance', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007091944_AddConversationGroupMember'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261007091944_AddConversationGroupMember', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007095422_AddCompanyCoursePlans'
)
BEGIN
    CREATE TABLE [NFD_CoursePlans] (
        [PlanId] int NOT NULL IDENTITY,
        [CompanyId] int NOT NULL,
        [CreatedByUserId] int NOT NULL,
        [Title] nvarchar(150) NOT NULL,
        [Description] nvarchar(max) NULL,
        [Category] nvarchar(100) NULL,
        [DurationHours] decimal(18,2) NOT NULL,
        [StartDate] datetime2 NOT NULL,
        [EndDate] datetime2 NOT NULL,
        [ApprovalStatus] int NOT NULL,
        [ExecutionStatus] int NOT NULL,
        [SubmittedAt] datetime2 NULL,
        [ReviewedAt] datetime2 NULL,
        [ReviewedByUserId] int NULL,
        [ReviewNote] nvarchar(max) NULL,
        [StartedAt] datetime2 NULL,
        [CompletedAt] datetime2 NULL,
        [CreatedAt] datetime2 NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_NFD_CoursePlans] PRIMARY KEY ([PlanId]),
        CONSTRAINT [FK_NFD_CoursePlans_NFD_Companies_CompanyId] FOREIGN KEY ([CompanyId]) REFERENCES [NFD_Companies] ([CompanyId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_CoursePlans_NFD_Users_CreatedByUserId] FOREIGN KEY ([CreatedByUserId]) REFERENCES [NFD_Users] ([UserId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_CoursePlans_NFD_Users_ReviewedByUserId] FOREIGN KEY ([ReviewedByUserId]) REFERENCES [NFD_Users] ([UserId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007095422_AddCompanyCoursePlans'
)
BEGIN
    CREATE TABLE [NFD_CoursePlanStages] (
        [StageId] int NOT NULL IDENTITY,
        [PlanId] int NOT NULL,
        [Title] nvarchar(150) NOT NULL,
        [Description] nvarchar(max) NULL,
        [OrderIndex] int NOT NULL,
        [StartDate] datetime2 NOT NULL,
        [EndDate] datetime2 NOT NULL,
        [TrainerId] int NULL,
        [Status] int NOT NULL,
        CONSTRAINT [PK_NFD_CoursePlanStages] PRIMARY KEY ([StageId]),
        CONSTRAINT [FK_NFD_CoursePlanStages_NFD_CoursePlans_PlanId] FOREIGN KEY ([PlanId]) REFERENCES [NFD_CoursePlans] ([PlanId]) ON DELETE CASCADE,
        CONSTRAINT [FK_NFD_CoursePlanStages_NFD_Trainers_TrainerId] FOREIGN KEY ([TrainerId]) REFERENCES [NFD_Trainers] ([TrainerId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007095422_AddCompanyCoursePlans'
)
BEGIN
    CREATE TABLE [NFD_CoursePlanItems] (
        [ItemId] int NOT NULL IDENTITY,
        [StageId] int NOT NULL,
        [ItemType] int NOT NULL,
        [Title] nvarchar(150) NOT NULL,
        [Description] nvarchar(max) NULL,
        [DueDate] datetime2 NOT NULL,
        [Priority] int NOT NULL,
        [Status] int NOT NULL,
        [TrainerId] int NULL,
        CONSTRAINT [PK_NFD_CoursePlanItems] PRIMARY KEY ([ItemId]),
        CONSTRAINT [FK_NFD_CoursePlanItems_NFD_CoursePlanStages_StageId] FOREIGN KEY ([StageId]) REFERENCES [NFD_CoursePlanStages] ([StageId]) ON DELETE CASCADE,
        CONSTRAINT [FK_NFD_CoursePlanItems_NFD_Trainers_TrainerId] FOREIGN KEY ([TrainerId]) REFERENCES [NFD_Trainers] ([TrainerId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007095422_AddCompanyCoursePlans'
)
BEGIN
    CREATE TABLE [NFD_CoursePlanNotes] (
        [NoteId] int NOT NULL IDENTITY,
        [PlanId] int NOT NULL,
        [StageId] int NULL,
        [ItemId] int NULL,
        [UserId] int NOT NULL,
        [Text] nvarchar(max) NOT NULL,
        [IsAuthority] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_NFD_CoursePlanNotes] PRIMARY KEY ([NoteId]),
        CONSTRAINT [FK_NFD_CoursePlanNotes_NFD_CoursePlanItems_ItemId] FOREIGN KEY ([ItemId]) REFERENCES [NFD_CoursePlanItems] ([ItemId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_CoursePlanNotes_NFD_CoursePlanStages_StageId] FOREIGN KEY ([StageId]) REFERENCES [NFD_CoursePlanStages] ([StageId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_CoursePlanNotes_NFD_CoursePlans_PlanId] FOREIGN KEY ([PlanId]) REFERENCES [NFD_CoursePlans] ([PlanId]) ON DELETE CASCADE,
        CONSTRAINT [FK_NFD_CoursePlanNotes_NFD_Users_UserId] FOREIGN KEY ([UserId]) REFERENCES [NFD_Users] ([UserId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007095422_AddCompanyCoursePlans'
)
BEGIN
    CREATE INDEX [IX_NFD_CoursePlanItems_StageId] ON [NFD_CoursePlanItems] ([StageId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007095422_AddCompanyCoursePlans'
)
BEGIN
    CREATE INDEX [IX_NFD_CoursePlanItems_TrainerId] ON [NFD_CoursePlanItems] ([TrainerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007095422_AddCompanyCoursePlans'
)
BEGIN
    CREATE INDEX [IX_NFD_CoursePlanNotes_ItemId] ON [NFD_CoursePlanNotes] ([ItemId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007095422_AddCompanyCoursePlans'
)
BEGIN
    CREATE INDEX [IX_NFD_CoursePlanNotes_PlanId] ON [NFD_CoursePlanNotes] ([PlanId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007095422_AddCompanyCoursePlans'
)
BEGIN
    CREATE INDEX [IX_NFD_CoursePlanNotes_StageId] ON [NFD_CoursePlanNotes] ([StageId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007095422_AddCompanyCoursePlans'
)
BEGIN
    CREATE INDEX [IX_NFD_CoursePlanNotes_UserId] ON [NFD_CoursePlanNotes] ([UserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007095422_AddCompanyCoursePlans'
)
BEGIN
    CREATE INDEX [IX_NFD_CoursePlans_CompanyId_ApprovalStatus] ON [NFD_CoursePlans] ([CompanyId], [ApprovalStatus]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007095422_AddCompanyCoursePlans'
)
BEGIN
    CREATE INDEX [IX_NFD_CoursePlans_CreatedByUserId] ON [NFD_CoursePlans] ([CreatedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007095422_AddCompanyCoursePlans'
)
BEGIN
    CREATE INDEX [IX_NFD_CoursePlans_ReviewedByUserId] ON [NFD_CoursePlans] ([ReviewedByUserId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007095422_AddCompanyCoursePlans'
)
BEGIN
    CREATE INDEX [IX_NFD_CoursePlanStages_PlanId] ON [NFD_CoursePlanStages] ([PlanId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007095422_AddCompanyCoursePlans'
)
BEGIN
    CREATE INDEX [IX_NFD_CoursePlanStages_TrainerId] ON [NFD_CoursePlanStages] ([TrainerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007095422_AddCompanyCoursePlans'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261007095422_AddCompanyCoursePlans', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007101133_AddRemediationRequestsTable'
)
BEGIN
    CREATE TABLE [NFD_RemediationRequests] (
        [RequestId] int NOT NULL IDENTITY,
        [WarningId] int NOT NULL,
        [CompanyId] int NOT NULL,
        [RequestedAction] nvarchar(500) NOT NULL,
        [SubmissionDate] datetime2 NOT NULL,
        [Status] int NOT NULL,
        [ReviewNotes] nvarchar(1000) NULL,
        [ReviewedByUserId] int NULL,
        [ReviewedDate] datetime2 NULL,
        CONSTRAINT [PK_NFD_RemediationRequests] PRIMARY KEY ([RequestId]),
        CONSTRAINT [FK_NFD_RemediationRequests_NFD_Companies_CompanyId] FOREIGN KEY ([CompanyId]) REFERENCES [NFD_Companies] ([CompanyId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_RemediationRequests_NFD_Warnings_WarningId] FOREIGN KEY ([WarningId]) REFERENCES [NFD_Warnings] ([WarningId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007101133_AddRemediationRequestsTable'
)
BEGIN
    CREATE INDEX [IX_NFD_RemediationRequests_CompanyId] ON [NFD_RemediationRequests] ([CompanyId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007101133_AddRemediationRequestsTable'
)
BEGIN
    CREATE INDEX [IX_NFD_RemediationRequests_WarningId] ON [NFD_RemediationRequests] ([WarningId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007101133_AddRemediationRequestsTable'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261007101133_AddRemediationRequestsTable', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007104718_AddTraineeAddressAndBankFields'
)
BEGIN
    ALTER TABLE [NFD_Trainees] ADD [AccountHolderName] nvarchar(150) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007104718_AddTraineeAddressAndBankFields'
)
BEGIN
    ALTER TABLE [NFD_Trainees] ADD [AccountNumber] nvarchar(50) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007104718_AddTraineeAddressAndBankFields'
)
BEGIN
    ALTER TABLE [NFD_Trainees] ADD [BankBranch] nvarchar(150) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007104718_AddTraineeAddressAndBankFields'
)
BEGIN
    ALTER TABLE [NFD_Trainees] ADD [BankName] nvarchar(150) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007104718_AddTraineeAddressAndBankFields'
)
BEGIN
    ALTER TABLE [NFD_Trainees] ADD [Governorate] nvarchar(100) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007104718_AddTraineeAddressAndBankFields'
)
BEGIN
    ALTER TABLE [NFD_Trainees] ADD [IBAN] nvarchar(50) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007104718_AddTraineeAddressAndBankFields'
)
BEGIN
    ALTER TABLE [NFD_Trainees] ADD [Village] nvarchar(100) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007104718_AddTraineeAddressAndBankFields'
)
BEGIN
    ALTER TABLE [NFD_Trainees] ADD [Wilaya] nvarchar(100) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261007104718_AddTraineeAddressAndBankFields'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261007104718_AddTraineeAddressAndBankFields', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261008035816_SyncRejectionReason'
)
BEGIN
    IF COL_LENGTH('NFD_Companies', 'RejectionReason') IS NULL
    BEGIN
        ALTER TABLE [NFD_Companies]
        ADD [RejectionReason] nvarchar(max) NULL;
    END
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261008035816_SyncRejectionReason'
)
BEGIN
    IF OBJECT_ID(N'[NFD_RemediationRequests]', N'U') IS NULL
    BEGIN
        CREATE TABLE [NFD_RemediationRequests] (
            [RequestId] int NOT NULL IDENTITY,
            [WarningId] int NOT NULL,
            [CompanyId] int NOT NULL,
            [RequestedAction] nvarchar(500) NOT NULL,
            [SubmissionDate] datetime2 NOT NULL,
            [Status] int NOT NULL,
            [ReviewNotes] nvarchar(1000) NULL,
            [ReviewedByUserId] int NULL,
            [ReviewedDate] datetime2 NULL,
            CONSTRAINT [PK_NFD_RemediationRequests] PRIMARY KEY ([RequestId]),
            CONSTRAINT [FK_NFD_RemediationRequests_NFD_Companies_CompanyId] FOREIGN KEY ([CompanyId]) REFERENCES [NFD_Companies] ([CompanyId]) ON DELETE NO ACTION,
            CONSTRAINT [FK_NFD_RemediationRequests_NFD_Warnings_WarningId] FOREIGN KEY ([WarningId]) REFERENCES [NFD_Warnings] ([WarningId]) ON DELETE NO ACTION
        );
    END
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261008035816_SyncRejectionReason'
)
BEGIN
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_NFD_RemediationRequests_CompanyId' AND object_id = OBJECT_ID(N'[NFD_RemediationRequests]'))
    BEGIN
        CREATE INDEX [IX_NFD_RemediationRequests_CompanyId] ON [NFD_RemediationRequests] ([CompanyId]);
    END

    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_NFD_RemediationRequests_WarningId' AND object_id = OBJECT_ID(N'[NFD_RemediationRequests]'))
    BEGIN
        CREATE INDEX [IX_NFD_RemediationRequests_WarningId] ON [NFD_RemediationRequests] ([WarningId]);
    END
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261008035816_SyncRejectionReason'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261008035816_SyncRejectionReason', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261008052631_AddTraineeSkills'
)
BEGIN
    DECLARE @var3 nvarchar(max);
    SELECT @var3 = QUOTENAME([d].[name])
    FROM [sys].[default_constraints] [d]
    INNER JOIN [sys].[columns] [c] ON [d].[parent_column_id] = [c].[column_id] AND [d].[parent_object_id] = [c].[object_id]
    WHERE ([d].[parent_object_id] = OBJECT_ID(N'[NFD_Trainees]') AND [c].[name] = N'Skills');
    IF @var3 IS NOT NULL EXEC(N'ALTER TABLE [NFD_Trainees] DROP CONSTRAINT ' + @var3 + ';');
    ALTER TABLE [NFD_Trainees] DROP COLUMN [Skills];
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261008052631_AddTraineeSkills'
)
BEGIN
    CREATE TABLE [NFD_TraineeSkills] (
        [TraineeSkillId] int NOT NULL IDENTITY,
        [TraineeId] int NOT NULL,
        [SkillName] nvarchar(max) NOT NULL,
        [SerialNumber] nvarchar(max) NULL,
        [CertificateUrl] nvarchar(max) NULL,
        CONSTRAINT [PK_NFD_TraineeSkills] PRIMARY KEY ([TraineeSkillId]),
        CONSTRAINT [FK_NFD_TraineeSkills_NFD_Trainees_TraineeId] FOREIGN KEY ([TraineeId]) REFERENCES [NFD_Trainees] ([TraineeId]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261008052631_AddTraineeSkills'
)
BEGIN
    CREATE INDEX [IX_NFD_TraineeSkills_TraineeId] ON [NFD_TraineeSkills] ([TraineeId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261008052631_AddTraineeSkills'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261008052631_AddTraineeSkills', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261008055801_AddConversationGroupMembers'
)
BEGIN
    CREATE TABLE [NFD_ConversationGroupMembers] (
        [Id] int NOT NULL IDENTITY,
        [ConversationId] int NOT NULL,
        [UserId] int NOT NULL,
        [BatchId] int NOT NULL,
        CONSTRAINT [PK_NFD_ConversationGroupMembers] PRIMARY KEY ([Id])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261008055801_AddConversationGroupMembers'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261008055801_AddConversationGroupMembers', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261008083600_LinkCoursePlansToProgramsAndAddTrainerAssignments'
)
BEGIN
    ALTER TABLE [NFD_CoursePlans] ADD [ProgramId] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261008083600_LinkCoursePlansToProgramsAndAddTrainerAssignments'
)
BEGIN
    CREATE TABLE [NFD_CoursePlanStageTrainers] (
        [StageId] int NOT NULL,
        [TrainerId] int NOT NULL,
        CONSTRAINT [PK_NFD_CoursePlanStageTrainers] PRIMARY KEY ([StageId], [TrainerId]),
        CONSTRAINT [FK_NFD_CoursePlanStageTrainers_NFD_CoursePlanStages_StageId] FOREIGN KEY ([StageId]) REFERENCES [NFD_CoursePlanStages] ([StageId]) ON DELETE CASCADE,
        CONSTRAINT [FK_NFD_CoursePlanStageTrainers_NFD_Trainers_TrainerId] FOREIGN KEY ([TrainerId]) REFERENCES [NFD_Trainers] ([TrainerId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261008083600_LinkCoursePlansToProgramsAndAddTrainerAssignments'
)
BEGIN
    CREATE TABLE [NFD_CoursePlanTrainers] (
        [PlanId] int NOT NULL,
        [TrainerId] int NOT NULL,
        CONSTRAINT [PK_NFD_CoursePlanTrainers] PRIMARY KEY ([PlanId], [TrainerId]),
        CONSTRAINT [FK_NFD_CoursePlanTrainers_NFD_CoursePlans_PlanId] FOREIGN KEY ([PlanId]) REFERENCES [NFD_CoursePlans] ([PlanId]) ON DELETE CASCADE,
        CONSTRAINT [FK_NFD_CoursePlanTrainers_NFD_Trainers_TrainerId] FOREIGN KEY ([TrainerId]) REFERENCES [NFD_Trainers] ([TrainerId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261008083600_LinkCoursePlansToProgramsAndAddTrainerAssignments'
)
BEGIN
    CREATE INDEX [IX_NFD_CoursePlans_ProgramId] ON [NFD_CoursePlans] ([ProgramId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261008083600_LinkCoursePlansToProgramsAndAddTrainerAssignments'
)
BEGIN
    CREATE INDEX [IX_NFD_CoursePlanStageTrainers_TrainerId] ON [NFD_CoursePlanStageTrainers] ([TrainerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261008083600_LinkCoursePlansToProgramsAndAddTrainerAssignments'
)
BEGIN
    CREATE INDEX [IX_NFD_CoursePlanTrainers_TrainerId] ON [NFD_CoursePlanTrainers] ([TrainerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261008083600_LinkCoursePlansToProgramsAndAddTrainerAssignments'
)
BEGIN
    ALTER TABLE [NFD_CoursePlans] ADD CONSTRAINT [FK_NFD_CoursePlans_NFD_Programs_ProgramId] FOREIGN KEY ([ProgramId]) REFERENCES [NFD_Programs] ([ProgramId]) ON DELETE NO ACTION;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261008083600_LinkCoursePlansToProgramsAndAddTrainerAssignments'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261008083600_LinkCoursePlansToProgramsAndAddTrainerAssignments', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012092811_AddCompanyReplyToWarning'
)
BEGIN
    ALTER TABLE [NFD_Warnings] ADD [CompanyReply] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261012092811_AddCompanyReplyToWarning'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261012092811_AddCompanyReplyToWarning', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261014050343_AddQuizModuleFoundation'
)
BEGIN
    CREATE TABLE [NFD_QuestionBank] (
        [QuestionId] int NOT NULL IDENTITY,
        [QuestionText] nvarchar(max) NOT NULL,
        [QuestionType] int NOT NULL,
        [Difficulty] int NOT NULL,
        [Points] decimal(18,2) NOT NULL,
        [TrainerId] int NOT NULL,
        [Explanation] nvarchar(max) NULL,
        [IsActive] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_NFD_QuestionBank] PRIMARY KEY ([QuestionId]),
        CONSTRAINT [FK_NFD_QuestionBank_NFD_Trainers_TrainerId] FOREIGN KEY ([TrainerId]) REFERENCES [NFD_Trainers] ([TrainerId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261014050343_AddQuizModuleFoundation'
)
BEGIN
    CREATE TABLE [NFD_Quizzes] (
        [QuizId] int NOT NULL IDENTITY,
        [Title] nvarchar(200) NOT NULL,
        [Description] nvarchar(max) NULL,
        [BatchId] int NOT NULL,
        [TrainerId] int NOT NULL,
        [StartDateTime] datetime2 NOT NULL,
        [EndDateTime] datetime2 NOT NULL,
        [DurationMinutes] int NOT NULL,
        [Status] int NOT NULL,
        [RandomizeQuestions] bit NOT NULL,
        [MaxAttempts] int NOT NULL,
        [CameraRequired] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_NFD_Quizzes] PRIMARY KEY ([QuizId]),
        CONSTRAINT [FK_NFD_Quizzes_NFD_Batches_BatchId] FOREIGN KEY ([BatchId]) REFERENCES [NFD_Batches] ([BatchId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_Quizzes_NFD_Trainers_TrainerId] FOREIGN KEY ([TrainerId]) REFERENCES [NFD_Trainers] ([TrainerId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261014050343_AddQuizModuleFoundation'
)
BEGIN
    CREATE TABLE [NFD_QuestionOptions] (
        [OptionId] int NOT NULL IDENTITY,
        [QuestionId] int NOT NULL,
        [OptionText] nvarchar(500) NOT NULL,
        [OptionCode] nvarchar(10) NOT NULL,
        [SortOrder] int NOT NULL,
        [IsCorrect] bit NOT NULL,
        CONSTRAINT [PK_NFD_QuestionOptions] PRIMARY KEY ([OptionId]),
        CONSTRAINT [FK_NFD_QuestionOptions_NFD_QuestionBank_QuestionId] FOREIGN KEY ([QuestionId]) REFERENCES [NFD_QuestionBank] ([QuestionId]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261014050343_AddQuizModuleFoundation'
)
BEGIN
    CREATE TABLE [NFD_QuizAttempts] (
        [AttemptId] int NOT NULL IDENTITY,
        [QuizId] int NOT NULL,
        [TraineeId] int NOT NULL,
        [AttemptNumber] int NOT NULL,
        [StartedAt] datetime2 NOT NULL,
        [SubmittedAt] datetime2 NULL,
        [Score] decimal(18,2) NOT NULL,
        [Percentage] decimal(18,2) NOT NULL,
        [Status] nvarchar(30) NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_NFD_QuizAttempts] PRIMARY KEY ([AttemptId]),
        CONSTRAINT [FK_NFD_QuizAttempts_NFD_Quizzes_QuizId] FOREIGN KEY ([QuizId]) REFERENCES [NFD_Quizzes] ([QuizId]) ON DELETE CASCADE,
        CONSTRAINT [FK_NFD_QuizAttempts_NFD_Trainees_TraineeId] FOREIGN KEY ([TraineeId]) REFERENCES [NFD_Trainees] ([TraineeId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261014050343_AddQuizModuleFoundation'
)
BEGIN
    CREATE TABLE [NFD_QuizQuestions] (
        [QuizQuestionId] int NOT NULL IDENTITY,
        [QuizId] int NOT NULL,
        [QuestionId] int NOT NULL,
        [QuestionOrder] int NOT NULL,
        [Points] decimal(18,2) NOT NULL,
        CONSTRAINT [PK_NFD_QuizQuestions] PRIMARY KEY ([QuizQuestionId]),
        CONSTRAINT [FK_NFD_QuizQuestions_NFD_QuestionBank_QuestionId] FOREIGN KEY ([QuestionId]) REFERENCES [NFD_QuestionBank] ([QuestionId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_QuizQuestions_NFD_Quizzes_QuizId] FOREIGN KEY ([QuizId]) REFERENCES [NFD_Quizzes] ([QuizId]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261014050343_AddQuizModuleFoundation'
)
BEGIN
    CREATE TABLE [NFD_AttemptQuestions] (
        [AttemptQuestionId] int NOT NULL IDENTITY,
        [AttemptId] int NOT NULL,
        [QuestionId] int NOT NULL,
        [QuestionOrder] int NOT NULL,
        [Points] decimal(18,2) NOT NULL,
        CONSTRAINT [PK_NFD_AttemptQuestions] PRIMARY KEY ([AttemptQuestionId]),
        CONSTRAINT [FK_NFD_AttemptQuestions_NFD_QuestionBank_QuestionId] FOREIGN KEY ([QuestionId]) REFERENCES [NFD_QuestionBank] ([QuestionId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_AttemptQuestions_NFD_QuizAttempts_AttemptId] FOREIGN KEY ([AttemptId]) REFERENCES [NFD_QuizAttempts] ([AttemptId]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261014050343_AddQuizModuleFoundation'
)
BEGIN
    CREATE TABLE [NFD_QuizAnswers] (
        [AnswerId] int NOT NULL IDENTITY,
        [AttemptQuestionId] int NOT NULL,
        [SelectedOptionId] int NULL,
        [TextAnswer] nvarchar(max) NULL,
        [IsCorrect] bit NULL,
        [AwardedPoints] decimal(18,2) NOT NULL,
        [IsMarkedForReview] bit NOT NULL,
        [AnsweredAt] datetime2 NULL,
        CONSTRAINT [PK_NFD_QuizAnswers] PRIMARY KEY ([AnswerId]),
        CONSTRAINT [FK_NFD_QuizAnswers_NFD_AttemptQuestions_AttemptQuestionId] FOREIGN KEY ([AttemptQuestionId]) REFERENCES [NFD_AttemptQuestions] ([AttemptQuestionId]) ON DELETE CASCADE,
        CONSTRAINT [FK_NFD_QuizAnswers_NFD_QuestionOptions_SelectedOptionId] FOREIGN KEY ([SelectedOptionId]) REFERENCES [NFD_QuestionOptions] ([OptionId])
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261014050343_AddQuizModuleFoundation'
)
BEGIN
    CREATE INDEX [IX_NFD_AttemptQuestions_AttemptId] ON [NFD_AttemptQuestions] ([AttemptId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261014050343_AddQuizModuleFoundation'
)
BEGIN
    CREATE INDEX [IX_NFD_AttemptQuestions_QuestionId] ON [NFD_AttemptQuestions] ([QuestionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261014050343_AddQuizModuleFoundation'
)
BEGIN
    CREATE INDEX [IX_NFD_QuestionBank_TrainerId] ON [NFD_QuestionBank] ([TrainerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261014050343_AddQuizModuleFoundation'
)
BEGIN
    CREATE INDEX [IX_NFD_QuestionOptions_QuestionId] ON [NFD_QuestionOptions] ([QuestionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261014050343_AddQuizModuleFoundation'
)
BEGIN
    CREATE INDEX [IX_NFD_QuizAnswers_AttemptQuestionId] ON [NFD_QuizAnswers] ([AttemptQuestionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261014050343_AddQuizModuleFoundation'
)
BEGIN
    CREATE INDEX [IX_NFD_QuizAnswers_SelectedOptionId] ON [NFD_QuizAnswers] ([SelectedOptionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261014050343_AddQuizModuleFoundation'
)
BEGIN
    CREATE INDEX [IX_NFD_QuizAttempts_QuizId] ON [NFD_QuizAttempts] ([QuizId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261014050343_AddQuizModuleFoundation'
)
BEGIN
    CREATE INDEX [IX_NFD_QuizAttempts_TraineeId] ON [NFD_QuizAttempts] ([TraineeId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261014050343_AddQuizModuleFoundation'
)
BEGIN
    CREATE INDEX [IX_NFD_QuizQuestions_QuestionId] ON [NFD_QuizQuestions] ([QuestionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261014050343_AddQuizModuleFoundation'
)
BEGIN
    CREATE INDEX [IX_NFD_QuizQuestions_QuizId] ON [NFD_QuizQuestions] ([QuizId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261014050343_AddQuizModuleFoundation'
)
BEGIN
    CREATE INDEX [IX_NFD_Quizzes_BatchId] ON [NFD_Quizzes] ([BatchId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261014050343_AddQuizModuleFoundation'
)
BEGIN
    CREATE INDEX [IX_NFD_Quizzes_TrainerId] ON [NFD_Quizzes] ([TrainerId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261014050343_AddQuizModuleFoundation'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261014050343_AddQuizModuleFoundation', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261014052139_FixPendingModelChanges'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261014052139_FixPendingModelChanges', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015060414_AddQuizAnswerManualGrading'
)
BEGIN
    ALTER TABLE [NFD_QuizAnswers] ADD [IsManuallyGraded] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015060414_AddQuizAnswerManualGrading'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261015060414_AddQuizAnswerManualGrading', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015061403_AddWithdrawalRequests'
)
BEGIN
    CREATE TABLE [NFD_WithdrawalRequests] (
        [Id] int NOT NULL IDENTITY,
        [TraineeId] int NOT NULL,
        [Reason] nvarchar(1000) NOT NULL,
        [Status] int NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [ReviewedAt] datetime2 NULL,
        [AdminNotes] nvarchar(max) NULL,
        CONSTRAINT [PK_NFD_WithdrawalRequests] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_NFD_WithdrawalRequests_NFD_Trainees_TraineeId] FOREIGN KEY ([TraineeId]) REFERENCES [NFD_Trainees] ([TraineeId]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015061403_AddWithdrawalRequests'
)
BEGIN
    CREATE INDEX [IX_NFD_WithdrawalRequests_TraineeId] ON [NFD_WithdrawalRequests] ([TraineeId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015061403_AddWithdrawalRequests'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261015061403_AddWithdrawalRequests', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015074843_AddQuizAttemptViolations'
)
BEGIN
    ALTER TABLE [NFD_QuizAttempts] ADD [IsTerminatedByViolation] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015074843_AddQuizAttemptViolations'
)
BEGIN
    ALTER TABLE [NFD_QuizAttempts] ADD [ViolationCount] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015074843_AddQuizAttemptViolations'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261015074843_AddQuizAttemptViolations', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015103437_AddQuizPassingPercentage'
)
BEGIN
    ALTER TABLE [NFD_Quizzes] ADD [PassingPercentage] decimal(18,2) NOT NULL DEFAULT 50.0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015103437_AddQuizPassingPercentage'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261015103437_AddQuizPassingPercentage', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015104921_AddTraineeEvaluation'
)
BEGIN
    CREATE TABLE [NFD_TraineeEvaluations] (
        [EvaluationId] int NOT NULL IDENTITY,
        [AttemptId] int NOT NULL,
        [Strengths] nvarchar(2000) NULL,
        [AreasForImprovement] nvarchar(2000) NULL,
        [Recommendations] nvarchar(2000) NULL,
        [TrainerNotes] nvarchar(2000) NULL,
        [IsCompleted] bit NOT NULL,
        [CreatedAt] datetime2 NOT NULL,
        [CompletedAt] datetime2 NULL,
        CONSTRAINT [PK_NFD_TraineeEvaluations] PRIMARY KEY ([EvaluationId]),
        CONSTRAINT [FK_NFD_TraineeEvaluations_NFD_QuizAttempts_AttemptId] FOREIGN KEY ([AttemptId]) REFERENCES [NFD_QuizAttempts] ([AttemptId]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015104921_AddTraineeEvaluation'
)
BEGIN
    CREATE UNIQUE INDEX [IX_NFD_TraineeEvaluations_AttemptId] ON [NFD_TraineeEvaluations] ([AttemptId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261015104921_AddTraineeEvaluation'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261015104921_AddTraineeEvaluation', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261018072005_AddUserGuideProgress'
)
BEGIN
    CREATE TABLE [NFD_UserGuideProgress] (
        [ProgressId] int NOT NULL IDENTITY,
        [TraineeId] int NOT NULL,
        [GuideKey] nvarchar(100) NOT NULL,
        [Status] nvarchar(20) NOT NULL,
        [UpdatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_NFD_UserGuideProgress] PRIMARY KEY ([ProgressId]),
        CONSTRAINT [FK_NFD_UserGuideProgress_NFD_Trainees_TraineeId] FOREIGN KEY ([TraineeId]) REFERENCES [NFD_Trainees] ([TraineeId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261018072005_AddUserGuideProgress'
)
BEGIN
    CREATE UNIQUE INDEX [IX_NFD_UserGuideProgress_TraineeId_GuideKey] ON [NFD_UserGuideProgress] ([TraineeId], [GuideKey]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261018072005_AddUserGuideProgress'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261018072005_AddUserGuideProgress', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261018073034_AddQuizSecuritySettings'
)
BEGIN
    ALTER TABLE [NFD_Quizzes] ADD [AllowBackNavigation] bit NOT NULL DEFAULT CAST(1 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261018073034_AddQuizSecuritySettings'
)
BEGIN
    ALTER TABLE [NFD_Quizzes] ADD [ExitLimitAction] int NOT NULL DEFAULT 1;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261018073034_AddQuizSecuritySettings'
)
BEGIN
    ALTER TABLE [NFD_Quizzes] ADD [MaxExitAttempts] int NOT NULL DEFAULT 0;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261018073034_AddQuizSecuritySettings'
)
BEGIN
    ALTER TABLE [NFD_Quizzes] ADD [PreventCopyPaste] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261018073034_AddQuizSecuritySettings'
)
BEGIN
    ALTER TABLE [NFD_Quizzes] ADD [RandomizeOptions] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261018073034_AddQuizSecuritySettings'
)
BEGIN
    ALTER TABLE [NFD_Quizzes] ADD [ShowCorrectAnswers] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261018073034_AddQuizSecuritySettings'
)
BEGIN
    ALTER TABLE [NFD_Quizzes] ADD [ShowOneQuestionAtTime] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261018073034_AddQuizSecuritySettings'
)
BEGIN
    ALTER TABLE [NFD_Quizzes] ADD [ShowResultImmediately] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261018073034_AddQuizSecuritySettings'
)
BEGIN
    ALTER TABLE [NFD_Quizzes] ADD [ShowScoreToTrainee] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261018073034_AddQuizSecuritySettings'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261018073034_AddQuizSecuritySettings', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019064821_AddSessionRecordingVisibility'
)
BEGIN
    ALTER TABLE [NFD_Sessions] ADD [IsRecordingVisibleToTrainees] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019064821_AddSessionRecordingVisibility'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261019064821_AddSessionRecordingVisibility', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019073331_AddQuizProctoring'
)
BEGIN
    ALTER TABLE [NFD_QuizAttempts] ADD [IdentityCheckStatus] nvarchar(20) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019073331_AddQuizProctoring'
)
BEGIN
    ALTER TABLE [NFD_QuizAttempts] ADD [NeedsManualReview] bit NOT NULL DEFAULT CAST(0 AS bit);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019073331_AddQuizProctoring'
)
BEGIN
    CREATE TABLE [NFD_QuizProctoringEvents] (
        [EventId] int NOT NULL IDENTITY,
        [AttemptId] int NOT NULL,
        [EventType] nvarchar(40) NOT NULL,
        [Details] nvarchar(500) NULL,
        [SnapshotFileName] nvarchar(100) NULL,
        [CreatedAt] datetime2 NOT NULL,
        CONSTRAINT [PK_NFD_QuizProctoringEvents] PRIMARY KEY ([EventId]),
        CONSTRAINT [FK_NFD_QuizProctoringEvents_NFD_QuizAttempts_AttemptId] FOREIGN KEY ([AttemptId]) REFERENCES [NFD_QuizAttempts] ([AttemptId]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019073331_AddQuizProctoring'
)
BEGIN
    CREATE INDEX [IX_NFD_QuizProctoringEvents_AttemptId] ON [NFD_QuizProctoringEvents] ([AttemptId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019073331_AddQuizProctoring'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261019073331_AddQuizProctoring', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019102827_AddSessionSurveys'
)
BEGIN
    CREATE TABLE [NFD_SessionSurveys] (
        [SurveyId] int NOT NULL IDENTITY,
        [SessionId] int NOT NULL,
        [Question] nvarchar(300) NOT NULL,
        [IsPublished] bit NOT NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_NFD_SessionSurveys] PRIMARY KEY ([SurveyId]),
        CONSTRAINT [FK_NFD_SessionSurveys_NFD_Sessions_SessionId] FOREIGN KEY ([SessionId]) REFERENCES [NFD_Sessions] ([SessionId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019102827_AddSessionSurveys'
)
BEGIN
    CREATE TABLE [NFD_SessionSurveyResponses] (
        [ResponseId] int NOT NULL IDENTITY,
        [SurveyId] int NOT NULL,
        [TraineeId] int NOT NULL,
        [Rating] int NOT NULL,
        [Comment] nvarchar(1000) NULL,
        [SubmittedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_NFD_SessionSurveyResponses] PRIMARY KEY ([ResponseId]),
        CONSTRAINT [FK_NFD_SessionSurveyResponses_NFD_SessionSurveys_SurveyId] FOREIGN KEY ([SurveyId]) REFERENCES [NFD_SessionSurveys] ([SurveyId]) ON DELETE CASCADE,
        CONSTRAINT [FK_NFD_SessionSurveyResponses_NFD_Trainees_TraineeId] FOREIGN KEY ([TraineeId]) REFERENCES [NFD_Trainees] ([TraineeId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019102827_AddSessionSurveys'
)
BEGIN
    CREATE UNIQUE INDEX [IX_NFD_SessionSurveyResponses_SurveyId_TraineeId] ON [NFD_SessionSurveyResponses] ([SurveyId], [TraineeId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019102827_AddSessionSurveys'
)
BEGIN
    CREATE INDEX [IX_NFD_SessionSurveyResponses_TraineeId] ON [NFD_SessionSurveyResponses] ([TraineeId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019102827_AddSessionSurveys'
)
BEGIN
    CREATE UNIQUE INDEX [IX_NFD_SessionSurveys_SessionId] ON [NFD_SessionSurveys] ([SessionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019102827_AddSessionSurveys'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261019102827_AddSessionSurveys', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019111447_AddTraineeReportFields'
)
BEGIN
    ALTER TABLE [NFD_Trainees] ADD [AttendanceNotes] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019111447_AddTraineeReportFields'
)
BEGIN
    ALTER TABLE [NFD_Trainees] ADD [AttendanceRate] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019111447_AddTraineeReportFields'
)
BEGIN
    ALTER TABLE [NFD_Trainees] ADD [BehavioralNotes] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019111447_AddTraineeReportFields'
)
BEGIN
    ALTER TABLE [NFD_Trainees] ADD [BehavioralScore] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019111447_AddTraineeReportFields'
)
BEGIN
    ALTER TABLE [NFD_Trainees] ADD [ProjectNotes] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019111447_AddTraineeReportFields'
)
BEGIN
    ALTER TABLE [NFD_Trainees] ADD [ProjectScore] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019111447_AddTraineeReportFields'
)
BEGIN
    ALTER TABLE [NFD_Trainees] ADD [TechnicalNotes] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019111447_AddTraineeReportFields'
)
BEGIN
    ALTER TABLE [NFD_Trainees] ADD [TechnicalScore] int NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019111447_AddTraineeReportFields'
)
BEGIN
    ALTER TABLE [NFD_Trainees] ADD [TrainerNotes] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019111447_AddTraineeReportFields'
)
BEGIN
    ALTER TABLE [NFD_Trainees] ADD [TrainerRecommendation] nvarchar(max) NULL;
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261019111447_AddTraineeReportFields'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261019111447_AddTraineeReportFields', N'10.0.10');
END;

COMMIT;
GO

BEGIN TRANSACTION;
IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021110746_AddTrainerLivePolls'
)
BEGIN
    CREATE TABLE [NFD_LivePolls] (
        [PollId] int NOT NULL IDENTITY,
        [SessionId] int NOT NULL,
        [Question] nvarchar(300) NOT NULL,
        [IsOpen] bit NOT NULL,
        [CreatedAtUtc] datetime2 NOT NULL,
        [ClosedAtUtc] datetime2 NULL,
        CONSTRAINT [PK_NFD_LivePolls] PRIMARY KEY ([PollId]),
        CONSTRAINT [FK_NFD_LivePolls_NFD_Sessions_SessionId] FOREIGN KEY ([SessionId]) REFERENCES [NFD_Sessions] ([SessionId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021110746_AddTrainerLivePolls'
)
BEGIN
    CREATE TABLE [NFD_LivePollOptions] (
        [OptionId] int NOT NULL IDENTITY,
        [PollId] int NOT NULL,
        [OptionText] nvarchar(200) NOT NULL,
        [SortOrder] int NOT NULL,
        CONSTRAINT [PK_NFD_LivePollOptions] PRIMARY KEY ([OptionId]),
        CONSTRAINT [FK_NFD_LivePollOptions_NFD_LivePolls_PollId] FOREIGN KEY ([PollId]) REFERENCES [NFD_LivePolls] ([PollId]) ON DELETE CASCADE
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021110746_AddTrainerLivePolls'
)
BEGIN
    CREATE TABLE [NFD_LivePollVotes] (
        [VoteId] int NOT NULL IDENTITY,
        [PollId] int NOT NULL,
        [OptionId] int NOT NULL,
        [TraineeId] int NOT NULL,
        [SubmittedAtUtc] datetime2 NOT NULL,
        CONSTRAINT [PK_NFD_LivePollVotes] PRIMARY KEY ([VoteId]),
        CONSTRAINT [FK_NFD_LivePollVotes_NFD_LivePollOptions_OptionId] FOREIGN KEY ([OptionId]) REFERENCES [NFD_LivePollOptions] ([OptionId]) ON DELETE NO ACTION,
        CONSTRAINT [FK_NFD_LivePollVotes_NFD_LivePolls_PollId] FOREIGN KEY ([PollId]) REFERENCES [NFD_LivePolls] ([PollId]) ON DELETE CASCADE,
        CONSTRAINT [FK_NFD_LivePollVotes_NFD_Trainees_TraineeId] FOREIGN KEY ([TraineeId]) REFERENCES [NFD_Trainees] ([TraineeId]) ON DELETE NO ACTION
    );
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021110746_AddTrainerLivePolls'
)
BEGIN
    CREATE INDEX [IX_NFD_LivePollOptions_PollId] ON [NFD_LivePollOptions] ([PollId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021110746_AddTrainerLivePolls'
)
BEGIN
    CREATE INDEX [IX_NFD_LivePolls_SessionId] ON [NFD_LivePolls] ([SessionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021110746_AddTrainerLivePolls'
)
BEGIN
    CREATE INDEX [IX_NFD_LivePollVotes_OptionId] ON [NFD_LivePollVotes] ([OptionId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021110746_AddTrainerLivePolls'
)
BEGIN
    CREATE UNIQUE INDEX [IX_NFD_LivePollVotes_PollId_TraineeId] ON [NFD_LivePollVotes] ([PollId], [TraineeId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021110746_AddTrainerLivePolls'
)
BEGIN
    CREATE INDEX [IX_NFD_LivePollVotes_TraineeId] ON [NFD_LivePollVotes] ([TraineeId]);
END;

IF NOT EXISTS (
    SELECT * FROM [__EFMigrationsHistory]
    WHERE [MigrationId] = N'20261021110746_AddTrainerLivePolls'
)
BEGIN
    INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
    VALUES (N'20261021110746_AddTrainerLivePolls', N'10.0.10');
END;

COMMIT;
GO

