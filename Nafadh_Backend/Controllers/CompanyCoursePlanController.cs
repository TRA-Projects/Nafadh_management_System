using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    /// <summary>
    /// Company Portal — "Tasks &amp; Projects": the company supervisor drafts a course plan
    /// (stages, tasks, projects, trainers, dates), submits it for Authority approval and,
    /// once approved, tracks its execution and completion.
    ///
    /// Additive controller. Every endpoint requires the CompanySupervisor role, verifies
    /// the caller supervises {companyId}, and only ever touches that company's plans.
    /// Nothing in the Authority/Trainer/Trainee portals or their controllers is modified.
    ///
    /// Workflow:
    ///   Draft ──submit──▶ PendingApproval ──(Authority)──▶ Approved ──(Trainer start)──▶ InProgress ──▶ Completed
    ///     ▲                    │ withdraw                      └─ hold/resume (OnHold)
    ///     └──── Rejected ◀─────┘ (edit, then submit again)
    /// Structure (stages/tasks/dates/trainers) is editable only in Draft/Rejected.
    /// Execution tracking is possible only after approval and trainer start.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "CompanySupervisor")]
    public class CompanyCoursePlanController : ControllerBase
    {
        private readonly Nafadhcontext _context;
        private readonly CoursePlanReader _reader;

        public CompanyCoursePlanController(Nafadhcontext context)
        {
            _context = context;
            _reader = new CoursePlanReader(context);
        }

        // ─────────────────────────────────────────────────────────────
        // Reads
        // ─────────────────────────────────────────────────────────────

        // GET: api/CompanyCoursePlan/company/{companyId}/plans
        [HttpGet("company/{companyId:int}/plans")]
        public async Task<ActionResult<CoursePlansOverviewDTO>> GetPlans(int companyId)
        {
            if (!await OwnsCompanyAsync(companyId))
                return Forbid();

            var plans = await _reader.ListQuery()
                .Where(p => p.CompanyId == companyId)
                .ToListAsync();

            var today = DateTime.Today;
            var summaries = plans
                .Select(p => CoursePlanReader.ToSummary(p, today))
                .OrderByDescending(p => p.CreatedAt)
                .ToList();

            return Ok(new CoursePlansOverviewDTO
            {
                Counts = CoursePlanReader.ToCounts(summaries),
                Plans = summaries
            });
        }

        // GET: api/CompanyCoursePlan/company/{companyId}/lookups
        // Trainers that can be assigned + known course categories.
        [HttpGet("company/{companyId:int}/lookups")]
        public async Task<ActionResult<CoursePlanLookupsDTO>> GetLookups(int companyId)
        {
            if (!await OwnsCompanyAsync(companyId))
                return Forbid();

            var trainers = await _context.NFD_Trainers
                .AsNoTracking()
                .Where(t => t.Status == NFD_TrainerStatus.Active)
                .Select(t => new CoursePlanTrainerOptionDTO
                {
                    TrainerId = t.TrainerId,
                    FullName = t.User.FullName,
                    Specialty = t.Specialty
                })
                .ToListAsync();

            var programCategories = await _context.NFD_Programs
                .AsNoTracking()
                .Where(p => p.Category != null && p.Category != "")
                .Select(p => p.Category!)
                .Distinct()
                .ToListAsync();

            // Approved/available courses for Tasks & Projects come from two compatible sources:
            // 1) programs already assigned to the company through NFD_CompanyPrograms;
            // 2) programs attached to an approved CoursePlan.
            //
            // The second source is intentionally included as a safety net for existing/legacy
            // approved plans. Normally the approval workflow also creates the NFD_CompanyPrograms
            // link, but Tasks & Projects must not lose an approved course if that link was
            // created by an older workflow or imported data.
            //
            // We merge by ProgramId so the same course never appears twice. No NFD_Program
            // records are created or modified by this read-only lookup.
            var companyProgramIds = await _context.NFD_CompanyPrograms
                .AsNoTracking()
                .Where(cp => cp.CompanyId == companyId)
                .Select(cp => cp.ProgramId)
                .ToListAsync();

            var approvedPlanProgramIds = await _context.NFD_CoursePlans
                .AsNoTracking()
                .Where(plan =>
                    plan.CompanyId == companyId &&
                    plan.ApprovalStatus == NFD_CoursePlanApprovalStatus.Approved &&
                    plan.ProgramId.HasValue)
                .Select(plan => plan.ProgramId!.Value)
                .ToListAsync();

            var availableProgramIds = companyProgramIds
                .Concat(approvedPlanProgramIds)
                .Distinct()
                .ToList();

            var programs = await _context.NFD_Programs
                .AsNoTracking()
                .Where(p => availableProgramIds.Contains(p.ProgramId) && p.Status != NFD_ProgramStatus.Archived)
                .OrderBy(p => p.Title)
                .Select(p => new CoursePlanProgramOptionDTO
                {
                    ProgramId = p.ProgramId,
                    Title = p.Title,
                    Description = p.Description,
                    Category = p.Category,
                    DurationHours = p.DurationHours,
                    Price = p.Price,
                    TrackId = p.TrackId,
                    Status = p.Status.ToString()
                })
                .ToListAsync();

            var tracks = await _context.NFD_Tracks
                .AsNoTracking()
                .Where(t => t.Status == NFD_TrackStatus.Active)
                .OrderBy(t => t.Name)
                .Select(t => new CoursePlanTrackOptionDTO
                {
                    TrackId = t.TrackId,
                    Name = t.Name
                })
                .ToListAsync();

            var planCategories = await _context.NFD_CoursePlans
                .AsNoTracking()
                .Where(p => p.CompanyId == companyId && p.Category != null && p.Category != "")
                .Select(p => p.Category!)
                .Distinct()
                .ToListAsync();

            return Ok(new CoursePlanLookupsDTO
            {
                Trainers = trainers.OrderBy(t => t.FullName).ToList(),
                Programs = programs,
                Tracks = tracks,
                Categories = programCategories
                    .Concat(planCategories)
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .OrderBy(c => c)
                    .ToList()
            });
        }

        // GET: api/CompanyCoursePlan/company/{companyId}/plans/{planId}
        [HttpGet("company/{companyId:int}/plans/{planId:int}")]
        public async Task<ActionResult<CoursePlanDetailDTO>> GetPlan(int companyId, int planId)
        {
            if (!await OwnsCompanyAsync(companyId))
                return Forbid();

            var plan = await FindPlanAsync(companyId, planId, tracking: false);
            if (plan is null)
                return NotFound(new { message = "الخطة غير موجودة." });

            return Ok(CoursePlanReader.ToDetail(plan, DateTime.Today));
        }

        // ─────────────────────────────────────────────────────────────
        // Plan header
        // ─────────────────────────────────────────────────────────────

        // POST: api/CompanyCoursePlan/company/{companyId}/plans
        [HttpPost("company/{companyId:int}/plans")]
        public async Task<ActionResult<CoursePlanDetailDTO>> CreatePlan(int companyId, [FromBody] SaveCoursePlanDTO dto)
        {
            if (!await OwnsCompanyAsync(companyId))
                return Forbid();

            var userId = GetUserId();
            if (userId is null)
                return Unauthorized();

            var error = ValidateHeader(dto);
            if (error is not null)
                return BadRequest(new { message = error });

            var now = DateTime.Now;
            NFD_Program? program;

            if (dto.ProgramId.HasValue)
            {
                program = await _context.NFD_CompanyPrograms
                    .Where(cp => cp.CompanyId == companyId && cp.ProgramId == dto.ProgramId.Value)
                    .Select(cp => cp.Program)
                    .FirstOrDefaultAsync();

                if (program is null || program.Status == NFD_ProgramStatus.Archived)
                    return BadRequest(new { message = "الكورس المختار غير متاح لهذه الشركة." });
            }
            else
            {
                if (!dto.TrackId.HasValue)
                    return BadRequest(new { message = "اختر المسار عند إنشاء كورس جديد يدوياً." });

                var trackExists = await _context.NFD_Tracks
                    .AsNoTracking()
                    .AnyAsync(t => t.TrackId == dto.TrackId.Value && t.Status == NFD_TrackStatus.Active);

                if (!trackExists)
                    return BadRequest(new { message = "المسار المختار غير موجود أو غير نشط." });

                program = new NFD_Program
                {
                    Title = dto.Title.Trim(),
                    Description = Clean(dto.Description),
                    Category = Clean(dto.Category),
                    DurationHours = dto.DurationHours,
                    Price = dto.Price < 0 ? 0 : dto.Price,
                    TrackId = dto.TrackId.Value,
                    Status = NFD_ProgramStatus.Draft
                };

                _context.NFD_Programs.Add(program);
                await _context.SaveChangesAsync();
            }

            var title = program.Title;
            if (await TitleExistsAsync(companyId, title, null))
            {
                // Avoid leaving an orphan Draft Program when manual creation collides with an existing plan.
                if (!dto.ProgramId.HasValue)
                {
                    _context.NFD_Programs.Remove(program);
                    await _context.SaveChangesAsync();
                }

                return Conflict(new { message = "لديكم خطة بنفس عنوان الكورس مسبقاً." });
            }

            var trainerIds = await ValidateTrainerIdsAsync(dto.TrainerIds);
            if (trainerIds.Error is not null)
            {
                if (!dto.ProgramId.HasValue)
                {
                    _context.NFD_Programs.Remove(program);
                    await _context.SaveChangesAsync();
                }
                return BadRequest(new { message = trainerIds.Error });
            }

            var plan = new NFD_CoursePlan
            {
                CompanyId = companyId,
                ProgramId = program.ProgramId,
                CreatedByUserId = userId.Value,
                Title = title,
                Description = program.Description,
                Category = program.Category,
                DurationHours = program.DurationHours,
                StartDate = dto.StartDate.Date,
                EndDate = dto.EndDate.Date,
                ApprovalStatus = NFD_CoursePlanApprovalStatus.Draft,
                ExecutionStatus = NFD_CoursePlanExecutionStatus.NotStarted,
                CreatedAt = now,
                UpdatedAt = now
            };

            foreach (var trainerId in trainerIds.Ids)
                plan.Trainers.Add(new NFD_CoursePlanTrainer { Plan = plan, TrainerId = trainerId });

            _context.NFD_CoursePlans.Add(plan);
            await _context.SaveChangesAsync();

            return Ok(await ReloadAsync(companyId, plan.PlanId));
        }

        // PUT: api/CompanyCoursePlan/company/{companyId}/plans/{planId}
        [HttpPut("company/{companyId:int}/plans/{planId:int}")]
        public async Task<ActionResult<CoursePlanDetailDTO>> UpdatePlan(int companyId, int planId, [FromBody] SaveCoursePlanDTO dto)
        {
            if (!await OwnsCompanyAsync(companyId))
                return Forbid();

            var plan = await FindPlanAsync(companyId, planId, tracking: true);
            if (plan is null)
                return NotFound(new { message = "الخطة غير موجودة." });

            if (!IsEditable(plan))
                return Conflict(new { message = LockedMessage(plan) });

            var error = ValidateHeader(dto);
            if (error is not null)
                return BadRequest(new { message = error });

            var start = dto.StartDate.Date;
            var end = dto.EndDate.Date;

            if (plan.Stages.Any(s => s.StartDate.Date < start || s.EndDate.Date > end))
                return BadRequest(new { message = "نطاق التواريخ الجديد لا يشمل كل مراحل الخطة الحالية. عدّل المراحل أولاً." });

            var title = dto.Title.Trim();
            if (await TitleExistsAsync(companyId, title, planId))
                return Conflict(new { message = "لديكم خطة بنفس العنوان مسبقاً." });

            if (plan.ProgramId.HasValue)
            {
                var program = await _context.NFD_Programs.FirstOrDefaultAsync(p => p.ProgramId == plan.ProgramId.Value);
                var alreadyLinked = await _context.NFD_CompanyPrograms
                    .AsNoTracking()
                    .AnyAsync(cp => cp.CompanyId == companyId && cp.ProgramId == plan.ProgramId.Value);

                if (program is not null && !alreadyLinked)
                {
                    program.Title = title;
                    program.Description = Clean(dto.Description);
                    program.Category = Clean(dto.Category);
                    program.DurationHours = dto.DurationHours;
                    program.Price = dto.Price < 0 ? 0 : dto.Price;

                    if (dto.TrackId.HasValue)
                    {
                        var trackExists = await _context.NFD_Tracks
                            .AsNoTracking()
                            .AnyAsync(t => t.TrackId == dto.TrackId.Value && t.Status == NFD_TrackStatus.Active);
                        if (!trackExists)
                            return BadRequest(new { message = "المسار المختار غير موجود أو غير نشط." });
                        program.TrackId = dto.TrackId.Value;
                    }

                    plan.Title = program.Title;
                    plan.Description = program.Description;
                    plan.Category = program.Category;
                    plan.DurationHours = program.DurationHours;
                }
                else
                {
                    plan.Title = program?.Title ?? plan.Title;
                    plan.Description = program?.Description ?? plan.Description;
                    plan.Category = program?.Category ?? plan.Category;
                    plan.DurationHours = program?.DurationHours ?? plan.DurationHours;
                }
            }
            else
            {
                plan.Title = title;
                plan.Description = Clean(dto.Description);
                plan.Category = Clean(dto.Category);
                plan.DurationHours = dto.DurationHours;
            }

            var trainerIds = await ValidateTrainerIdsAsync(dto.TrainerIds);
            if (trainerIds.Error is not null)
                return BadRequest(new { message = trainerIds.Error });

            _context.NFD_CoursePlanTrainers.RemoveRange(plan.Trainers.ToList());
            foreach (var trainerId in trainerIds.Ids)
                plan.Trainers.Add(new NFD_CoursePlanTrainer { PlanId = plan.PlanId, TrainerId = trainerId });

            plan.StartDate = start;
            plan.EndDate = end;
            plan.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(await ReloadAsync(companyId, planId));
        }

        // DELETE: api/CompanyCoursePlan/company/{companyId}/plans/{planId}
        // Only drafts that were never submitted can be deleted.
        [HttpDelete("company/{companyId:int}/plans/{planId:int}")]
        public async Task<IActionResult> DeletePlan(int companyId, int planId)
        {
            if (!await OwnsCompanyAsync(companyId))
                return Forbid();

            var plan = await FindPlanAsync(companyId, planId, tracking: true);
            if (plan is null)
                return NotFound(new { message = "الخطة غير موجودة." });

            if (plan.ApprovalStatus != NFD_CoursePlanApprovalStatus.Draft)
                return Conflict(new { message = "يمكن حذف المسودات فقط." });

            _context.NFD_CoursePlanNotes.RemoveRange(plan.Notes.ToList());

            if (plan.ProgramId.HasValue)
            {
                var companyLinked = await _context.NFD_CompanyPrograms
                    .AsNoTracking()
                    .AnyAsync(cp => cp.CompanyId == companyId && cp.ProgramId == plan.ProgramId.Value);

                var usedByOtherPlan = await _context.NFD_CoursePlans
                    .AsNoTracking()
                    .AnyAsync(p => p.PlanId != plan.PlanId && p.ProgramId == plan.ProgramId.Value);

                if (!companyLinked && !usedByOtherPlan)
                {
                    var program = await _context.NFD_Programs
                        .FirstOrDefaultAsync(p => p.ProgramId == plan.ProgramId.Value);

                    if (program is not null && program.Status == NFD_ProgramStatus.Draft)
                        _context.NFD_Programs.Remove(program);
                }
            }

            _context.NFD_CoursePlans.Remove(plan);
            await _context.SaveChangesAsync();

            return NoContent();
        }

        // Trainer assignments are intentionally separate from structural editing:
        // a trainer may be added, removed or replaced even after Authority approval.
        [HttpPut("company/{companyId:int}/plans/{planId:int}/trainers")]
        public async Task<ActionResult<CoursePlanDetailDTO>> SetPlanTrainers(
            int companyId, int planId, [FromBody] SetCoursePlanTrainersDTO dto)
        {
            if (!await OwnsCompanyAsync(companyId))
                return Forbid();

            var plan = await FindPlanAsync(companyId, planId, tracking: true);
            if (plan is null)
                return NotFound(new { message = "الخطة غير موجودة." });

            var trainerIds = await ValidateTrainerIdsAsync(dto.TrainerIds);
            if (trainerIds.Error is not null)
                return BadRequest(new { message = trainerIds.Error });

            _context.NFD_CoursePlanTrainers.RemoveRange(plan.Trainers.ToList());
            foreach (var trainerId in trainerIds.Ids)
                plan.Trainers.Add(new NFD_CoursePlanTrainer { PlanId = plan.PlanId, TrainerId = trainerId });

            plan.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();
            return Ok(await ReloadAsync(companyId, planId));
        }

        [HttpPut("company/{companyId:int}/plans/{planId:int}/stages/{stageId:int}/trainers")]
        public async Task<ActionResult<CoursePlanDetailDTO>> SetStageTrainers(
            int companyId, int planId, int stageId, [FromBody] SetCoursePlanTrainersDTO dto)
        {
            if (!await OwnsCompanyAsync(companyId))
                return Forbid();

            var plan = await FindPlanAsync(companyId, planId, tracking: true);
            var stage = plan?.Stages.FirstOrDefault(s => s.StageId == stageId);
            if (plan is null || stage is null)
                return NotFound(new { message = "المرحلة غير موجودة." });

            var trainerIds = await ValidateTrainerIdsAsync(dto.TrainerIds);
            if (trainerIds.Error is not null)
                return BadRequest(new { message = trainerIds.Error });

            _context.NFD_CoursePlanStageTrainers.RemoveRange(stage.Trainers.ToList());
            foreach (var trainerId in trainerIds.Ids)
                stage.Trainers.Add(new NFD_CoursePlanStageTrainer { StageId = stage.StageId, TrainerId = trainerId });

            stage.TrainerId = trainerIds.Ids.FirstOrDefault() == 0 ? null : trainerIds.Ids.First();
            plan.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(await ReloadAsync(companyId, planId));
        }

        // ─────────────────────────────────────────────────────────────
        // Stages
        // ─────────────────────────────────────────────────────────────

        // POST: .../plans/{planId}/stages
        [HttpPost("company/{companyId:int}/plans/{planId:int}/stages")]
        public async Task<ActionResult<CoursePlanDetailDTO>> AddStage(int companyId, int planId, [FromBody] SaveCoursePlanStageDTO dto)
        {
            if (!await OwnsCompanyAsync(companyId))
                return Forbid();

            var plan = await FindPlanAsync(companyId, planId, tracking: true);
            if (plan is null)
                return NotFound(new { message = "الخطة غير موجودة." });

            if (!IsEditable(plan))
                return Conflict(new { message = LockedMessage(plan) });

            var error = ValidateStage(plan, dto);
            if (error is not null)
                return BadRequest(new { message = error });

            var stage = new NFD_CoursePlanStage
            {
                PlanId = plan.PlanId,
                Title = dto.Title.Trim(),
                Description = Clean(dto.Description),
                StartDate = dto.StartDate.Date,
                EndDate = dto.EndDate.Date,
                TrainerId = dto.TrainerIds.FirstOrDefault() == 0 ? dto.TrainerId : dto.TrainerIds.First(),
                OrderIndex = plan.Stages.Count == 0 ? 1 : plan.Stages.Max(s => s.OrderIndex) + 1,
                Status = NFD_CoursePlanProgressStatus.NotStarted
            };

            var stageTrainerIds = await ValidateTrainerIdsAsync(
                dto.TrainerIds.Count > 0
                    ? dto.TrainerIds
                    : (dto.TrainerId.HasValue ? new List<int> { dto.TrainerId.Value } : new List<int>()));

            if (stageTrainerIds.Error is not null)
                return BadRequest(new { message = stageTrainerIds.Error });

            _context.NFD_CoursePlanStages.Add(stage);
            foreach (var trainerId in stageTrainerIds.Ids)
                stage.Trainers.Add(new NFD_CoursePlanStageTrainer { Stage = stage, TrainerId = trainerId });

            plan.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return Ok(await ReloadAsync(companyId, planId));
        }

        // PUT: .../plans/{planId}/stages/{stageId}
        [HttpPut("company/{companyId:int}/plans/{planId:int}/stages/{stageId:int}")]
        public async Task<ActionResult<CoursePlanDetailDTO>> UpdateStage(int companyId, int planId, int stageId, [FromBody] SaveCoursePlanStageDTO dto)
        {
            if (!await OwnsCompanyAsync(companyId))
                return Forbid();

            var plan = await FindPlanAsync(companyId, planId, tracking: true);
            var stage = plan?.Stages.FirstOrDefault(s => s.StageId == stageId);
            if (plan is null || stage is null)
                return NotFound(new { message = "المرحلة غير موجودة." });

            if (!IsEditable(plan))
                return Conflict(new { message = LockedMessage(plan) });

            var error = ValidateStage(plan, dto);
            if (error is not null)
                return BadRequest(new { message = error });

            var start = dto.StartDate.Date;
            var end = dto.EndDate.Date;

            if (stage.Items.Any(i => i.DueDate.Date < start || i.DueDate.Date > end))
                return BadRequest(new { message = "نطاق تواريخ المرحلة الجديد لا يشمل مواعيد كل مهامها. عدّل المهام أولاً." });

            stage.Title = dto.Title.Trim();
            stage.Description = Clean(dto.Description);
            stage.StartDate = start;
            stage.EndDate = end;
            var stageTrainerIds = await ValidateTrainerIdsAsync(
                dto.TrainerIds.Count > 0
                    ? dto.TrainerIds
                    : (dto.TrainerId.HasValue ? new List<int> { dto.TrainerId.Value } : new List<int>()));

            if (stageTrainerIds.Error is not null)
                return BadRequest(new { message = stageTrainerIds.Error });

            stage.TrainerId = stageTrainerIds.Ids.FirstOrDefault() == 0 ? null : stageTrainerIds.Ids.First();
            _context.NFD_CoursePlanStageTrainers.RemoveRange(stage.Trainers.ToList());
            foreach (var trainerId in stageTrainerIds.Ids)
                stage.Trainers.Add(new NFD_CoursePlanStageTrainer { Stage = stage, TrainerId = trainerId });

            plan.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(await ReloadAsync(companyId, planId));
        }

        // DELETE: .../plans/{planId}/stages/{stageId}
        [HttpDelete("company/{companyId:int}/plans/{planId:int}/stages/{stageId:int}")]
        public async Task<ActionResult<CoursePlanDetailDTO>> DeleteStage(int companyId, int planId, int stageId)
        {
            if (!await OwnsCompanyAsync(companyId))
                return Forbid();

            var plan = await FindPlanAsync(companyId, planId, tracking: true);
            var stage = plan?.Stages.FirstOrDefault(s => s.StageId == stageId);
            if (plan is null || stage is null)
                return NotFound(new { message = "المرحلة غير موجودة." });

            if (!IsEditable(plan))
                return Conflict(new { message = LockedMessage(plan) });

            var itemIds = stage.Items.Select(i => i.ItemId).ToHashSet();
            var notes = plan.Notes
                .Where(n => n.StageId == stageId || (n.ItemId.HasValue && itemIds.Contains(n.ItemId.Value)))
                .ToList();

            _context.NFD_CoursePlanNotes.RemoveRange(notes);
            _context.NFD_CoursePlanStages.Remove(stage);
            plan.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return Ok(await ReloadAsync(companyId, planId));
        }

        // ─────────────────────────────────────────────────────────────
        // Tasks / projects inside a stage
        // ─────────────────────────────────────────────────────────────

        // POST: .../plans/{planId}/stages/{stageId}/items
        [HttpPost("company/{companyId:int}/plans/{planId:int}/stages/{stageId:int}/items")]
        public async Task<ActionResult<CoursePlanDetailDTO>> AddItem(int companyId, int planId, int stageId, [FromBody] SaveCoursePlanItemDTO dto)
        {
            if (!await OwnsCompanyAsync(companyId))
                return Forbid();

            var plan = await FindPlanAsync(companyId, planId, tracking: true);
            var stage = plan?.Stages.FirstOrDefault(s => s.StageId == stageId);
            if (plan is null || stage is null)
                return NotFound(new { message = "المرحلة غير موجودة." });

            if (!IsEditable(plan))
                return Conflict(new { message = LockedMessage(plan) });

            var error = ValidateItem(stage, dto) ?? await ValidateTrainerAsync(dto.TrainerId);
            if (error is not null)
                return BadRequest(new { message = error });

            _context.NFD_CoursePlanItems.Add(new NFD_CoursePlanItem
            {
                StageId = stage.StageId,
                ItemType = dto.ItemType,
                Title = dto.Title.Trim(),
                Description = Clean(dto.Description),
                DueDate = dto.DueDate.Date,
                Priority = dto.Priority,
                Status = NFD_CoursePlanProgressStatus.NotStarted,
                TrainerId = dto.TrainerId ?? stage.TrainerId
            });

            plan.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return Ok(await ReloadAsync(companyId, planId));
        }

        // PUT: .../plans/{planId}/items/{itemId}
        [HttpPut("company/{companyId:int}/plans/{planId:int}/items/{itemId:int}")]
        public async Task<ActionResult<CoursePlanDetailDTO>> UpdateItem(int companyId, int planId, int itemId, [FromBody] SaveCoursePlanItemDTO dto)
        {
            if (!await OwnsCompanyAsync(companyId))
                return Forbid();

            var plan = await FindPlanAsync(companyId, planId, tracking: true);
            var stage = plan?.Stages.FirstOrDefault(s => s.Items.Any(i => i.ItemId == itemId));
            var item = stage?.Items.FirstOrDefault(i => i.ItemId == itemId);
            if (plan is null || stage is null || item is null)
                return NotFound(new { message = "العنصر غير موجود." });

            if (!IsEditable(plan))
                return Conflict(new { message = LockedMessage(plan) });

            var error = ValidateItem(stage, dto) ?? await ValidateTrainerAsync(dto.TrainerId);
            if (error is not null)
                return BadRequest(new { message = error });

            item.ItemType = dto.ItemType;
            item.Title = dto.Title.Trim();
            item.Description = Clean(dto.Description);
            item.DueDate = dto.DueDate.Date;
            item.Priority = dto.Priority;
            item.TrainerId = dto.TrainerId ?? stage.TrainerId;
            plan.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(await ReloadAsync(companyId, planId));
        }

        // DELETE: .../plans/{planId}/items/{itemId}
        [HttpDelete("company/{companyId:int}/plans/{planId:int}/items/{itemId:int}")]
        public async Task<ActionResult<CoursePlanDetailDTO>> DeleteItem(int companyId, int planId, int itemId)
        {
            if (!await OwnsCompanyAsync(companyId))
                return Forbid();

            var plan = await FindPlanAsync(companyId, planId, tracking: true);
            var item = plan?.Stages.SelectMany(s => s.Items).FirstOrDefault(i => i.ItemId == itemId);
            if (plan is null || item is null)
                return NotFound(new { message = "العنصر غير موجود." });

            if (!IsEditable(plan))
                return Conflict(new { message = LockedMessage(plan) });

            _context.NFD_CoursePlanNotes.RemoveRange(plan.Notes.Where(n => n.ItemId == itemId).ToList());
            _context.NFD_CoursePlanItems.Remove(item);
            plan.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return Ok(await ReloadAsync(companyId, planId));
        }

        // ─────────────────────────────────────────────────────────────
        // Approval workflow (company side)
        // ─────────────────────────────────────────────────────────────

        // POST: .../plans/{planId}/submit
        // Sends the plan (course + stages + details) to the Authority for approval.
        [HttpPost("company/{companyId:int}/plans/{planId:int}/submit")]
        public async Task<ActionResult<CoursePlanDetailDTO>> Submit(int companyId, int planId)
        {
            if (!await OwnsCompanyAsync(companyId))
                return Forbid();

            var plan = await FindPlanAsync(companyId, planId, tracking: true);
            if (plan is null)
                return NotFound(new { message = "الخطة غير موجودة." });

            if (!IsEditable(plan))
                return Conflict(new { message = LockedMessage(plan) });

            var problems = ValidateForSubmission(plan);
            if (problems.Count > 0)
                return BadRequest(new { message = "الخطة غير مكتملة: " + string.Join("، ", problems) });

            var now = DateTime.Now;
            plan.ApprovalStatus = NFD_CoursePlanApprovalStatus.PendingApproval;
            plan.SubmittedAt = now;
            plan.ReviewedAt = null;
            plan.ReviewedByUserId = null;
            plan.ReviewNote = null;
            plan.UpdatedAt = now;

            var adminIds = await _context.NFD_Users
                .AsNoTracking()
                .Where(u => u.Role.RoleName == "Admin" && u.Status == NFD_UserStatus.Active)
                .Select(u => u.UserId)
                .ToListAsync();

            Notify(adminIds,
                "طلب اعتماد خطة كورس",
                $"أرسلت شركة «{plan.Company.CompanyName}» خطة الكورس «{plan.Title}» للاعتماد.",
                $"CoursePlan:{plan.PlanId}");

            await _context.SaveChangesAsync();
            return Ok(await ReloadAsync(companyId, planId));
        }

        // POST: .../plans/{planId}/withdraw — pull a pending plan back to Draft.
        [HttpPost("company/{companyId:int}/plans/{planId:int}/withdraw")]
        public async Task<ActionResult<CoursePlanDetailDTO>> Withdraw(int companyId, int planId)
        {
            if (!await OwnsCompanyAsync(companyId))
                return Forbid();

            var plan = await FindPlanAsync(companyId, planId, tracking: true);
            if (plan is null)
                return NotFound(new { message = "الخطة غير موجودة." });

            if (plan.ApprovalStatus != NFD_CoursePlanApprovalStatus.PendingApproval)
                return Conflict(new { message = "لا يمكن سحب إلا الخطط التي بانتظار الاعتماد." });

            plan.ApprovalStatus = NFD_CoursePlanApprovalStatus.Draft;
            plan.SubmittedAt = null;
            plan.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(await ReloadAsync(companyId, planId));
        }

        // ─────────────────────────────────────────────────────────────
        // Execution tracking (only after Authority approval)
        // ─────────────────────────────────────────────────────────────

        // The course is started by the assigned trainer after Authority approval.
        // Company supervisors can still hold/resume and track the execution.

        // POST: .../plans/{planId}/hold
        [HttpPost("company/{companyId:int}/plans/{planId:int}/hold")]
        public Task<ActionResult<CoursePlanDetailDTO>> Hold(int companyId, int planId) =>
            ChangeExecutionAsync(companyId, planId,
                expected: NFD_CoursePlanExecutionStatus.InProgress,
                target: NFD_CoursePlanExecutionStatus.OnHold,
                error: "يمكن إيقاف الكورس الجاري فقط.");

        // POST: .../plans/{planId}/resume
        [HttpPost("company/{companyId:int}/plans/{planId:int}/resume")]
        public Task<ActionResult<CoursePlanDetailDTO>> Resume(int companyId, int planId) =>
            ChangeExecutionAsync(companyId, planId,
                expected: NFD_CoursePlanExecutionStatus.OnHold,
                target: NFD_CoursePlanExecutionStatus.InProgress,
                error: "يمكن استئناف الكورس الموقوف فقط.");

        // PUT: .../plans/{planId}/stages/{stageId}/status
        [HttpPut("company/{companyId:int}/plans/{planId:int}/stages/{stageId:int}/status")]
        public async Task<ActionResult<CoursePlanDetailDTO>> SetStageStatus(int companyId, int planId, int stageId, [FromBody] SetCoursePlanProgressDTO dto)
        {
            if (!await OwnsCompanyAsync(companyId))
                return Forbid();

            var plan = await FindPlanAsync(companyId, planId, tracking: true);
            var stage = plan?.Stages.FirstOrDefault(s => s.StageId == stageId);
            if (plan is null || stage is null)
                return NotFound(new { message = "المرحلة غير موجودة." });

            var blocked = TrackingBlockedMessage(plan);
            if (blocked is not null)
                return Conflict(new { message = blocked });

            if (dto.Status == NFD_CoursePlanProgressStatus.Completed
                && stage.Items.Any(i => i.Status != NFD_CoursePlanProgressStatus.Completed))
                return BadRequest(new { message = "أكمل جميع مهام ومشروعات المرحلة أولاً قبل إغلاقها." });

            if (dto.Status == NFD_CoursePlanProgressStatus.NotStarted
                && stage.Items.Any(i => i.Status != NFD_CoursePlanProgressStatus.NotStarted))
                return BadRequest(new { message = "لا يمكن إعادة المرحلة إلى «لم تبدأ» وفيها مهام بدأت أو اكتملت." });

            stage.Status = dto.Status;
            RecomputeExecution(plan);

            await _context.SaveChangesAsync();
            return Ok(await ReloadAsync(companyId, planId));
        }

        // PUT: .../plans/{planId}/items/{itemId}/status
        [HttpPut("company/{companyId:int}/plans/{planId:int}/items/{itemId:int}/status")]
        public async Task<ActionResult<CoursePlanDetailDTO>> SetItemStatus(int companyId, int planId, int itemId, [FromBody] SetCoursePlanProgressDTO dto)
        {
            if (!await OwnsCompanyAsync(companyId))
                return Forbid();

            var plan = await FindPlanAsync(companyId, planId, tracking: true);
            var stage = plan?.Stages.FirstOrDefault(s => s.Items.Any(i => i.ItemId == itemId));
            var item = stage?.Items.FirstOrDefault(i => i.ItemId == itemId);
            if (plan is null || stage is null || item is null)
                return NotFound(new { message = "العنصر غير موجود." });

            var blocked = TrackingBlockedMessage(plan);
            if (blocked is not null)
                return Conflict(new { message = blocked });

            item.Status = dto.Status;

            // Keep the parent stage consistent with its tasks.
            if (dto.Status != NFD_CoursePlanProgressStatus.NotStarted
                && stage.Status == NFD_CoursePlanProgressStatus.NotStarted)
            {
                stage.Status = NFD_CoursePlanProgressStatus.InProgress;
            }

            if (dto.Status != NFD_CoursePlanProgressStatus.Completed
                && stage.Status == NFD_CoursePlanProgressStatus.Completed)
            {
                stage.Status = NFD_CoursePlanProgressStatus.InProgress;
            }

            RecomputeExecution(plan);

            await _context.SaveChangesAsync();
            return Ok(await ReloadAsync(companyId, planId));
        }

        // ─────────────────────────────────────────────────────────────
        // Notes
        // ─────────────────────────────────────────────────────────────

        // POST: .../plans/{planId}/notes
        // Allowed in every state; can target the whole course, a stage or a task/project.
        [HttpPost("company/{companyId:int}/plans/{planId:int}/notes")]
        public async Task<ActionResult<CoursePlanDetailDTO>> AddNote(int companyId, int planId, [FromBody] AddCoursePlanNoteDTO dto)
        {
            if (!await OwnsCompanyAsync(companyId))
                return Forbid();

            var userId = GetUserId();
            if (userId is null)
                return Unauthorized();

            var text = dto.Text.Trim();
            if (text.Length == 0)
                return BadRequest(new { message = "نص الملاحظة مطلوب." });

            var plan = await FindPlanAsync(companyId, planId, tracking: true);
            if (plan is null)
                return NotFound(new { message = "الخطة غير موجودة." });

            int? stageId = dto.StageId;
            int? itemId = dto.ItemId;

            if (itemId.HasValue)
            {
                var ownerStage = plan.Stages.FirstOrDefault(s => s.Items.Any(i => i.ItemId == itemId.Value));
                if (ownerStage is null)
                    return BadRequest(new { message = "المهمة المحددة لا تتبع هذه الخطة." });

                stageId = ownerStage.StageId;
            }
            else if (stageId.HasValue && plan.Stages.All(s => s.StageId != stageId.Value))
            {
                return BadRequest(new { message = "المرحلة المحددة لا تتبع هذه الخطة." });
            }

            _context.NFD_CoursePlanNotes.Add(new NFD_CoursePlanNote
            {
                PlanId = plan.PlanId,
                StageId = stageId,
                ItemId = itemId,
                UserId = userId.Value,
                Text = text,
                IsAuthority = false,
                CreatedAt = DateTime.Now
            });

            plan.UpdatedAt = DateTime.Now;
            await _context.SaveChangesAsync();

            return Ok(await ReloadAsync(companyId, planId));
        }

        // ─────────────────────────────────────────────────────────────
        // Helpers
        // ─────────────────────────────────────────────────────────────

        private async Task<ActionResult<CoursePlanDetailDTO>> ChangeExecutionAsync(
            int companyId, int planId,
            NFD_CoursePlanExecutionStatus expected, NFD_CoursePlanExecutionStatus target, string error)
        {
            if (!await OwnsCompanyAsync(companyId))
                return Forbid();

            var plan = await FindPlanAsync(companyId, planId, tracking: true);
            if (plan is null)
                return NotFound(new { message = "الخطة غير موجودة." });

            if (plan.ApprovalStatus != NFD_CoursePlanApprovalStatus.Approved || plan.ExecutionStatus != expected)
                return Conflict(new { message = error });

            plan.ExecutionStatus = target;
            plan.UpdatedAt = DateTime.Now;

            await _context.SaveChangesAsync();
            return Ok(await ReloadAsync(companyId, planId));
        }

        private Task<NFD_CoursePlan?> FindPlanAsync(int companyId, int planId, bool tracking) =>
            _reader.DetailQuery(tracking)
                .FirstOrDefaultAsync(p => p.PlanId == planId && p.CompanyId == companyId);

        private async Task<CoursePlanDetailDTO> ReloadAsync(int companyId, int planId)
        {
            // Fresh, untracked read so the response reflects exactly what is stored.
            var plan = await _reader.DetailQuery(tracking: false)
                .FirstAsync(p => p.PlanId == planId && p.CompanyId == companyId);

            return CoursePlanReader.ToDetail(plan, DateTime.Today);
        }

        private async Task<bool> TitleExistsAsync(int companyId, string title, int? exceptPlanId) =>
            await _context.NFD_CoursePlans
                .AsNoTracking()
                .AnyAsync(p => p.CompanyId == companyId && p.Title == title && p.PlanId != (exceptPlanId ?? 0));

        private static bool IsEditable(NFD_CoursePlan plan) =>
            plan.ApprovalStatus is NFD_CoursePlanApprovalStatus.Draft or NFD_CoursePlanApprovalStatus.Rejected;

        private static string LockedMessage(NFD_CoursePlan plan) => plan.ApprovalStatus switch
        {
            NFD_CoursePlanApprovalStatus.PendingApproval => "الخطة بانتظار اعتماد الهيئة ولا يمكن تعديلها. اسحبها أولاً إن أردت التعديل.",
            NFD_CoursePlanApprovalStatus.Approved => "الخطة معتمدة من الهيئة ولا يمكن تعديل هيكلها أو تواريخها.",
            _ => "لا يمكن تعديل الخطة في حالتها الحالية."
        };

        /// <summary>Why execution tracking is not possible right now (null = allowed).</summary>
        private static string? TrackingBlockedMessage(NFD_CoursePlan plan)
        {
            if (plan.ApprovalStatus != NFD_CoursePlanApprovalStatus.Approved)
                return "لا يمكن متابعة التنفيذ قبل اعتماد الهيئة للكورس.";

            return plan.ExecutionStatus switch
            {
                NFD_CoursePlanExecutionStatus.NotStarted => "اضغط «الشروع في الكورس» أولاً لبدء التنفيذ.",
                NFD_CoursePlanExecutionStatus.OnHold => "الكورس موقوف مؤقتاً. استأنفه أولاً.",
                NFD_CoursePlanExecutionStatus.Completed => "الكورس مكتمل.",
                _ => null
            };
        }

        /// <summary>All stages completed ⇒ course completed; reopening a stage reopens the course.</summary>
        private static void RecomputeExecution(NFD_CoursePlan plan)
        {
            var now = DateTime.Now;
            plan.UpdatedAt = now;

            var allDone = plan.Stages.Count > 0
                          && plan.Stages.All(s => s.Status == NFD_CoursePlanProgressStatus.Completed);

            if (allDone)
            {
                plan.ExecutionStatus = NFD_CoursePlanExecutionStatus.Completed;
                plan.CompletedAt ??= now;
            }
            else if (plan.ExecutionStatus == NFD_CoursePlanExecutionStatus.Completed)
            {
                plan.ExecutionStatus = NFD_CoursePlanExecutionStatus.InProgress;
                plan.CompletedAt = null;
            }
        }

        private static string? ValidateHeader(SaveCoursePlanDTO dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Title))
                return "عنوان الكورس مطلوب.";

            if (dto.EndDate.Date < dto.StartDate.Date)
                return "تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء.";

            return null;
        }

        private static string? ValidateStage(NFD_CoursePlan plan, SaveCoursePlanStageDTO dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Title))
                return "عنوان المرحلة مطلوب.";

            var start = dto.StartDate.Date;
            var end = dto.EndDate.Date;

            if (end < start)
                return "تاريخ انتهاء المرحلة يجب أن يكون بعد تاريخ بدئها.";

            if (start < plan.StartDate.Date || end > plan.EndDate.Date)
                return "تواريخ المرحلة يجب أن تقع ضمن فترة الكورس.";

            return null;
        }

        private static string? ValidateItem(NFD_CoursePlanStage stage, SaveCoursePlanItemDTO dto)
        {
            if (string.IsNullOrWhiteSpace(dto.Title))
                return "العنوان مطلوب.";

            var due = dto.DueDate.Date;
            if (due < stage.StartDate.Date || due > stage.EndDate.Date)
                return "الموعد النهائي يجب أن يقع ضمن فترة المرحلة.";

            return null;
        }

        private async Task<(List<int> Ids, string? Error)> ValidateTrainerIdsAsync(IEnumerable<int>? trainerIds)
        {
            var ids = (trainerIds ?? Enumerable.Empty<int>())
                .Where(id => id > 0)
                .Distinct()
                .ToList();

            if (ids.Count == 0)
                return (ids, null);

            var activeIds = await _context.NFD_Trainers
                .AsNoTracking()
                .Where(t => ids.Contains(t.TrainerId) && t.Status == NFD_TrainerStatus.Active)
                .Select(t => t.TrainerId)
                .ToListAsync();

            return activeIds.Count == ids.Count
                ? (ids, null)
                : (ids, "يوجد مدرب مختار غير موجود أو غير نشط.");
        }

        private async Task<string?> ValidateTrainerAsync(int? trainerId)
        {
            if (trainerId is null)
                return null;

            var ok = await _context.NFD_Trainers
                .AsNoTracking()
                .AnyAsync(t => t.TrainerId == trainerId.Value && t.Status == NFD_TrainerStatus.Active);

            return ok ? null : "المدرب المختار غير موجود أو غير نشط.";
        }

        /// <summary>Everything the Authority needs to review: dates, stages, trainers and tasks.</summary>
        private static List<string> ValidateForSubmission(NFD_CoursePlan plan)
        {
            var problems = new List<string>();

            if (plan.StartDate.Date < DateTime.Today)
                problems.Add("تاريخ بدء الكورس في الماضي، حدّثه قبل الإرسال");

            if (string.IsNullOrWhiteSpace(plan.Description))
                problems.Add("وصف الكورس مطلوب");

            if (plan.Stages.Count == 0)
                problems.Add("أضف مرحلة واحدة على الأقل");

            foreach (var stage in plan.Stages.OrderBy(s => s.OrderIndex))
            {
                if (stage.Items.Count == 0)
                    problems.Add($"المرحلة «{stage.Title}» بلا مهام أو مشروعات");
            }

            return problems;
        }

        /// <summary>Queues in-app notifications; persisted by the caller's SaveChanges.</summary>
        private void Notify(IEnumerable<int> userIds, string title, string message, string related)
        {
            foreach (var userId in userIds.Distinct())
            {
                _context.NFD_Notifications.Add(new NFD_Notification
                {
                    UserId = userId,
                    Title = title,
                    Message = message,
                    RelatedEntity = related,
                    IsRead = false,
                    CreatedAt = DateTime.Now
                });
            }
        }

        private static string? Clean(string? value) =>
            string.IsNullOrWhiteSpace(value) ? null : value.Trim();

        private int? GetUserId()
        {
            var value = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub");
            return int.TryParse(value, out var id) ? id : null;
        }

        // Same ownership rule used by CompanyProgramController.
        private async Task<bool> OwnsCompanyAsync(int companyId)
        {
            var userId = GetUserId();
            if (userId is null)
                return false;

            return await _context.NFD_CompanySupervisors
                .AsNoTracking()
                .AnyAsync(s => s.UserId == userId.Value && s.CompanyId == companyId);
        }
    }
}
