using System.Text;

namespace Nafadh_Backend.Services;

/// <summary>Server-to-server calls to unchanged Bidding/Training AdminSystemController endpoints.</summary>
public sealed class TrainingConstantsService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;

    public TrainingConstantsService(IHttpClientFactory httpClientFactory, IConfiguration configuration)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
    }

    public async Task<(int Status, string ContentType, string Body)> ForwardAsync(
        string code, string? suffix, HttpMethod method, string? query, string? jsonBody, CancellationToken cancellationToken)
    {
        // Mandatory per environment: fail closed instead of calling an arbitrary server.
        var baseUrl = _configuration["TrainingConstants:BaseUrl"];
        if (!Uri.TryCreate(baseUrl, UriKind.Absolute, out var origin) ||
            (origin.Scheme != Uri.UriSchemeHttp && origin.Scheme != Uri.UriSchemeHttps))
            throw new InvalidOperationException("TrainingConstants:BaseUrl must be an absolute HTTP(S) URL.");

        var url = new Uri(origin.ToString().TrimEnd('/') +
            "/api/jobseekers/admin/system-config/values/" + Uri.EscapeDataString(code.ToUpperInvariant()) +
            (suffix is null ? "" : "/" + Uri.EscapeDataString(suffix)) +
            (method == HttpMethod.Get ? query ?? "" : ""));

        var client = _httpClientFactory.CreateClient("TrainingConstants");
        using var request = new HttpRequestMessage(method, url);
        if (jsonBody is not null)
            request.Content = new StringContent(jsonBody, Encoding.UTF8, "application/json");

        using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        var contentType = response.Content.Headers.ContentType?.ToString() ?? "application/json";
        return ((int)response.StatusCode, contentType, body);
    }
}
