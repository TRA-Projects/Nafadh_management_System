using System.Text.Json;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.Services;

/// <summary>
/// Checks whether a NEW use of an evaluation type is allowed by NFD_EVL_TYPE.
/// Reads the existing Training API; it never alters Training code or database schema.
/// </summary>
public static class EvaluationTypePolicy
{
    public sealed class InactiveTypeException : Exception
    {
        public InactiveTypeException(string type) : base($"Evaluation type '{type}' is inactive.") { }
    }

    public sealed class LookupUnavailableException : Exception
    {
        public LookupUnavailableException(string reason, Exception? inner = null)
            : base(reason, inner) { }
    }

    public static async Task RequireActiveAsync(
        ITrainingConstantsService constants, NFD_EvaluationType type,
        CancellationToken cancellationToken = default)
    {
        if (!Enum.IsDefined(type))
            throw new ArgumentOutOfRangeException(nameof(type), "Unsupported evaluation type.");

        (int Status, string ContentType, string Body) upstream;
        try
        {
            upstream = await constants.ForwardAsync("NFD_EVL_TYPE", null, HttpMethod.Get,
                "?includeInactive=true", null, cancellationToken);
        }
        catch (Exception ex) when (ex is HttpRequestException ||
                                   ex is InvalidOperationException ||
                                   ex is TaskCanceledException)
        {
            throw new LookupUnavailableException("Evaluation constants lookup is unavailable; no new evaluation was created.", ex);
        }
        if (upstream.Status != 200)
            throw new LookupUnavailableException($"Evaluation constants API returned HTTP {upstream.Status}.");

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
                    throw new InactiveTypeException(type.ToString());
                return;
            }
            throw new LookupUnavailableException($"Type '{type}' was not found in NFD_EVL_TYPE.");
        }
        catch (JsonException ex)
        {
            throw new LookupUnavailableException("Invalid response from evaluation constants API.", ex);
        }
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
        if (v.ValueKind == JsonValueKind.Number && v.TryGetInt32(out var i)) return i != 0;
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
            if (string.Equals(p.Name, name, StringComparison.OrdinalIgnoreCase))
            {
                value = p.Value;
                return true;
            }
        value = default;
        return false;
    }
}
