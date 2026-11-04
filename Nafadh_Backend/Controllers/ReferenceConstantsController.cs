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

    // Original Training API does NOT expose a groups endpoint.
    // This is a curated catalog of the 37 Training seed groups and 47 Management enum groups.
    [HttpGet("groups")]
    public IActionResult GetGroups()
    {
        var groups = TrainingConstantsCatalog.Groups
            .Select(group => new ReferenceConstantGroupDto
            {
                Code = group.Code,
                LabelEn = group.LabelEn,
                LabelAr = group.LabelAr,
                CanEditLabels = group.CanEditLabels,
                CanChangeActive = group.CanChangeActive,
                CanCreate = group.CanCreate,
                IsActive = true,
                IsReadOnly = group.ReadOnly,
                IsLabelsOnly = group.LabelsOnly,
                IsFixedKeys = TrainingConstantsCatalog.IsManagedNafadh(group.Code)
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
            if (TrainingConstantsCatalog.Find(group)?.CanChangeActive != true)
                return Task.FromResult<IActionResult>(BadRequest(new { Code = "ActivationLocked" }));
            if (requestedActive.HasValue || field.Value.ValueKind is not (JsonValueKind.True or JsonValueKind.False))
                return Task.FromResult<IActionResult>(BadRequest(new { Code = "InvalidActivation" }));
            requestedActive = field.Value.GetBoolean();
        }
        if (!requestedActive.HasValue)
            return UpdateLabelsOnly(group, id, ar, en, cancellationToken);

        var update = JsonSerializer.SerializeToElement(new { label_en = en, label_ar = ar, IsActive = requestedActive.Value });
        return Forward(group, id, update, HttpMethod.Put, cancellationToken);
    }

    private async Task<IActionResult> UpdateLabelsOnly(string group, string id, string ar, string en, CancellationToken ct)
    {
        // Update by stable key, and return the persisted activation flag in the same transaction.
        await using var transaction = await _db.Database.BeginTransactionAsync(ct);
        var flags = await _db.Database.SqlQuery<bool>($@"
            DECLARE @updated TABLE (Active bit);
            UPDATE v SET LabelAr = {ar}, LabelEn = {en}, UpdatedAt = SYSUTCDATETIME()
            OUTPUT INSERTED.IsActive INTO @updated
            FROM dbo.SystemConfigValues v
            JOIN dbo.SystemConfigGroups g ON g.Id = v.ConfigGroupId
            WHERE g.Code = {group} AND v.ValueKey = {id};
            SELECT Active AS Value FROM @updated;").ToListAsync(ct);
        if (flags.Count == 0) return NotFound(new { Code = "UnknownValue" });
        if (flags.Count != 1) return Conflict(new { Code = "DuplicateValueKey" });
        await transaction.CommitAsync(ct);
        return Ok(new { data = new Dictionary<string, object>
        {
            ["id"] = id, ["label_ar"] = ar, ["label_en"] = en, ["IsActive"] = flags[0]
        } });
    }

    private async Task<IActionResult> Forward(
        string code,
        string? suffix,
        JsonElement? payload,
        HttpMethod method,
        CancellationToken cancellationToken)
    {
        if (!TrainingConstantsCatalog.IsKnown(code))
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
