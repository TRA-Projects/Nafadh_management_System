using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;

namespace Nafadh_Backend.Services;

/// <summary>Server-to-server calls to unchanged Bidding/Training AdminSystemController endpoints.</summary>
public sealed class TrainingConstantsService : ITrainingConstantsService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IBiddingTokenService _biddingTokenService;

    public TrainingConstantsService(IHttpClientFactory httpClientFactory, IConfiguration configuration,
        IHttpContextAccessor httpContextAccessor, IBiddingTokenService biddingTokenService)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _httpContextAccessor = httpContextAccessor;
        _biddingTokenService = biddingTokenService;
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
        // Server-to-server: sign a Bidding token for the signed-in Nafadh user so the call is not rejected for the token.
        var principal = _httpContextAccessor.HttpContext?.User;
        var idStr = principal?.FindFirstValue(ClaimTypes.NameIdentifier) ?? principal?.FindFirstValue("sub");
        if (int.TryParse(idStr, out var uid))
        {
            var email = principal?.FindFirstValue(ClaimTypes.Email) ?? principal?.FindFirstValue("email");
            var role = principal?.FindFirstValue(ClaimTypes.Role) ?? principal?.FindFirstValue("role");
            var issued = _biddingTokenService.TryGenerate(uid, email, role);
            if (issued is not null)
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", issued.Value.Token);
        }

        if (jsonBody is not null)
            request.Content = new StringContent(jsonBody, Encoding.UTF8, "application/json");

        using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        var contentType = response.Content.Headers.ContentType?.ToString() ?? "application/json";
        return ((int)response.StatusCode, contentType, body);
    }
}
