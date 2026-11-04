using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.EntityFrameworkCore;
using Microsoft.Data.SqlClient;

namespace Nafadh_Backend.Services;

/// <summary>Catalog reads use SQL. Writes for Training-owned groups retain their original API.</summary>
public sealed class TrainingConstantsService : ITrainingConstantsService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IConfiguration _configuration;
    private readonly IHttpContextAccessor _httpContextAccessor;
    private readonly IBiddingTokenService _biddingTokenService;

private readonly IHttpClientFactory _httpClientFactory;
private readonly IConfiguration _configuration;
private readonly IHttpContextAccessor _httpContextAccessor;
private readonly IBiddingTokenService _biddingTokenService;
private readonly Nafadhcontext _db;

public TrainingConstantsService(
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IHttpContextAccessor httpContextAccessor,
    IBiddingTokenService biddingTokenService,
    Nafadhcontext db)
{
    _httpClientFactory = httpClientFactory;
    _configuration = configuration;
    _httpContextAccessor = httpContextAccessor;
    _biddingTokenService = biddingTokenService;
    _db = db;
}

internal static string? ReadValueKey(JsonElement row)
{
    string? legacyId = null;
    string? explicitKey = null;

    foreach (var property in row.EnumerateObject())
    {
        if (property.Name.Replace("_", "").Equals(
            "ValueKey", StringComparison.OrdinalIgnoreCase))
        {
            if (property.Value.ValueKind != JsonValueKind.String)
                return null;

            var key = property.Value.GetString()?.Trim();

            if (string.IsNullOrEmpty(key) ||
                (explicitKey != null &&
                !string.Equals(key, explicitKey,
                    StringComparison.OrdinalIgnoreCase)))
                return null;

            explicitKey = key;
        }
        else if (property.Name.Equals(
            "id", StringComparison.OrdinalIgnoreCase) &&
            property.Value.ValueKind == JsonValueKind.String)
        {
            legacyId = property.Value.GetString()?.Trim();
        }
    }

    return explicitKey ?? legacyId;
}
    }

    public async Task<(int Status, string ContentType, string Body)> ForwardAsync(
        string code, string? suffix, HttpMethod method, string? query, string? jsonBody, CancellationToken cancellationToken)
    {
        if (method == HttpMethod.Get)
        {
            if (suffix is not (null or "search"))
                return (403, "application/json", """{"Code":"RestrictedGroup"}""");
            try
            {
                if (!TrainingConstantsCatalog.IsKnown(code) && !await _db.Database.SqlQuery<int>(
                    $"SELECT Id AS Value FROM dbo.SystemConfigGroups WHERE Code = {code}").AnyAsync(cancellationToken))
                    return (404, "application/json", """{"Code":"UnknownGroup","Message":"Unknown reference catalog group."}""");
                return await ReadCatalogAsync(TrainingConstantsCatalog.Find(code)?.Code ?? code, suffix == "search", query, cancellationToken);
            }
            catch (SqlException ex)
            {
                throw new InvalidOperationException("Nafadh catalog storage is unavailable.", ex);
            }
        }
        if (TrainingConstantsCatalog.IsManagedNafadh(code))
            return (403, "application/json", """{"Code":"RestrictedGroup"}""");
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

    internal sealed class CatalogRow
    {
        public string id { get; set; } = "";
        public string? code { get; set; }
        public string label_ar { get; set; } = "";
        public string label_en { get; set; } = "";
        public bool IsActive { get; set; }
        public bool? subReasonDropdown { get; set; }
        public string? parentReasonId { get; set; }
    }

    private async Task<(int, string, string)> ReadCatalogAsync(string code, bool search, string? query, CancellationToken ct)
    {
        var parameters = QueryHelpers.ParseQuery(query);
        string? Param(string name) => parameters.TryGetValue(name, out var values) ? values.FirstOrDefault() : null;
        var needle = (Param("q") ?? "").Trim().ToLowerInvariant();
        var includeInactive = false;
        int? page = null, size = null;
        static bool Number(string? s, out int? n)
        {
            n = null;
            if (string.IsNullOrWhiteSpace(s)) return true;
            if (!int.TryParse(s, out var value)) return false;
            n = value;
            return true;
        }
        if (!search)
        {
            var errors = new Dictionary<string, string[]>();
            void Invalid(string field, string? value) => errors[field] = [string.IsNullOrWhiteSpace(value)
                ? "The value '' is invalid." : $"The value '{value}' is not valid."];
            if (!Number(Param("pageIndex"), out page)) Invalid("pageIndex", Param("pageIndex"));
            if (!Number(Param("pageSize"), out size)) Invalid("pageSize", Param("pageSize"));
            if (Param("includeInactive") is string flag && !bool.TryParse(flag, out includeInactive)) Invalid("includeInactive", flag);
            if (errors.Count != 0)
                return (400, "application/problem+json; charset=utf-8", JsonSerializer.Serialize(new { errors,
                    type = "https://tools.ietf.org/html/rfc7231#section-6.5.1", title = "One or more validation errors occurred.",
                    status = 400, traceId = System.Diagnostics.Activity.Current?.Id ?? Guid.NewGuid().ToString() }));
        }
        var parent = !search && !string.IsNullOrWhiteSpace(Param("parentReasonId")) ? Param("parentReasonId") : null;
        var rows = new List<CatalogRow>();
        if (!search || needle.Length != 0)
        {
            rows = await _db.Database.SqlQuery<CatalogRow>($"""
                SELECT v.ValueKey AS id, v.Code AS code, COALESCE(v.LabelAr,'') AS label_ar,
                       COALESCE(v.LabelEn,'') AS label_en, v.IsActive, v.SubReasonDropdown AS subReasonDropdown,
                       v.ParentValueKey AS parentReasonId
                FROM dbo.SystemConfigValues v
                WHERE v.ConfigGroupId = (SELECT TOP (1) Id FROM dbo.SystemConfigGroups WHERE Code = {code})
                  AND ({includeInactive} = 1 OR v.IsActive = 1)
                  AND ({parent} IS NULL OR v.ParentValueKey = {parent})
                ORDER BY v.SortOrder, CASE WHEN {search} = 0 THEN v.LabelEn END
                """).ToListAsync(ct);
            foreach (var row in rows)
                if (string.IsNullOrWhiteSpace(row.code)) row.code = row.id;
        }
        object data;
        if (search)
            data = rows.Where(r => r.label_ar.Trim().ToLowerInvariant().Contains(needle) || r.label_en.Trim().ToLowerInvariant().Contains(needle));
        else
        {
            var total = rows.Count;
            var paged = page >= 0 && size > 0;
            var pageSize = paged ? (size is 5 or 10 or 15 ? size.Value : 5) : total;
            var pageIndex = paged ? Math.Min(page!.Value, Math.Max(0, (total - 1) / pageSize)) : 0;
            data = new { rows = rows.Skip(pageIndex * pageSize).Take(pageSize), total, pageIndex, pageSize };
        }
        return (200, "application/json; charset=utf-8", JsonSerializer.Serialize(new { Data = data }));
    }
}
