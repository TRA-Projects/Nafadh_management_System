namespace Nafadh_Backend.Services;

/// <summary>
/// Contract for forwarding Management reference-constant requests to the unchanged Training API.
/// </summary>
public interface ITrainingConstantsService
{
    Task<(int Status, string ContentType, string Body)> ForwardAsync(
        string code,
        string? suffix,
        HttpMethod method,
        string? query,
        string? jsonBody,
        CancellationToken cancellationToken);
}
