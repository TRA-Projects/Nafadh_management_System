using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Nafadh_Backend.Controllers;

/// <summary>
/// Restricted pilot for updating the display labels of existing Nafadh constants.
/// Uses the shared BiddingDB_Training database without modifying Training Backend.
/// It never modifies identifiers, activation flags, sort order or operational NFD_ rows.
/// </summary>
[ApiController]
[Route("api/management/nafadh-constant-labels")]
[Authorize(Roles = "Admin,SuperAdmin")]
public sealed class NafadhConstantLabelsController : ControllerBase
{
    private readonly Nafadhcontext _db;

    public NafadhConstantLabelsController(Nafadhcontext db) => _db = db;

    public sealed record ChangeLabelsRequest(string? LabelAr, string? LabelEn);

    [HttpPut("question-difficulty/{valueKey}")]
    public async Task<IActionResult> UpdateQuestionDifficultyLabel(
        string valueKey, [FromBody] ChangeLabelsRequest request, CancellationToken cancellationToken)
    {
        // Deliberately limited to the three existing enum keys in the pilot.
        if (valueKey is not ("Easy" or "Medium" or "Hard"))
            return BadRequest(new { message = "Unsupported difficulty value key." });

        if (request is null || string.IsNullOrWhiteSpace(request.LabelAr) ||
            string.IsNullOrWhiteSpace(request.LabelEn))
            return BadRequest(new { message = "Both Arabic and English labels are required." });

        var ar = request.LabelAr.Trim();
        var en = request.LabelEn.Trim();
        if (ar.Length > 200 || en.Length > 200)
            return BadRequest(new { message = "Label is too long." });

        // Parameterized interpolated SQL. Only the two labels and UpdatedAt change.
        // Existing ValueKey, Code, IsActive and all NFD_ operational data are untouched.
        var subject = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        if (!int.TryParse(subject, out var userId)) return Forbid();
        await using var transaction = await _db.Database.BeginTransactionAsync(cancellationToken);
        var ids = await _db.Database.SqlQuery<int>($@"
            DECLARE @changed TABLE (Id int);
            UPDATE v
               SET v.LabelAr = {ar},
                   v.LabelEn = {en},
                   v.UpdatedAt = SYSUTCDATETIME()
            OUTPUT INSERTED.Id INTO @changed
              FROM dbo.SystemConfigValues AS v
              JOIN dbo.SystemConfigGroups AS g ON g.Id = v.ConfigGroupId
             WHERE g.Code = N'NFD_QUE_DIFF'
               AND v.ValueKey = {valueKey};
            SELECT Id AS Value FROM @changed;").ToListAsync(cancellationToken);

        if (ids.Count == 0) return NotFound(new { message = "Constant value was not found." });
        if (ids.Count != 1) return StatusCode(500, new { message = "Unexpected number of modified rows." });
        _db.NFD_AuditLogs.Add(new Models.NFD_AuditLog {
            Action = "UpdateReferenceConstant", EntityName = "SystemConfigValues", EntityId = ids[0],
            UserId = userId, Timestamp = DateTime.UtcNow, Details = System.Text.Json.JsonSerializer.Serialize(
                new { group = "NFD_QUE_DIFF", valueKey, label_ar = ar, label_en = en })
        });
        await _db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return Ok(new { valueKey, label_ar = ar, label_en = en });
    }
}
