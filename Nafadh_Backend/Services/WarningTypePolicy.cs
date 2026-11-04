using System.Text.Json;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.Services;

// Does not change Training Backend, its DB schema, or historical warning rows.
// This is a centralized, read-only policy for creating NEW warnings.
public static class WarningTypePolicy
{
    public sealed record WarningTypeEntry(string ValueKey, bool IsActive, string LabelAr, string LabelEn);

    public sealed class DisabledWarningTypeException : Exception
    {
        public DisabledWarningTypeException(string valueKey)
            : base($"Warning type '{valueKey}' is disabled in NFD_WRN_TYPE.") { }
    }

    public static async Task<bool> IsActiveAsync(
        ITrainingConstantsService constants,
        NFD_WarningType type,
        CancellationToken cancellationToken = default)
    {
        return (await GetAsync(constants, type, cancellationToken)).IsActive;
    }

    public static async Task<WarningTypeEntry> GetAsync(
        ITrainingConstantsService constants,
        NFD_WarningType type,
        CancellationToken cancellationToken = default)
    {
        if (!Enum.IsDefined(type))
            throw new ArgumentOutOfRangeException(nameof(type), "Unsupported warning type.");

        // Include inactive records so old warning names remain resolvable.
        var response = await constants.ForwardAsync(
            "NFD_WRN_TYPE", null, HttpMethod.Get,
            "?includeInactive=true", null, cancellationToken);
        if (response.Status != 200)
            throw new InvalidOperationException(
                $"Warning type lookup failed with HTTP {response.Status}. No warning was created.");

        using var document = JsonDocument.Parse(response.Body);
        var key = type.ToString();
        foreach (var item in EnumerateItems(document.RootElement))
        {
            var valueKey = TrainingConstantsService.ReadValueKey(item);
            if (!string.Equals(valueKey, key, StringComparison.OrdinalIgnoreCase))
                continue;

            var state = ReadActivity(item);
            if (state is null)
                throw new InvalidOperationException($"IsActive is missing for '{key}'. No warning was created.");

            return new WarningTypeEntry(
                key, state.Value,
                ReadString(item, "label_ar") ?? ReadString(item, "labelAr") ?? key,
                ReadString(item, "label_en") ?? ReadString(item, "labelEn") ?? key);
        }
        // An unknown key is a configuration error, NOT an implicit permission to issue warnings.
        throw new InvalidOperationException($"Warning type '{key}' was not found in NFD_WRN_TYPE.");
    }

    private static IEnumerable<JsonElement> EnumerateItems(JsonElement root, int depth = 0)
    {
        if (depth > 6) yield break;
        if (root.ValueKind == JsonValueKind.Array)
        {
            foreach (var item in root.EnumerateArray())
                foreach (var nested in EnumerateItems(item, depth + 1))
                    yield return nested;
            yield break;
        }
        if (root.ValueKind != JsonValueKind.Object) yield break;
        if (TrainingConstantsService.ReadValueKey(root) is not null)
        {
            yield return root;
            yield break;
        }
        foreach (var name in new[] { "data", "rows", "items", "values", "result", "results" })
        {
            if (TryGet(root, name, out var nested))
                foreach (var item in EnumerateItems(nested, depth + 1))
                    yield return item;
        }
    }

    private static bool? ReadActivity(JsonElement item)
    {
        if (!TryGet(item, "IsActive", out var value)) return null;
        if (value.ValueKind == JsonValueKind.True) return true;
        if (value.ValueKind == JsonValueKind.False) return false;
        if (value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var n)) return n != 0;
        if (value.ValueKind == JsonValueKind.String)
        {
            var s = value.GetString();
            if (bool.TryParse(s, out var b)) return b;
            if (s == "1") return true;
            if (s == "0") return false;
        }
        return null;
    }

    private static string? ReadString(JsonElement item, string name)
    {
        return TryGet(item, name, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString() : null;
    }

    private static bool TryGet(JsonElement item, string name, out JsonElement value)
    {
        foreach (var property in item.EnumerateObject())
        {
            if (string.Equals(property.Name, name, StringComparison.OrdinalIgnoreCase))
            {
                value = property.Value;
                return true;
            }
        }
        value = default;
        return false;
    }
}
