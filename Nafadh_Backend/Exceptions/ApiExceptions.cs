
// Added by Nora (Team 3 - Division 2: Identity, Organizations & People)
// Shared, lightweight exception types used by the Identity & Access services
// (User, Role, Permission, RolePermission) so that business-rule violations
// map cleanly to HTTP status codes in the controllers, instead of leaking
// generic exceptions or forcing every service method to return ad-hoc tuples.

namespace Nafadh_Backend.Exceptions
{
    /// <summary>
    /// Thrown when a requested resource does not exist. Controllers translate this to 404.
    /// </summary>
    public class NotFoundException : Exception
    {
        public NotFoundException(string message) : base(message) { }
    }

    /// <summary>
    /// Thrown when a request violates a uniqueness or state constraint (e.g. duplicate email,
    /// deleting a role still in use). Controllers translate this to 409.
    /// </summary>
    public class ConflictException : Exception
    {
        public ConflictException(string message) : base(message) { }
    }

    /// <summary>
    /// Thrown when the request payload is well-formed JSON but fails a business validation rule
    /// (e.g. RoleId does not exist). Controllers translate this to 400.
    /// </summary>
    public class ValidationException : Exception
    {
        public ValidationException(string message) : base(message) { }
    }

    /// <summary>
    /// Thrown for authentication failures (bad credentials, inactive/suspended account).
    /// Controllers translate this to 401.
    /// </summary>
    public class AuthenticationException : Exception
    {
        public AuthenticationException(string message) : base(message) { }
    }
}
