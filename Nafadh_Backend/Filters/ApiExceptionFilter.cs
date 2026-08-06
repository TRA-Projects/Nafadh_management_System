// Implemented by Nora (Team 3 - Division 2: Identity, Organizations & People)

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Nafadh_Backend.Exceptions;

namespace Nafadh_Backend.Filters
{
    
    /// Translates the lightweight exceptions thrown by the service layer into ProblemDetails
    /// responses with the right status code, so every controller action can just call into
    /// its service without wrapping each call in try/catch.
  
    public class ApiExceptionFilter : IExceptionFilter
    {
        public void OnException(ExceptionContext context)
        {
            var (statusCode, title) = context.Exception switch
            {
                NotFoundException => (StatusCodes.Status404NotFound, "Resource not found"),
                ConflictException => (StatusCodes.Status409Conflict, "Conflict"),
                ValidationException => (StatusCodes.Status400BadRequest, "Validation failed"),
                AuthenticationException => (StatusCodes.Status401Unauthorized, "Authentication failed"),
                _ => (0, string.Empty)
            };

            if (statusCode == 0)
            {
                // Not one of ours - let the default developer/production exception handling take over.
                return;
            }

            context.Result = new ObjectResult(new ProblemDetails
            {
                Status = statusCode,
                Title = title,
                Detail = context.Exception.Message
            })
            {
                StatusCode = statusCode
            };

            context.ExceptionHandled = true;
        }
    }
}
