BEGIN TRANSACTION;
CREATE TABLE [NFD_UserGuideProgress] (
    [ProgressId] int NOT NULL IDENTITY,
    [TraineeId] int NOT NULL,
    [GuideKey] nvarchar(100) NOT NULL,
    [Status] nvarchar(20) NOT NULL,
    [UpdatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_NFD_UserGuideProgress] PRIMARY KEY ([ProgressId]),
    CONSTRAINT [FK_NFD_UserGuideProgress_NFD_Trainees_TraineeId] FOREIGN KEY ([TraineeId]) REFERENCES [NFD_Trainees] ([TraineeId]) ON DELETE NO ACTION
);

CREATE UNIQUE INDEX [IX_NFD_UserGuideProgress_TraineeId_GuideKey] ON [NFD_UserGuideProgress] ([TraineeId], [GuideKey]);

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20261018072005_AddUserGuideProgress', N'10.0.10');

COMMIT;
GO

BEGIN TRANSACTION;
ALTER TABLE [NFD_Quizzes] ADD [AllowBackNavigation] bit NOT NULL DEFAULT CAST(1 AS bit);

ALTER TABLE [NFD_Quizzes] ADD [ExitLimitAction] int NOT NULL DEFAULT 1;

ALTER TABLE [NFD_Quizzes] ADD [MaxExitAttempts] int NOT NULL DEFAULT 0;

ALTER TABLE [NFD_Quizzes] ADD [PreventCopyPaste] bit NOT NULL DEFAULT CAST(0 AS bit);

ALTER TABLE [NFD_Quizzes] ADD [RandomizeOptions] bit NOT NULL DEFAULT CAST(0 AS bit);

ALTER TABLE [NFD_Quizzes] ADD [ShowCorrectAnswers] bit NOT NULL DEFAULT CAST(0 AS bit);

ALTER TABLE [NFD_Quizzes] ADD [ShowOneQuestionAtTime] bit NOT NULL DEFAULT CAST(0 AS bit);

ALTER TABLE [NFD_Quizzes] ADD [ShowResultImmediately] bit NOT NULL DEFAULT CAST(0 AS bit);

ALTER TABLE [NFD_Quizzes] ADD [ShowScoreToTrainee] bit NOT NULL DEFAULT CAST(0 AS bit);

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20261018073034_AddQuizSecuritySettings', N'10.0.10');

COMMIT;
GO

BEGIN TRANSACTION;
ALTER TABLE [NFD_Sessions] ADD [IsRecordingVisibleToTrainees] bit NOT NULL DEFAULT CAST(0 AS bit);

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20261019064821_AddSessionRecordingVisibility', N'10.0.10');

COMMIT;
GO

BEGIN TRANSACTION;
ALTER TABLE [NFD_QuizAttempts] ADD [IdentityCheckStatus] nvarchar(20) NULL;

ALTER TABLE [NFD_QuizAttempts] ADD [NeedsManualReview] bit NOT NULL DEFAULT CAST(0 AS bit);

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

CREATE INDEX [IX_NFD_QuizProctoringEvents_AttemptId] ON [NFD_QuizProctoringEvents] ([AttemptId]);

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20261019073331_AddQuizProctoring', N'10.0.10');

COMMIT;
GO

BEGIN TRANSACTION;
CREATE TABLE [NFD_SessionSurveys] (
    [SurveyId] int NOT NULL IDENTITY,
    [SessionId] int NOT NULL,
    [Question] nvarchar(300) NOT NULL,
    [IsPublished] bit NOT NULL,
    [CreatedAtUtc] datetime2 NOT NULL,
    CONSTRAINT [PK_NFD_SessionSurveys] PRIMARY KEY ([SurveyId]),
    CONSTRAINT [FK_NFD_SessionSurveys_NFD_Sessions_SessionId] FOREIGN KEY ([SessionId]) REFERENCES [NFD_Sessions] ([SessionId]) ON DELETE NO ACTION
);

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

CREATE UNIQUE INDEX [IX_NFD_SessionSurveyResponses_SurveyId_TraineeId] ON [NFD_SessionSurveyResponses] ([SurveyId], [TraineeId]);

CREATE INDEX [IX_NFD_SessionSurveyResponses_TraineeId] ON [NFD_SessionSurveyResponses] ([TraineeId]);

CREATE UNIQUE INDEX [IX_NFD_SessionSurveys_SessionId] ON [NFD_SessionSurveys] ([SessionId]);

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20261019102827_AddSessionSurveys', N'10.0.10');

COMMIT;
GO

BEGIN TRANSACTION;
ALTER TABLE [NFD_Trainees] ADD [AttendanceNotes] nvarchar(max) NULL;

ALTER TABLE [NFD_Trainees] ADD [AttendanceRate] int NULL;

ALTER TABLE [NFD_Trainees] ADD [BehavioralNotes] nvarchar(max) NULL;

ALTER TABLE [NFD_Trainees] ADD [BehavioralScore] int NULL;

ALTER TABLE [NFD_Trainees] ADD [ProjectNotes] nvarchar(max) NULL;

ALTER TABLE [NFD_Trainees] ADD [ProjectScore] int NULL;

ALTER TABLE [NFD_Trainees] ADD [TechnicalNotes] nvarchar(max) NULL;

ALTER TABLE [NFD_Trainees] ADD [TechnicalScore] int NULL;

ALTER TABLE [NFD_Trainees] ADD [TrainerNotes] nvarchar(max) NULL;

ALTER TABLE [NFD_Trainees] ADD [TrainerRecommendation] nvarchar(max) NULL;

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20261019111447_AddTraineeReportFields', N'10.0.10');

COMMIT;
GO

BEGIN TRANSACTION;
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

CREATE TABLE [NFD_LivePollOptions] (
    [OptionId] int NOT NULL IDENTITY,
    [PollId] int NOT NULL,
    [OptionText] nvarchar(200) NOT NULL,
    [SortOrder] int NOT NULL,
    CONSTRAINT [PK_NFD_LivePollOptions] PRIMARY KEY ([OptionId]),
    CONSTRAINT [FK_NFD_LivePollOptions_NFD_LivePolls_PollId] FOREIGN KEY ([PollId]) REFERENCES [NFD_LivePolls] ([PollId]) ON DELETE CASCADE
);

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

CREATE INDEX [IX_NFD_LivePollOptions_PollId] ON [NFD_LivePollOptions] ([PollId]);

CREATE INDEX [IX_NFD_LivePolls_SessionId] ON [NFD_LivePolls] ([SessionId]);

CREATE INDEX [IX_NFD_LivePollVotes_OptionId] ON [NFD_LivePollVotes] ([OptionId]);

CREATE UNIQUE INDEX [IX_NFD_LivePollVotes_PollId_TraineeId] ON [NFD_LivePollVotes] ([PollId], [TraineeId]);

CREATE INDEX [IX_NFD_LivePollVotes_TraineeId] ON [NFD_LivePollVotes] ([TraineeId]);

INSERT INTO [__EFMigrationsHistory] ([MigrationId], [ProductVersion])
VALUES (N'20261021110746_AddTrainerLivePolls', N'10.0.10');

COMMIT;
GO

