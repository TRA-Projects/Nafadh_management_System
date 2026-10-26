using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.Services;

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
    private readonly TrainingConstantsService _service;
    private readonly ILogger<ReferenceConstantsController> _logger;

    public ReferenceConstantsController(TrainingConstantsService service, ILogger<ReferenceConstantsController> logger)
    {
        _service = service;
        _logger = logger;
    }

    // Original Training API does NOT expose a groups endpoint.
    // This is a curated catalog of the 37 Training seed groups and 47 Management enum groups.
    [HttpGet("groups")]
    public IActionResult GetGroups()
    {
        var groups = TrainingConstantsCatalog.Groups.Select(group => new
        {
            code = group.Code,
            label_en = group.LabelEn,
            label_ar = group.LabelAr,
            IsActive = true,
            IsReadOnly = group.ReadOnly
        });
        // Keep original frontend's PascalCase IsActive / IsReadOnly keys.
        var json = JsonSerializer.Serialize(new { Data = groups }, new JsonSerializerOptions
        {
            PropertyNamingPolicy = null
        });
        return Content(json, "application/json", Encoding.UTF8);
    }

    [HttpGet("values/{code}")]
    public Task<IActionResult> GetValues(string code, CancellationToken cancellationToken) =>
        Forward(code, null, null, HttpMethod.Get, cancellationToken);

    [HttpGet("values/{code}/search")]
    public Task<IActionResult> SearchValues(string code, CancellationToken cancellationToken) =>
        Forward(code, "search", null, HttpMethod.Get, cancellationToken);

    [HttpPost("values/{code}/ensure")]
    public Task<IActionResult> EnsureValue(string code, [FromBody] JsonElement payload, CancellationToken cancellationToken) =>
        Forward(code, "ensure", payload, HttpMethod.Post, cancellationToken);

    [HttpPost("values/{code}")]
    public Task<IActionResult> CreateValue(string code, [FromBody] JsonElement payload, CancellationToken cancellationToken) =>
        Forward(code, null, payload, HttpMethod.Post, cancellationToken);

    [HttpPut("values/{code}/{id}")]
    public Task<IActionResult> UpdateValue(string code, string id, [FromBody] JsonElement payload, CancellationToken cancellationToken) =>
        Forward(code, id, payload, HttpMethod.Put, cancellationToken);

    private async Task<IActionResult> Forward(
        string code,
        string? suffix,
        JsonElement? payload,
        HttpMethod method,
        CancellationToken cancellationToken)
    {
        if (!TrainingConstantsCatalog.IsKnown(code))
            return NotFound(new { Code = "UnknownGroup", Message = "Unknown reference catalog group." });

        if (method != HttpMethod.Get && TrainingConstantsCatalog.IsReadOnly(code))
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
