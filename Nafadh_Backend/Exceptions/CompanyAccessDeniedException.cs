namespace Nafadh_Backend.Exceptions
{
    /// <summary>
    /// Thrown at login when a self-registered company account cannot sign in yet
    /// (waiting for approval, or rejected). Mapped to HTTP 403 with a stable
    /// <see cref="Code"/> the frontend can switch on.
    /// </summary>
    public class CompanyAccessDeniedException : Exception
    {
        public const string Pending = "COMPANY_PENDING_APPROVAL";
        public const string Rejected = "COMPANY_REJECTED";

        public string Code { get; }
        public string? Reason { get; }

        public CompanyAccessDeniedException(string code, string message, string? reason = null)
            : base(message)
        {
            Code = code;
            Reason = reason;
        }
    }
}
