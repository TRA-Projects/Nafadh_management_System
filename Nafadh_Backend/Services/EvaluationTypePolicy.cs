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
        try { await CatalogSelectionPolicy.RequireActiveAsync(constants, type, cancellationToken); }
        catch (CatalogSelectionPolicy.InactiveValueException) { throw new InactiveTypeException(type.ToString()); }
        catch (CatalogSelectionPolicy.LookupUnavailableException ex) { throw new LookupUnavailableException(ex.Message, ex); }
    }
}
