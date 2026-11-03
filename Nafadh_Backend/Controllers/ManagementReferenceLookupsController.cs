using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers;

/// <summary>Read-only constants needed by authenticated Management pages.
/// Write access remains restricted in ReferenceConstantsController.</summary>
[ApiController]
[Route("api/management/lookups")]
[Authorize]
public sealed class ManagementReferenceLookupsController : ControllerBase
{
    private readonly ITrainingConstantsService _service;
    private readonly ILogger<ManagementReferenceLookupsController> _logger;

    public ManagementReferenceLookupsController(ITrainingConstantsService service, ILogger<ManagementReferenceLookupsController> logger)
    {
        _service = service;
        _logger = logger;
    }

    [HttpGet("question-difficulties")]
    public async Task<IActionResult> GetQuestionDifficulties(CancellationToken cancellationToken)
    {
        try
        {
            // Use the existing Training API unchanged, returning active records only.
            var result = await _service.ForwardAsync("NFD_QUE_DIFF", null, HttpMethod.Get,
                "?pageIndex=0&pageSize=100", null, cancellationToken);
            return new ContentResult { StatusCode = result.Status, ContentType = result.ContentType, Content = result.Body };
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogError(ex, "Training constants integration not configured");
            return StatusCode(503, new { code = "TrainingNotConfigured" });
        }
        catch (HttpRequestException ex)
        {
            _logger.LogWarning(ex, "Training constants API unavailable");
            return StatusCode(502, new { code = "TrainingUnavailable" });
        }
        catch (TaskCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return StatusCode(504, new { code = "TrainingTimeout" });
        }
    }
}
