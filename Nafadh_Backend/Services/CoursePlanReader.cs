using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Services
{
    /// <summary>
    /// Loads course plans and maps them to DTOs (progress, delay and workflow flags).
    /// Shared by the Company Portal controller and the Authority approval controller so
    /// both always show the same numbers. Not registered in DI — controllers create it
    /// from their DbContext, so Program.cs stays untouched.
    /// </summary>
    public sealed class CoursePlanReader
    {
        private readonly Nafadhcontext _context;

        public CoursePlanReader(Nafadhcontext context)
        {
            _context = context;
        }

        // ── Queries ──────────────────────────────────────────────

        /// <summary>Plans with stages + items only (list screens).</summary>
        public IQueryable<NFD_CoursePlan> ListQuery()
        {
            return _context.NFD_CoursePlans
                .AsNoTracking()
                .Include(p => p.Company)
                .Include(p => p.CreatedByUser)
                .Include(p => p.Trainers).ThenInclude(pt => pt.Trainer).ThenInclude(t => t.User)
                .Include(p => p.Stages).ThenInclude(s => s.Trainers).ThenInclude(st => st.Trainer).ThenInclude(t => t.User)
                .Include(p => p.Stages).ThenInclude(s => s.Items)
                .AsSplitQuery();
        }

        /// <summary>Plans with everything needed for the detail screen.</summary>
        public IQueryable<NFD_CoursePlan> DetailQuery(bool tracking)
        {
            IQueryable<NFD_CoursePlan> query = _context.NFD_CoursePlans
                .Include(p => p.Company)
                .Include(p => p.CreatedByUser)
                .Include(p => p.Program)
                .Include(p => p.Trainers).ThenInclude(pt => pt.Trainer).ThenInclude(t => t.User)
                .Include(p => p.Stages).ThenInclude(s => s.Trainers).ThenInclude(st => st.Trainer).ThenInclude(t => t.User)
                .Include(p => p.Stages).ThenInclude(s => s.Trainer).ThenInclude(t => t!.User)
                .Include(p => p.Stages).ThenInclude(s => s.Items).ThenInclude(i => i.Trainer).ThenInclude(t => t!.User)
                .Include(p => p.Notes).ThenInclude(n => n.User)
                .AsSplitQuery();

            return tracking ? query : query.AsNoTracking();
        }

        // ── Progress maths ───────────────────────────────────────

        public static decimal StatusWeight(NFD_CoursePlanProgressStatus status) => status switch
        {
            NFD_CoursePlanProgressStatus.Completed => 1m,
            NFD_CoursePlanProgressStatus.InProgress => 0.5m,
            _ => 0m
        };

        /// <summary>Completed task = 100%, in-progress = 50%. A stage without tasks follows its own status.</summary>
        public static decimal StageProgress(NFD_CoursePlanStage stage)
        {
            if (stage.Status == NFD_CoursePlanProgressStatus.Completed)
                return 100m;

            if (stage.Items.Count == 0)
                return StatusWeight(stage.Status) * 100m;

            var done = stage.Items.Sum(i => StatusWeight(i.Status));
            return Math.Round(done * 100m / stage.Items.Count, 1);
        }

        /// <summary>Course completion = stage progress weighted by each stage's length in days.</summary>
        public static decimal PlanProgress(NFD_CoursePlan plan)
        {
            if (plan.Stages.Count == 0)
                return 0m;

            decimal totalWeight = 0m;
            decimal accumulated = 0m;

            foreach (var stage in plan.Stages)
            {
                var weight = Math.Max(1, (stage.EndDate.Date - stage.StartDate.Date).Days + 1);
                accumulated += StageProgress(stage) * weight;
                totalWeight += weight;
            }

            return totalWeight == 0m ? 0m : Math.Round(accumulated / totalWeight, 1);
        }

        public static decimal ExpectedProgress(NFD_CoursePlan plan, DateTime today)
        {
            var total = (plan.EndDate.Date - plan.StartDate.Date).TotalDays + 1;
            if (total <= 0)
                return 0m;

            var elapsed = (today.Date - plan.StartDate.Date).TotalDays + 1;
            var pct = Math.Min(100d, Math.Max(0d, elapsed * 100d / total));
            return (decimal)Math.Round(pct, 1);
        }

        /// <summary>Delay only applies once the plan is approved and not yet completed.</summary>
        private static bool Tracked(NFD_CoursePlan plan) =>
            plan.ApprovalStatus == NFD_CoursePlanApprovalStatus.Approved
            && plan.ExecutionStatus != NFD_CoursePlanExecutionStatus.Completed;

        private static bool StageDelayed(NFD_CoursePlan plan, NFD_CoursePlanStage stage, DateTime today) =>
            Tracked(plan)
            && stage.Status != NFD_CoursePlanProgressStatus.Completed
            && stage.EndDate.Date < today.Date;

        // ── Mapping ──────────────────────────────────────────────

        public static CoursePlanSummaryDTO ToSummary(NFD_CoursePlan plan, DateTime today)
        {
            var dto = new CoursePlanSummaryDTO();
            FillSummary(dto, plan, today);
            return dto;
        }

        private static void FillSummary(CoursePlanSummaryDTO dto, NFD_CoursePlan plan, DateTime today)
        {
            var delayedStages = plan.Stages.Count(s => StageDelayed(plan, s, today));

            dto.PlanId = plan.PlanId;
            dto.CompanyId = plan.CompanyId;
            dto.CompanyName = plan.Company?.CompanyName ?? string.Empty;
            dto.ProgramId = plan.ProgramId;
            dto.Trainers = plan.Trainers
                .Select(pt => pt.Trainer)
                .Concat(plan.Stages.SelectMany(st => st.Trainers.Select(x => x.Trainer)))
                .Concat(plan.Stages.Where(st => st.Trainer is not null).Select(st => st.Trainer!))
                .GroupBy(t => t.TrainerId)
                .Select(g => g.First())
                .OrderBy(t => t.User.FullName)
                .Select(t => new CoursePlanTrainerOptionDTO
                {
                    TrainerId = t.TrainerId,
                    FullName = t.User.FullName,
                    Specialty = t.Specialty
                })
                .ToList();
            dto.Title = plan.Title;
            dto.Description = plan.Description;
            dto.Category = plan.Category;
            dto.DurationHours = plan.DurationHours;
            dto.StartDate = plan.StartDate;
            dto.EndDate = plan.EndDate;
            dto.ApprovalStatus = plan.ApprovalStatus;
            dto.ExecutionStatus = plan.ExecutionStatus;
            dto.StageCount = plan.Stages.Count;
            dto.ItemCount = plan.Stages.Sum(s => s.Items.Count);
            dto.CompletedItems = plan.Stages.Sum(s => s.Items.Count(i => i.Status == NFD_CoursePlanProgressStatus.Completed));
            dto.ProgressPercentage = plan.ExecutionStatus == NFD_CoursePlanExecutionStatus.Completed
                ? 100m
                : PlanProgress(plan);
            dto.ExpectedProgressPercentage = ExpectedProgress(plan, today);
            dto.DelayedStages = delayedStages;
            dto.IsDelayed = Tracked(plan) && (delayedStages > 0 || plan.EndDate.Date < today.Date);
            dto.CreatedByName = plan.CreatedByUser?.FullName ?? string.Empty;
            dto.CreatedAt = plan.CreatedAt;
            dto.SubmittedAt = plan.SubmittedAt;
            dto.ReviewedAt = plan.ReviewedAt;
            dto.ReviewNote = plan.ReviewNote;
        }

        public static CoursePlanDetailDTO ToDetail(NFD_CoursePlan plan, DateTime today)
        {
            var dto = new CoursePlanDetailDTO();
            FillSummary(dto, plan, today);

            dto.StartedAt = plan.StartedAt;
            dto.CompletedAt = plan.CompletedAt;

            var editable = plan.ApprovalStatus is NFD_CoursePlanApprovalStatus.Draft or NFD_CoursePlanApprovalStatus.Rejected;
            var approved = plan.ApprovalStatus == NFD_CoursePlanApprovalStatus.Approved;

            dto.CanEditStructure = editable;
            dto.CanSubmit = editable;
            dto.CanWithdraw = plan.ApprovalStatus == NFD_CoursePlanApprovalStatus.PendingApproval;
            dto.CanDelete = plan.ApprovalStatus == NFD_CoursePlanApprovalStatus.Draft;
            dto.CanStart = approved && plan.ExecutionStatus == NFD_CoursePlanExecutionStatus.NotStarted;
            dto.CanTrack = approved && plan.ExecutionStatus == NFD_CoursePlanExecutionStatus.InProgress;
            dto.CanHold = dto.CanTrack;
            dto.CanResume = approved && plan.ExecutionStatus == NFD_CoursePlanExecutionStatus.OnHold;

            var tracked = Tracked(plan);

            dto.Stages = plan.Stages
                .OrderBy(s => s.OrderIndex)
                .ThenBy(s => s.StartDate)
                .Select(s => new CoursePlanStageDTO
                {
                    StageId = s.StageId,
                    OrderIndex = s.OrderIndex,
                    Title = s.Title,
                    Description = s.Description,
                    StartDate = s.StartDate,
                    EndDate = s.EndDate,
                    TrainerId = s.TrainerId ?? s.Trainers.Select(st => (int?)st.TrainerId).FirstOrDefault(),
                    TrainerName = s.Trainer?.User?.FullName ?? s.Trainers.Select(st => st.Trainer.User.FullName).FirstOrDefault(),
                    Trainers = s.Trainers
                        .OrderBy(st => st.Trainer.User.FullName)
                        .Select(st => new CoursePlanTrainerOptionDTO
                        {
                            TrainerId = st.TrainerId,
                            FullName = st.Trainer.User.FullName,
                            Specialty = st.Trainer.Specialty
                        })
                        .ToList(),
                    Status = s.Status,
                    ProgressPercentage = StageProgress(s),
                    IsDelayed = StageDelayed(plan, s, today),
                    ItemCount = s.Items.Count,
                    CompletedItems = s.Items.Count(i => i.Status == NFD_CoursePlanProgressStatus.Completed),
                    Items = s.Items
                        .OrderBy(i => i.DueDate)
                        .ThenBy(i => i.ItemId)
                        .Select(i => new CoursePlanItemDTO
                        {
                            ItemId = i.ItemId,
                            StageId = i.StageId,
                            ItemType = i.ItemType,
                            Title = i.Title,
                            Description = i.Description,
                            DueDate = i.DueDate,
                            Priority = i.Priority,
                            Status = i.Status,
                            TrainerId = i.TrainerId,
                            TrainerName = i.Trainer?.User?.FullName,
                            IsOverdue = tracked
                                        && i.Status != NFD_CoursePlanProgressStatus.Completed
                                        && i.DueDate.Date < today.Date
                        })
                        .ToList()
                })
                .ToList();

            var stageTitles = plan.Stages.ToDictionary(s => s.StageId, s => s.Title);
            var itemTitles = plan.Stages.SelectMany(s => s.Items).ToDictionary(i => i.ItemId, i => i.Title);

            dto.Notes = plan.Notes
                .OrderByDescending(n => n.CreatedAt)
                .ThenByDescending(n => n.NoteId)
                .Select(n => new CoursePlanNoteDTO
                {
                    NoteId = n.NoteId,
                    StageId = n.StageId,
                    ItemId = n.ItemId,
                    TargetTitle = n.ItemId.HasValue && itemTitles.TryGetValue(n.ItemId.Value, out var it)
                        ? it
                        : n.StageId.HasValue && stageTitles.TryGetValue(n.StageId.Value, out var st)
                            ? st
                            : null,
                    Text = n.Text,
                    AuthorName = n.User?.FullName ?? string.Empty,
                    IsAuthority = n.IsAuthority,
                    CreatedAt = n.CreatedAt
                })
                .ToList();

            return dto;
        }

        public static CoursePlansCountsDTO ToCounts(IReadOnlyCollection<CoursePlanSummaryDTO> plans)
        {
            return new CoursePlansCountsDTO
            {
                Total = plans.Count,
                Draft = plans.Count(p => p.ApprovalStatus == NFD_CoursePlanApprovalStatus.Draft),
                PendingApproval = plans.Count(p => p.ApprovalStatus == NFD_CoursePlanApprovalStatus.PendingApproval),
                Approved = plans.Count(p => p.ApprovalStatus == NFD_CoursePlanApprovalStatus.Approved),
                Rejected = plans.Count(p => p.ApprovalStatus == NFD_CoursePlanApprovalStatus.Rejected),
                InProgress = plans.Count(p => p.ApprovalStatus == NFD_CoursePlanApprovalStatus.Approved
                                              && p.ExecutionStatus == NFD_CoursePlanExecutionStatus.InProgress),
                Completed = plans.Count(p => p.ExecutionStatus == NFD_CoursePlanExecutionStatus.Completed),
                DelayedPlans = plans.Count(p => p.IsDelayed)
            };
        }
    }
}
