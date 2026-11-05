using System.Text.Json;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.Services;

public static class CatalogSelectionPolicy
{
    public sealed class UnknownValueException() : ArgumentOutOfRangeException("value", "Unknown catalog value.");

    public sealed class InactiveValueException : Exception
    {
        public InactiveValueException(string type) : base($"Catalog value '{type}' is inactive.") { }
    }

    public sealed class LookupUnavailableException : Exception
    {
        public LookupUnavailableException(string reason, Exception? inner = null)
            : base(reason, inner) { }
    }

    public static Task RequireActiveAsync(ITrainingConstantsService constants, NFD_QuestionDifficulty difficulty, CancellationToken ct = default) =>
        RequireActiveAsync(constants, "NFD_QUE_DIFF", difficulty, ct);

    public static Task RequireActiveAsync(ITrainingConstantsService constants, NFD_EvaluationType type, CancellationToken ct = default) =>
        RequireActiveAsync(constants, "NFD_EVL_TYPE", type, ct);

    public static Task RequireActiveAsync(ITrainingConstantsService constants, NFD_QuizQuestionType type, CancellationToken ct = default) =>
        RequireActiveAsync(constants, "NFD_QUE_TYPE", type, ct);

    public static Task RequireActiveAsync(ITrainingConstantsService constants, NFD_WarningLevel level, CancellationToken ct = default) =>
        RequireActiveAsync(constants, "NFD_WRN_LVL", level, ct);

    public static Task RequireActiveAsync(ITrainingConstantsService constants, NFD_CoursePlanItemType value, CancellationToken ct = default) =>
        RequireActiveAsync(constants, "NFD_CPI_TYPE", value, ct);

    public static Task RequireActiveAsync(ITrainingConstantsService constants, NFD_TaskPriority value, CancellationToken ct = default) =>
        RequireActiveAsync(constants, "NFD_TSK_PRI", value, ct);

    public static Task RequireActiveAsync(ITrainingConstantsService constants, NFD_AnnouncementScopeType value, CancellationToken ct = default) =>
        RequireActiveAsync(constants, "NFD_ANN_SCOPE", value, ct);

    public static Task RequireActiveAsync(ITrainingConstantsService constants, NFD_BatchStatus value, CancellationToken ct = default) =>
        RequireActiveAsync(constants, "NFD_BAT_STAT", value, ct);

    public static Task RequireActiveAsync(ITrainingConstantsService constants, NFD_AttendanceStatus value, CancellationToken ct = default) =>
        RequireActiveAsync(constants, "NFD_ATT_STAT", value, ct);

    private static async Task RequireActiveAsync<T>(ITrainingConstantsService constants, string group, T type, CancellationToken cancellationToken)
        where T : struct, Enum
    {
        if (!Enum.IsDefined(type))
            throw new UnknownValueException();

        (int Status, string ContentType, string Body) upstream;
        try
        {
            upstream = await constants.ForwardAsync(group, null, HttpMethod.Get,
                "?includeInactive=true", null, cancellationToken);
        }
        catch (Exception ex) when (ex is HttpRequestException ||
                                   ex is InvalidOperationException ||
                                   ex is TaskCanceledException)
        {
            throw new LookupUnavailableException("Catalog lookup is unavailable; selection could not be verified.", ex);
        }
        if (upstream.Status != 200)
            throw new LookupUnavailableException($"Catalog API returned HTTP {upstream.Status}.");

        try
        {
            using var document = JsonDocument.Parse(upstream.Body);
            foreach (var row in Rows(document.RootElement))
            {
                var key = TrainingConstantsService.ReadValueKey(row);
                if (!string.Equals(key, type.ToString(), StringComparison.OrdinalIgnoreCase))
                    continue;
                var active = GetActive(row);
                if (active is null)
                    throw new LookupUnavailableException($"IsActive is missing for '{type}'.");
                if (!active.Value)
                    throw new InactiveValueException(type.ToString());
                return;
            }
            throw new LookupUnavailableException($"Type '{type}' was not found in {group}.");
        }
        catch (JsonException ex)
        {
            throw new LookupUnavailableException("Invalid response from catalog API.", ex);
        }
    }

    public static async Task<Microsoft.AspNetCore.Mvc.ObjectResult?> CheckSelectionAsync(Func<Task> validate)
    {
        try { await validate(); return null; }
        catch (InactiveValueException) { return new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(new { code = "CatalogValueInactive" }); }
        catch (UnknownValueException) { return new Microsoft.AspNetCore.Mvc.BadRequestObjectResult(new { code = "CatalogValueUnknown" }); }
        catch (LookupUnavailableException) { return new Microsoft.AspNetCore.Mvc.ObjectResult(new { code = "CatalogUnavailable" }) { StatusCode = 503 }; }
    }

    private static IEnumerable<JsonElement> Rows(JsonElement root, int depth = 0)
    {
        if (depth > 6) yield break;
        if (root.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in root.EnumerateArray())
                foreach (var nested in Rows(item, depth + 1))
                    yield return nested;
            yield break;
        }
        if (root.ValueKind != JsonValueKind.Object) yield break;
        if (TrainingConstantsService.ReadValueKey(root) is not null)
        {
            yield return root;
            yield break;
        }
        foreach (var property in root.EnumerateObject())
            if (new[] { "rows", "data", "items", "values", "result", "results" }
                .Contains(property.Name, StringComparer.OrdinalIgnoreCase))
                foreach (var nested in Rows(property.Value, depth + 1))
                    yield return nested;
    }

    private static bool? GetActive(JsonElement row)
    {
        if (!Get(row, "IsActive", out var v)) return null;
        if (v.ValueKind == JsonValueKind.True) return true;
        if (v.ValueKind == JsonValueKind.False) return false;
        if (v.ValueKind == JsonValueKind.Number && v.TryGetInt32(out var i)) return i switch { 1 => true, 0 => false, _ => null };
        if (v.ValueKind == JsonValueKind.String)
        {
            var s = v.GetString();
            if (bool.TryParse(s, out var b)) return b;
            if (s == "1") return true;
            if (s == "0") return false;
        }
        return null;
    }

    private static bool Get(JsonElement row, string name, out JsonElement value)
    {
        foreach (var p in row.EnumerateObject())
            if (string.Equals(p.Name.Replace("_", ""), name, StringComparison.OrdinalIgnoreCase))
            {
                value = p.Value;
                return true;
            }
        value = default;
        return false;
    }
}
