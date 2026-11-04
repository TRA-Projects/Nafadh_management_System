using System.Text.Json;
using System.Text.Json.Serialization;

namespace Nafadh_Backend.DTOs;

/// <summary>Keep legacy ordinal and string inputs, but reject values outside the declared Nafadh enum.</summary>
public sealed class CatalogEnumConverter : JsonConverterFactory
{
    public override bool CanConvert(Type type) => type.IsEnum && type.Assembly == typeof(CatalogEnumConverter).Assembly
        && type.Name.StartsWith("NFD_", StringComparison.Ordinal)
        && type.Namespace is "Nafadh_Backend.Enums" or "Nafadh_Backend.Enums.Nafadh_Backend.Enums";

    public override JsonConverter CreateConverter(Type type, JsonSerializerOptions options) =>
        (JsonConverter)Activator.CreateInstance(typeof(CheckedEnum<>).MakeGenericType(type), options)!;

    private sealed class CheckedEnum<T>(JsonSerializerOptions options) : JsonConverter<T> where T : struct, Enum
    {
        private readonly JsonConverter<T> _inner = (JsonConverter<T>)new JsonStringEnumConverter<T>()
            .CreateConverter(typeof(T), options);

        public override T Read(ref Utf8JsonReader reader, Type type, JsonSerializerOptions serializerOptions)
        {
            if (reader.TokenType == JsonTokenType.String && reader.GetString()!.Contains(','))
                throw new JsonException($"Expected a single {typeof(T).Name} value.");
            var value = _inner.Read(ref reader, type, serializerOptions);
            return Enum.IsDefined(value) ? value : throw new JsonException($"Unknown {typeof(T).Name} value.");
        }

        public override void Write(Utf8JsonWriter writer, T value, JsonSerializerOptions serializerOptions) =>
            _inner.Write(writer, value, serializerOptions);

        public override T ReadAsPropertyName(ref Utf8JsonReader reader, Type type, JsonSerializerOptions serializerOptions)
        {
            if (reader.GetString()!.Contains(','))
                throw new JsonException($"Expected a single {typeof(T).Name} key.");
            var value = _inner.ReadAsPropertyName(ref reader, type, serializerOptions);
            return Enum.IsDefined(value) ? value : throw new JsonException($"Unknown {typeof(T).Name} key.");
        }

        public override void WriteAsPropertyName(Utf8JsonWriter writer, T value, JsonSerializerOptions serializerOptions) =>
            _inner.WriteAsPropertyName(writer, value, serializerOptions);
    }
}
