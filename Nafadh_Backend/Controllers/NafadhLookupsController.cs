using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers;

/// <summary>Read-only lookups for authenticated Nafadh screens; Training is unchanged.</summary>
[ApiController]
[Authorize]
[Route("api/management/nafadh-lookups")]
public sealed class NafadhLookupsController : ControllerBase
{
    private readonly ITrainingConstantsService _constants;
    public NafadhLookupsController(ITrainingConstantsService constants) => _constants = constants;

    [HttpGet("evaluation-types")]
    public async Task<IActionResult> EvaluationTypes(CancellationToken ct)
    {
        try
        {
            // Includes inactive values so historical evaluations display their current labels.
            var result = await _constants.ForwardAsync("NFD_EVL_TYPE", null, HttpMethod.Get, "?includeInactive=true", null, ct);
            return new ContentResult { StatusCode = result.Status, ContentType = result.ContentType, Content = result.Body };
        }
        catch (InvalidOperationException) { return StatusCode(503, new { message = "Constants endpoint not configured" }); }
        catch (HttpRequestException) { return StatusCode(502, new { message = "Constants endpoint unavailable" }); }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested) { return StatusCode(504); }
    }

    [HttpGet("warning-types")]
    public async Task<IActionResult> WarningTypes(CancellationToken ct)
    {
        try
        {
            var result = await _constants.ForwardAsync("NFD_WRN_TYPE", null, HttpMethod.Get, "?includeInactive=true", null, ct);
            return new ContentResult { StatusCode = result.Status, ContentType = result.ContentType, Content = result.Body };
        }
        catch (InvalidOperationException) { return StatusCode(503, new { message = "Constants endpoint not configured" }); }
        catch (HttpRequestException) { return StatusCode(502, new { message = "Constants endpoint unavailable" }); }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested) { return StatusCode(504); }
    }

    /// <summary>
    /// Generic read-only lookup for any Nafadh enum-backed group (e.g. NFD_TSK_PRI).
    /// Includes inactive values so historical records keep their current labels; the
    /// consumer uses IsActive to decide which options are offered for new records.
    /// </summary>
    [HttpGet("groups/{code}")]
    public async Task<IActionResult> Group(string code, CancellationToken ct)
    {
        if (!TrainingConstantsCatalog.IsManagedNafadh(code))
            return NotFound(new { message = "Unknown Nafadh constants group." });
        try
        {
            var result = await _constants.ForwardAsync(code.ToUpperInvariant(), null, HttpMethod.Get, "?includeInactive=true", null, ct);
            return new ContentResult { StatusCode = result.Status, ContentType = result.ContentType, Content = result.Body };
        }
        catch (InvalidOperationException) { return StatusCode(503, new { message = "Constants endpoint not configured" }); }
        catch (HttpRequestException) { return StatusCode(502, new { message = "Constants endpoint unavailable" }); }
        catch (TaskCanceledException) when (!ct.IsCancellationRequested) { return StatusCode(504); }
    }
}
