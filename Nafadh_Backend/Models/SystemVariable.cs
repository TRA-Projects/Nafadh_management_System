
using System;

namespace Nafadh_Backend.Models
{
    public class SystemVariable
    {
        public int Id { get; set; }

        public string VariableKey { get; set; } = string.Empty;
        public string VariableName { get; set; } = string.Empty;
        public string ValueType { get; set; } = string.Empty;
        public string Value { get; set; } = string.Empty;

        public string? Description { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public string? DescriptionAr { get; set; }
        public string? DescriptionEn { get; set; }
        public string? VariableNameAr { get; set; }
        public string? VariableNameEn { get; set; }
    }
}
