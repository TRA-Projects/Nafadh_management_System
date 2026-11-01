using System.Text.Json;
using System.Text.Json.Serialization;

namespace Nafadh_Backend.DTOs;

/// <summary>
/// Public Management contract for the curated Training + Management constants group catalog.
/// JSON names must remain compatible with the existing Angular admin-system.models.ts.
/// </summary>
public sealed class ReferenceConstantGroupDto
{
    [JsonPropertyName("code")]
    public string Code { get; set; } = string.Empty;

    [JsonPropertyName("label_en")]
    public string LabelEn { get; set; } = string.Empty;

    [JsonPropertyName("label_ar")]
    public string LabelAr { get; set; } = string.Empty;

    [JsonPropertyName("IsActive")]
    public bool IsActive { get; set; }

    [JsonPropertyName("IsReadOnly")]
    public bool IsReadOnly { get; set; }
}

public sealed class ReferenceConstantGroupsResponseDto
{
    [JsonPropertyName("Data")]
    public List<ReferenceConstantGroupDto> Data { get; set; } = new();
}

/// <summary>
/// Shape of one Training API value row. Kept as a typed contract for next-stage
/// response mapping; the gateway intentionally does not deserialize/re-serialize
/// Training value responses in this first step, to preserve compatibility.
/// </summary>
public sealed class ReferenceConstantValueDto
{
    // Original Training API uses string OR number for id; JsonElement preserves either.
    [JsonPropertyName("id")]
    public JsonElement Id { get; set; }

    [JsonPropertyName("code")]
    public string? Code { get; set; }

    [JsonPropertyName("label_en")]
    public string LabelEn { get; set; } = string.Empty;

    [JsonPropertyName("label_ar")]
    public string LabelAr { get; set; } = string.Empty;

    [JsonPropertyName("IsActive")]
    public bool IsActive { get; set; }

    [JsonPropertyName("subReasonDropdown")]
    public bool? SubReasonDropdown { get; set; }

    [JsonPropertyName("parentReasonId")]
    public JsonElement? ParentReasonId { get; set; }
}

public sealed class ReferenceConstantValuesPageDto
{
    [JsonPropertyName("rows")]
    public List<ReferenceConstantValueDto> Rows { get; set; } = new();

    [JsonPropertyName("total")]
    public int Total { get; set; }

    [JsonPropertyName("pageIndex")]
    public int PageIndex { get; set; }

    [JsonPropertyName("pageSize")]
    public int PageSize { get; set; }
}
