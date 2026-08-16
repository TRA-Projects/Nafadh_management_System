-- ==============================================================================
-- DataFix_And_NewSeed_Script.sql
-- Nafadh Backend — Phase 2 (Contract Alignment) data-fix + seed additions.
--
-- WHEN TO RUN: once, immediately AFTER you have:
--   1. Applied the new EF Core migration (dotnet ef database update) generated
--      from the updated Models/DbContext, AND
--   2. Run the original DataSeed_Script (1).sql (if not already applied).
--
-- WHY THIS SCRIPT EXISTS: several enums were changed in this upgrade rather
-- than only extended. Reordering/redefining an enum does NOT automatically
-- correct rows that were seeded under the OLD enum's numeric values — this
-- script fixes exactly that, and adds seed rows for the brand-new fixed
-- catalogs (FeedbackCriteria, Badges) that the frontend expects to find data
-- in immediately.
-- ==============================================================================


-- ------------------------------------------------------------------------------
-- 1) NFD_Trainees.Status
-- OLD enum: Active=0, Graduated=1, Dropped=2, Suspended=3
-- NEW enum: NotAssigned=0, InTraining=1, Completed=2
-- All 10 seeded trainees were Status=0 ("Active" under the old enum). Under the
-- new enum, 0 means "NotAssigned" instead — wrong for any trainee that already
-- has a CompanyId. This recomputes each trainee's status from real signals:
--   - no CompanyId                          -> NotAssigned (0)
--   - has a Completed enrollment            -> Completed (2)
--   - otherwise (has CompanyId, in progress) -> InTraining (1)
-- ------------------------------------------------------------------------------
UPDATE t
SET t.Status = CASE
    WHEN t.CompanyId IS NULL THEN 0
    WHEN EXISTS (
        SELECT 1 FROM dbo.[NFD_Enrollments] e
        WHERE e.TraineeId = t.TraineeId AND e.CompletionStatus = 1 -- Completed
    ) THEN 2
    ELSE 1
END
FROM dbo.[NFD_Trainees] t;

-- NEW column: VerificationStatus (Pending=0, Verified=1, Rejected=2).
-- Most seed trainees are treated as already-verified test data; two are left
-- Pending so the Admin portal's identity-verification sub-flow has something
-- to show immediately.
UPDATE dbo.[NFD_Trainees] SET VerificationStatus = 1; -- Verified (default for all)
UPDATE dbo.[NFD_Trainees] SET VerificationStatus = 0 WHERE TraineeId IN (9, 10); -- Pending


-- ------------------------------------------------------------------------------
-- 2) NFD_Warnings.Scope / CompanyId
-- NEW columns. All 3 originally-seeded warnings are Enrollment-scoped
-- (trainee-directed), so Scope = 1 (Trainee) for all of them; CompanyId stays
-- NULL (already the case, since the column is new and defaults to NULL).
-- ------------------------------------------------------------------------------
UPDATE dbo.[NFD_Warnings] SET Scope = 1; -- Trainee, for the 3 pre-existing rows

-- Add 2 new Company-scoped warnings (Admin -> Company compliance warnings) —
-- this is the concept the polymorphic Warning model was specifically extended
-- to support, and it had no representation in the original seed data at all.
SET IDENTITY_INSERT dbo.[NFD_Warnings] ON;
INSERT INTO dbo.[NFD_Warnings] ([WarningId], [Scope], [EnrollmentId], [CompanyId], [RaisedByUserId], [Type], [Level], [Evidence], [Status], [Resolution], [IssuedDate])
VALUES (4, 0, NULL, 2, 1, 1, 1, N'Repeated delay submitting monthly trainee evaluation reports.', 0, NULL, '2026-02-01T00:00:00');
INSERT INTO dbo.[NFD_Warnings] ([WarningId], [Scope], [EnrollmentId], [CompanyId], [RaisedByUserId], [Type], [Level], [Evidence], [Status], [Resolution], [IssuedDate])
VALUES (5, 0, NULL, 3, 1, 3, 0, N'Host company accreditation renewal documents outstanding.', 0, NULL, '2026-02-10T00:00:00');
SET IDENTITY_INSERT dbo.[NFD_Warnings] OFF;


-- ------------------------------------------------------------------------------
-- 3) NFD_SupportTickets.Type / Category
-- NEW columns. Categorized per the ticket-opener's role (Company supervisor ->
-- CompanyThread, Trainee -> TraineeComplaint; the one legacy ticket from a
-- Trainer doesn't fit either bucket, so it's tagged Other rather than forced
-- into the wrong tab).
-- Enum: CompanyThread=0, TraineeComplaint=1, Other=2
-- ------------------------------------------------------------------------------
UPDATE dbo.[NFD_SupportTickets] SET Type = 1, Category = N'استفسار عام' WHERE TicketId = 1; -- Reem (trainee)
UPDATE dbo.[NFD_SupportTickets] SET Type = 1, Category = N'استفسار عام' WHERE TicketId = 2; -- Nasser (trainee)
UPDATE dbo.[NFD_SupportTickets] SET Type = 0, Category = N'البرامج والخطط التدريبية' WHERE TicketId = 3; -- Maryam (company supervisor)
UPDATE dbo.[NFD_SupportTickets] SET Type = 2, Category = NULL WHERE TicketId = 4; -- Khalid (trainer) — doesn't fit Company/Trainee


-- ------------------------------------------------------------------------------
-- 4) NFD_FeedbackCriteria — fixed, system-defined rating criteria (NEW table).
-- Enum NFD_FeedbackType: TrainerRating=0, BatchExperienceRating=1
-- ------------------------------------------------------------------------------
SET IDENTITY_INSERT dbo.[NFD_FeedbackCriteria] ON;
INSERT INTO dbo.[NFD_FeedbackCriteria] ([CriterionId], [AppliesTo], [Name], [OrderIndex]) VALUES (1, 0, N'وضوح الشرح', 1);
INSERT INTO dbo.[NFD_FeedbackCriteria] ([CriterionId], [AppliesTo], [Name], [OrderIndex]) VALUES (2, 0, N'الاستجابة للاستفسارات', 2);
INSERT INTO dbo.[NFD_FeedbackCriteria] ([CriterionId], [AppliesTo], [Name], [OrderIndex]) VALUES (3, 0, N'الالتزام بالمواعيد', 3);
INSERT INTO dbo.[NFD_FeedbackCriteria] ([CriterionId], [AppliesTo], [Name], [OrderIndex]) VALUES (4, 1, N'جودة المحتوى', 1);
INSERT INTO dbo.[NFD_FeedbackCriteria] ([CriterionId], [AppliesTo], [Name], [OrderIndex]) VALUES (5, 1, N'التنظيم العام', 2);
INSERT INTO dbo.[NFD_FeedbackCriteria] ([CriterionId], [AppliesTo], [Name], [OrderIndex]) VALUES (6, 1, N'بيئة التدريب', 3);
SET IDENTITY_INSERT dbo.[NFD_FeedbackCriteria] OFF;


-- ------------------------------------------------------------------------------
-- 5) NFD_Badges — fixed, system-wide badge catalog (NEW table).
-- Enum NFD_BadgeConditionType: ModulesCompletedInPeriod=0, AttendanceStreak=1,
-- HighScoreCount=2, ProjectCompletion=3, ProgramCompletion=4
-- ------------------------------------------------------------------------------
SET IDENTITY_INSERT dbo.[NFD_Badges] ON;
INSERT INTO dbo.[NFD_Badges] ([BadgeId], [Name], [Description], [Icon], [ConditionType], [ConditionValue]) VALUES (1, N'متعلم سريع', N'أكمل 3 وحدات في أسبوع واحد', N'🏅', 0, 3);
INSERT INTO dbo.[NFD_Badges] ([BadgeId], [Name], [Description], [Icon], [ConditionType], [ConditionValue]) VALUES (2, N'المثابرة', N'حضور مستمر لمدة 30 يوم', N'🔥', 1, 30);
INSERT INTO dbo.[NFD_Badges] ([BadgeId], [Name], [Description], [Icon], [ConditionType], [ConditionValue]) VALUES (3, N'الأداء المتميز', N'درجة أعلى من 90% في مهمتين', N'⭐', 2, 2);
INSERT INTO dbo.[NFD_Badges] ([BadgeId], [Name], [Description], [Icon], [ConditionType], [ConditionValue]) VALUES (4, N'إكمال المشروع', N'إنهاء أول مشروع متكامل', N'🎯', 3, 1);
INSERT INTO dbo.[NFD_Badges] ([BadgeId], [Name], [Description], [Icon], [ConditionType], [ConditionValue]) VALUES (5, N'خريج البرنامج', N'إتمام البرنامج التدريبي بالكامل', N'🏆', 4, 1);
SET IDENTITY_INSERT dbo.[NFD_Badges] OFF;


-- ------------------------------------------------------------------------------
-- 6) NFD_EvaluationCriteria.MaxPoints — NEW column, required alongside Weight.
-- The original 9 seeded criteria only had Weight; MaxPoints is set equal to
-- Weight here (a reasonable default — each criterion's max points equals its
-- percentage weight, so a perfect score sums to 100 directly). Adjust later if
-- a different points scale is wanted.
-- ------------------------------------------------------------------------------
UPDATE c
SET c.MaxPoints = c.Weight
FROM dbo.[NFD_EvaluationCriteria] c;


-- ------------------------------------------------------------------------------
-- 7) NFD_EvaluationCriterionScores — per-criterion breakdown for a few of the
-- existing seeded Evaluations (NEW table), so the "breakdown" view has real
-- data to show immediately rather than being empty for every legacy row.
-- Evaluation 1 used TemplateId=1 (criteria 1,2,3); Evaluation 2 also TemplateId=1.
-- Scores are chosen to average out close to each evaluation's existing flat
-- Score value, for consistency.
-- ------------------------------------------------------------------------------
SET IDENTITY_INSERT dbo.[NFD_EvaluationCriterionScores] ON;
INSERT INTO dbo.[NFD_EvaluationCriterionScores] ([ScoreId], [EvaluationId], [CriteriaId], [Score]) VALUES (1, 1, 1, 37); -- Code Quality (of 40)
INSERT INTO dbo.[NFD_EvaluationCriterionScores] ([ScoreId], [EvaluationId], [CriteriaId], [Score]) VALUES (2, 1, 2, 28); -- Problem Solving (of 30)
INSERT INTO dbo.[NFD_EvaluationCriterionScores] ([ScoreId], [EvaluationId], [CriteriaId], [Score]) VALUES (3, 1, 3, 27); -- Best Practices (of 30)
INSERT INTO dbo.[NFD_EvaluationCriterionScores] ([ScoreId], [EvaluationId], [CriteriaId], [Score]) VALUES (4, 2, 1, 30);
INSERT INTO dbo.[NFD_EvaluationCriterionScores] ([ScoreId], [EvaluationId], [CriteriaId], [Score]) VALUES (5, 2, 2, 24);
INSERT INTO dbo.[NFD_EvaluationCriterionScores] ([ScoreId], [EvaluationId], [CriteriaId], [Score]) VALUES (6, 2, 3, 24);
SET IDENTITY_INSERT dbo.[NFD_EvaluationCriterionScores] OFF;


-- ------------------------------------------------------------------------------
-- 8) A couple of sample Feedback submissions + TraineeBadge grants, so the
-- Trainee/Trainer/Company portals' new pages aren't completely empty on first run.
-- ------------------------------------------------------------------------------
SET IDENTITY_INSERT dbo.[NFD_Feedbacks] ON;
INSERT INTO dbo.[NFD_Feedbacks] ([FeedbackId], [Type], [TraineeId], [ModuleId], [TrainerId], [BatchId], [Comment], [SubmittedAt])
VALUES (1, 0, 1, 1, 1, NULL, N'شرح واضح ومنهجية ممتازة.', '2026-02-01T00:00:00');
INSERT INTO dbo.[NFD_Feedbacks] ([FeedbackId], [Type], [TraineeId], [ModuleId], [TrainerId], [BatchId], [Comment], [SubmittedAt])
VALUES (2, 1, 1, 1, NULL, 1, N'بيئة تدريب جيدة ومنظمة.', '2026-02-01T00:00:00');
SET IDENTITY_INSERT dbo.[NFD_Feedbacks] OFF;

SET IDENTITY_INSERT dbo.[NFD_FeedbackScores] ON;
INSERT INTO dbo.[NFD_FeedbackScores] ([FeedbackScoreId], [FeedbackId], [CriterionId], [Score]) VALUES (1, 1, 1, 5);
INSERT INTO dbo.[NFD_FeedbackScores] ([FeedbackScoreId], [FeedbackId], [CriterionId], [Score]) VALUES (2, 1, 2, 4);
INSERT INTO dbo.[NFD_FeedbackScores] ([FeedbackScoreId], [FeedbackId], [CriterionId], [Score]) VALUES (3, 1, 3, 5);
INSERT INTO dbo.[NFD_FeedbackScores] ([FeedbackScoreId], [FeedbackId], [CriterionId], [Score]) VALUES (4, 2, 4, 4);
INSERT INTO dbo.[NFD_FeedbackScores] ([FeedbackScoreId], [FeedbackId], [CriterionId], [Score]) VALUES (5, 2, 5, 5);
INSERT INTO dbo.[NFD_FeedbackScores] ([FeedbackScoreId], [FeedbackId], [CriterionId], [Score]) VALUES (6, 2, 6, 4);
SET IDENTITY_INSERT dbo.[NFD_FeedbackScores] OFF;

-- These are seeded directly rather than left for BadgeEvaluationService to
-- discover, purely so the Achievements page has an "earned" example on first
-- run; real grants going forward always come from BadgeEvaluationService.
SET IDENTITY_INSERT dbo.[NFD_TraineeBadges] ON;
INSERT INTO dbo.[NFD_TraineeBadges] ([TraineeBadgeId], [TraineeId], [BadgeId], [EarnedAt]) VALUES (1, 1, 1, '2026-02-01T00:00:00');
INSERT INTO dbo.[NFD_TraineeBadges] ([TraineeBadgeId], [TraineeId], [BadgeId], [EarnedAt]) VALUES (2, 1, 2, '2026-03-15T00:00:00');
SET IDENTITY_INSERT dbo.[NFD_TraineeBadges] OFF;


-- ==============================================================================
-- End of DataFix_And_NewSeed_Script.sql
-- ==============================================================================
