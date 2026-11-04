using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Services;
using Nafadh_Backend.DTOs;

namespace Nafadh_Backend.Controllers;

/// <summary>
/// Management-only gateway for existing Training catalog endpoints.
/// Does NOT require any changes to the Training backend or database schema.
/// </summary>
[ApiController]
[Route("api/management/reference-constants")]
[Authorize(Roles = "Admin,SuperAdmin")]
public sealed class ReferenceConstantsController : ControllerBase
{
    private readonly Nafadhcontext _db;
    private readonly ITrainingConstantsService _service;
    private readonly ILogger<ReferenceConstantsController> _logger;

    public ReferenceConstantsController(Nafadhcontext db, ITrainingConstantsService service, ILogger<ReferenceConstantsController> logger)
    {
        _db = db;
        _service = service;
        _logger = logger;
    }

    private sealed record GroupHeader(string Code, string NameEn, string NameAr, bool IsActive);

    // Discover even empty groups in SQL. Discovery never grants write permission.
    [HttpGet("groups")]
    public async Task<IActionResult> GetGroups(CancellationToken cancellationToken)
    {
        List<GroupHeader> headers;
        try
        {
            headers = await _db.Database.SqlQuery<GroupHeader>($"""
                SELECT Code, NameEn, NameAr, IsActive FROM dbo.SystemConfigGroups ORDER BY SortOrder, Code
                """).ToListAsync(cancellationToken);
        }
        catch (Microsoft.Data.SqlClient.SqlException ex)
        {
            _logger.LogError(ex, "Unable to list reference catalog groups");
            return StatusCode(503, new { Code = "CatalogUnavailable" });
        }
        var groups = headers.Select(header =>
        {
            var group = TrainingConstantsCatalog.Find(header.Code);
            return new ReferenceConstantGroupDto
            {
                Code = header.Code, LabelEn = header.NameEn, LabelAr = header.NameAr,
                IsActive = header.IsActive, CanEditLabels = group?.CanEditLabels ?? false,
                CanChangeActive = group?.CanChangeActive ?? false, ActivationKeys = group?.ActivationKeys,
                CanCreate = group?.CanCreate ?? false, IsReadOnly = group?.ReadOnly ?? true,
                IsLabelsOnly = group?.LabelsOnly ?? false, IsFixedKeys = TrainingConstantsCatalog.IsManagedNafadh(header.Code)
            };
        }).ToList();

        var json = JsonSerializer.Serialize(
            new ReferenceConstantGroupsResponseDto
            {
                Data = groups
            });

        return Content(json, "application/json", Encoding.UTF8);
    }

    [HttpGet("values/{code}")]
    public Task<IActionResult> GetValues(string code, CancellationToken cancellationToken) =>
        Forward(code, null, null, HttpMethod.Get, cancellationToken);

    [HttpGet("values/{code}/search")]
    public Task<IActionResult> SearchValues(string code, CancellationToken cancellationToken) =>
        Forward(code, "search", null, HttpMethod.Get, cancellationToken);

    // Every Nafadh enum-backed group has fixed keys (backend business logic switches on them),
    // so new values can never be added through this gateway.
    private static bool IsRestrictedNafadhGroup(string code) =>
        TrainingConstantsCatalog.Find(code) is { CanCreate: false, CanEditLabels: true };

    [HttpPost("values/{code}/ensure")]
    public Task<IActionResult> EnsureValue(string code, [FromBody] JsonElement payload, CancellationToken cancellationToken) =>
        IsRestrictedNafadhGroup(code)
            ? Task.FromResult<IActionResult>(BadRequest(new { Code = "RestrictedGroup", Message = "Adding values to this group is not supported." }))
            : Forward(code, "ensure", payload, HttpMethod.Post, cancellationToken);

    [HttpPost("values/{code}")]
    public Task<IActionResult> CreateValue(string code, [FromBody] JsonElement payload, CancellationToken cancellationToken) =>
        IsRestrictedNafadhGroup(code)
            ? Task.FromResult<IActionResult>(BadRequest(new
            {
                Code = "NewDifficultyNotSupportedYet",
                Message = "Adding values to these Nafadh groups is restricted because backend business logic uses predefined enum values."
            }))
            : Forward(code, null, payload, HttpMethod.Post, cancellationToken);

    [HttpPut("values/{code}/{id}")]
    public Task<IActionResult> UpdateValue(string code, string id, [FromBody] JsonElement payload, CancellationToken cancellationToken)
    {
        if (!TrainingConstantsCatalog.IsManagedNafadh(code) || TrainingConstantsCatalog.IsReadOnly(code))
            return Forward(code, id, payload, HttpMethod.Put, cancellationToken);

        // Nafadh enum groups: only the two labels (and, where allowed, IsActive) may change.
        // Code, ValueKey, parent/sub-reason fields are dropped so the enum identity can never drift.
        if (payload.ValueKind != JsonValueKind.Object)
            return Task.FromResult<IActionResult>(BadRequest(new { Code = "InvalidBody" }));

        string? Read(string name) =>
            payload.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString()?.Trim() : null;

        var en = Read("label_en");
        var ar = Read("label_ar");
        if (string.IsNullOrWhiteSpace(en) || string.IsNullOrWhiteSpace(ar))
            return Task.FromResult<IActionResult>(BadRequest(new { Code = "LabelsRequired", Message = "Both Arabic and English labels are required." }));
        if (en.Length > 200 || ar.Length > 200)
            return Task.FromResult<IActionResult>(BadRequest(new { Code = "LabelTooLong", Message = "Label is too long." }));

        var group = code.ToUpperInvariant();
        Type? enumType = group switch
        {
            "NFD_TIC_STAT" => typeof(NFD_SupportTicketStatus),
            "NFD_WDR_STAT" => typeof(NFD_WithdrawalRequestStatus),
            "NFD_RPT_TYPE" => typeof(NFD_ReportType),
            "NFD_REM_STAT" => typeof(global::Nafadh_Backend.Enums.Nafadh_Backend.Enums.NFD_RemediationStatus),
            "NFD_EVL_PER" => typeof(NFD_EvaluationPeriod),
            "NFD_MOD_STAT" => typeof(NFD_ModuleProgressStatus),
            "NFD_EXT_ACT" => typeof(NFD_ExitLimitAction),
            "NFD_FIL_TYPE" => typeof(NFD_FileType),
            "NFD_PRG_STAT" => typeof(NFD_ProgramStatus),
            "NFD_PYS_STAT" => typeof(NFD_PaymentScheduleStatus),
            "NFD_CPE_STAT" => typeof(NFD_CoursePlanExecutionStatus),
            "NFD_CPI_TYPE" => typeof(NFD_CoursePlanItemType),
            "NFD_CPP_STAT" => typeof(NFD_CoursePlanProgressStatus),
            "NFD_FBK_TYPE" => typeof(NFD_FeedbackType),
            "NFD_BDG_COND" => typeof(NFD_BadgeConditionType),
            "NFD_PJT_ROLE" => typeof(NFD_ProjectMemberRole),
            "NFD_MSG_STAT" => typeof(NFD_MessageStatus),
            "NFD_TRK_STAT" => typeof(NFD_TrackStatus),
            "NFD_VER_STAT" => typeof(NFD_VerificationStatus),
            "NFD_QUE_TYPE" => typeof(NFD_QuizQuestionType),
            "NFD_WRN_LVL" => typeof(NFD_WarningLevel),
            "NFD_WRN_SCOPE" => typeof(NFD_WarningScope),
            "NFD_TSK_PRI" => typeof(NFD_TaskPriority),
            "NFD_PAY_STAT" => typeof(NFD_PaymentStatus),
            "NFD_ANN_SCOPE" => typeof(NFD_AnnouncementScopeType),
            "NFD_CMP_STAT" => typeof(NFD_CompanyStatus),
            "NFD_CPA_STAT" => typeof(NFD_CoursePlanApprovalStatus),
            "NFD_USR_STAT" => typeof(NFD_UserStatus),
            "NFD_QUE_DIFF" => typeof(NFD_QuestionDifficulty),
            "NFD_EVL_TYPE" => typeof(NFD_EvaluationType),
            "NFD_WRN_TYPE" => typeof(NFD_WarningType),
            _ => null
        };
        if (enumType == null)
            return Task.FromResult<IActionResult>(StatusCode(StatusCodes.Status403Forbidden, new { Code = "ReadOnlyGroup" }));

        if (!Enum.IsDefined(enumType, id))
            return Task.FromResult<IActionResult>(BadRequest(new { Code = "InvalidValueKey" }));
        bool? requestedActive = null;
        foreach (var field in payload.EnumerateObject())
        {
            if (field.Name.Replace("_", "").Equals("ValueKey", StringComparison.OrdinalIgnoreCase)
                && (field.Value.ValueKind != JsonValueKind.String || field.Value.GetString() != id))
                return Task.FromResult<IActionResult>(BadRequest(new { Code = "InvalidValueKey" }));
            if (!field.Name.Replace("_", "").Equals("IsActive", StringComparison.OrdinalIgnoreCase)) continue;
            if (TrainingConstantsCatalog.Find(group)?.CanChangeActiveFor(id) != true)
                return Task.FromResult<IActionResult>(BadRequest(new { Code = "ActivationLocked" }));
            if (requestedActive.HasValue || field.Value.ValueKind is not (JsonValueKind.True or JsonValueKind.False))
                return Task.FromResult<IActionResult>(BadRequest(new { Code = "InvalidActivation" }));
            requestedActive = field.Value.GetBoolean();
        }
        OriginalValue? original = null;
        if (payload.TryGetProperty("expected", out var expected))
        {
            if (expected.ValueKind != JsonValueKind.Object ||
                !expected.TryGetProperty("label_ar", out var oldAr) || oldAr.ValueKind != JsonValueKind.String ||
                !expected.TryGetProperty("label_en", out var oldEn) || oldEn.ValueKind != JsonValueKind.String ||
                !expected.TryGetProperty("active", out var oldActive) || oldActive.ValueKind is not (JsonValueKind.True or JsonValueKind.False))
                return Task.FromResult<IActionResult>(BadRequest(new { Code = "InvalidPrecondition" }));
            original = new(oldAr.GetString()!, oldEn.GetString()!, oldActive.GetBoolean());
        }
        return UpdateNafadhValue(group, id, ar, en, requestedActive, original, cancellationToken);
    }

    private sealed record OriginalValue(string Ar, string En, bool Active);

    private async Task<IActionResult> UpdateNafadhValue(string group, string id, string ar, string en, bool? active, OriginalValue? original, CancellationToken ct)
    {
        // Update by stable key, and return the persisted activation flag in the same transaction.
        await using var transaction = await _db.Database.BeginTransactionAsync(ct);
        var actor = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (!int.TryParse(actor, out var userId)) return Forbid();
        var updated = await _db.Database.SqlQuery<ChangedValue>($@"
            DECLARE @updated TABLE (Id int, Code nvarchar(16), Active bit, SubReason bit, ParentKey nvarchar(64), OldAr nvarchar(512), OldEn nvarchar(512), OldActive bit);
            UPDATE v SET LabelAr = {ar}, LabelEn = {en}, IsActive = COALESCE({active}, v.IsActive), UpdatedAt = SYSUTCDATETIME()
            OUTPUT INSERTED.Id, INSERTED.Code, INSERTED.IsActive, INSERTED.SubReasonDropdown, INSERTED.ParentValueKey,
                   DELETED.LabelAr, DELETED.LabelEn, DELETED.IsActive INTO @updated
            FROM dbo.SystemConfigValues v
            JOIN dbo.SystemConfigGroups g ON g.Id = v.ConfigGroupId
            WHERE g.Code = {group} AND v.ValueKey = {id};
            SELECT * FROM @updated;").ToListAsync(ct);
        if (updated.Count == 0) return active.HasValue
            ? NotFound(new { Code = "NotFound", Message = "Config value not found" }) : NotFound(new { Code = "UnknownValue" });
        if (updated.Count != 1) return Conflict(new { Code = "DuplicateValueKey" });
        var row = updated[0];
        if (original != null && original != new OriginalValue(row.OldAr, row.OldEn, row.OldActive))
            return Conflict(new { Code = "CatalogValueChanged", Message = "The value changed after it was opened. Reload it before saving." });
        _db.NFD_AuditLogs.Add(new Models.NFD_AuditLog { Action = "UpdateReferenceConstant", EntityName = "SystemConfigValues",
            EntityId = row.Id, UserId = userId, Timestamp = DateTime.UtcNow,
            Details = JsonSerializer.Serialize(new { group, valueKey = id, label_ar = ar, label_en = en, row.Active }) });
        await _db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        if (active.HasValue)
            return Content(JsonSerializer.Serialize(new { Data = new { id, code = string.IsNullOrWhiteSpace(row.Code) ? id : row.Code,
                label_en = en, label_ar = ar, IsActive = row.Active, subReasonDropdown = row.SubReason, parentReasonId = row.ParentKey } }), "application/json", Encoding.UTF8);
        return Ok(new { data = new Dictionary<string, object>
        {
            ["id"] = id, ["label_ar"] = ar, ["label_en"] = en, ["IsActive"] = row.Active
        } });
    }

    private sealed class ChangedValue
    {
        public int Id { get; set; }
        public string? Code { get; set; }
        public bool Active { get; set; }
        public bool? SubReason { get; set; }
        public string? ParentKey { get; set; }
        public string OldAr { get; set; } = "";
        public string OldEn { get; set; } = "";
        public bool OldActive { get; set; }
    }

    private async Task<IActionResult> Forward(
        string code,
        string? suffix,
        JsonElement? payload,
        HttpMethod method,
        CancellationToken cancellationToken)
    {
        if (method != HttpMethod.Get && !TrainingConstantsCatalog.IsKnown(code))
            return NotFound(new { Code = "UnknownGroup", Message = "Unknown reference catalog group." });

        if (method != HttpMethod.Get && TrainingConstantsCatalog.Find(code)?.CanEditLabels != true)
            return StatusCode(StatusCodes.Status403Forbidden,
                new { Code = "ReadOnlyGroup", Message = "This reference catalog cannot be modified." });

        // Avoid unbounded arbitrary segments; we only allow Training value identifiers.
        if (suffix is not null && suffix != "search" && suffix != "ensure" &&
            (suffix.Length > 128 || suffix.Contains('/') || suffix.Contains('\\')))
            return BadRequest(new { Code = "InvalidId" });

        string? jsonBody = null;
        if (method != HttpMethod.Get)
        {
            if (payload is null || payload.Value.ValueKind != JsonValueKind.Object)
                return BadRequest(new { Code = "InvalidBody" });
            jsonBody = payload.Value.GetRawText();
            if (jsonBody.Length > 16_384)
                return StatusCode(StatusCodes.Status413PayloadTooLarge);
        }

        try
        {
            // Do NOT pass Management JWT to the unrelated Training JWT handler.
            // The original Training controller is AllowAnonymous; upstream access must
            // also be restricted by trusted network controls before production use.
            var upstream = await _service.ForwardAsync(
                code, suffix, method, Request.QueryString.Value, jsonBody, cancellationToken);
            return new ContentResult
            {
                Content = upstream.Body,
                ContentType = upstream.ContentType,
                StatusCode = upstream.Status
            };
        }
        catch (InvalidOperationException ex)
        {
            if (method == HttpMethod.Get)
            {
                _logger.LogError(ex, "Unable to read reference catalog {Code}", code);
                return StatusCode(503, new { Code = "CatalogUnavailable" });
            }
            _logger.LogError(ex, "Training constants integration not configured");
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { Code = "TrainingNotConfigured", Message = "Training constants endpoint is not configured." });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Training constants API is unreachable");
            return StatusCode(StatusCodes.Status502BadGateway,
                new { Code = "TrainingUnavailable", Message = "Training constants service is unavailable." });
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return StatusCode(StatusCodes.Status504GatewayTimeout,
                new { Code = "TrainingTimeout", Message = "Training constants request timed out." });
        }
    }
}
