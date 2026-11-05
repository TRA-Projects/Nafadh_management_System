#nullable disable
using System;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Nafadh_Backend.IdentityAccess
{
    /// <summary>
    /// Same error contract as Bidding_API ({ Code, Description, Data }) with PascalCase JSON,
    /// because the existing identity screens read PascalCase property names.
    /// </summary>
    public static class ApiResponseHelper
    {
        public static readonly JsonSerializerOptions PascalCase = new JsonSerializerOptions
        {
            PropertyNamingPolicy = null,
            DictionaryKeyPolicy = null
        };

        public static IActionResult CreateErrorResponse(string code, string description, int statusCode)
            => new JsonResult(new { Code = code, Description = description, Data = (object)null }, PascalCase)
            {
                StatusCode = statusCode
            };
    }

    public static class SafeExecutionHelper
    {
        public interface IHasErrorCode { string ErrorCode { get; } }

        public class NotFoundException : Exception, IHasErrorCode
        {
            public string ErrorCode { get; }
            public NotFoundException(string message) : this("NotFound", message) { }
            public NotFoundException(string code, string message) : base(message) { ErrorCode = code; }
        }

        public class ConflictException : Exception, IHasErrorCode
        {
            public string ErrorCode { get; }
            public ConflictException(string message) : this("Conflict", message) { }
            public ConflictException(string code, string message) : base(message) { ErrorCode = code; }
        }

        public class BadRequestException : Exception, IHasErrorCode
        {
            public string ErrorCode { get; }
            public BadRequestException(string message) : this("BadRequest", message) { }
            public BadRequestException(string code, string message) : base(message) { ErrorCode = code; }
        }

        public class InternalServerErrorException : Exception, IHasErrorCode
        {
            public string ErrorCode { get; }
            public InternalServerErrorException(string message) : this("InternalServerError", message) { }
            public InternalServerErrorException(string code, string message) : base(message) { ErrorCode = code; }
        }

        public class UnauthorizedException : Exception, IHasErrorCode
        {
            public string ErrorCode { get; }
            public UnauthorizedException(string message) : this("Unauthorized", message) { }
            public UnauthorizedException(string code, string message) : base(message) { ErrorCode = code; }
        }

        public class ForbiddenException : Exception, IHasErrorCode
        {
            public string ErrorCode { get; }
            public ForbiddenException(string message) : this("Forbidden", message) { }
            public ForbiddenException(string code, string message) : base(message) { ErrorCode = code; }
        }

        public class MethodNotAllowedException : Exception, IHasErrorCode
        {
            public string ErrorCode { get; }
            public MethodNotAllowedException(string message) : this("MethodNotAllowed", message) { }
            public MethodNotAllowedException(string code, string message) : base(message) { ErrorCode = code; }
        }

        public class NotAcceptableException : Exception, IHasErrorCode
        {
            public string ErrorCode { get; }
            public NotAcceptableException(string message) : this("NotAcceptable", message) { }
            public NotAcceptableException(string code, string message) : base(message) { ErrorCode = code; }
        }

        public static async Task<IActionResult> ExecuteSafelyAsync(
            Func<Task<IActionResult>> action,
            Func<string, string, int, IActionResult> createErrorResponse)
        {
            try { return await action(); }
            catch (OperationCanceledException)
            { return createErrorResponse("RequestCanceled", "The request was canceled by the client.", 499); }
            catch (BadRequestException ex)
            { return createErrorResponse(ex.ErrorCode ?? "BadRequest", ex.Message, StatusCodes.Status400BadRequest); }
            catch (UnauthorizedException ex)
            { return createErrorResponse(ex.ErrorCode ?? "Unauthorized", ex.Message, StatusCodes.Status401Unauthorized); }
            catch (ForbiddenException ex)
            { return createErrorResponse(ex.ErrorCode ?? "Forbidden", ex.Message, StatusCodes.Status403Forbidden); }
            catch (NotFoundException ex)
            { return createErrorResponse(ex.ErrorCode ?? "NotFound", ex.Message, StatusCodes.Status404NotFound); }
            catch (MethodNotAllowedException ex)
            { return createErrorResponse(ex.ErrorCode ?? "MethodNotAllowed", ex.Message, StatusCodes.Status405MethodNotAllowed); }
            catch (NotAcceptableException ex)
            { return createErrorResponse(ex.ErrorCode ?? "NotAcceptable", ex.Message, StatusCodes.Status406NotAcceptable); }
            catch (ConflictException ex)
            { return createErrorResponse(ex.ErrorCode ?? "Conflict", ex.Message, StatusCodes.Status409Conflict); }
            catch (InternalServerErrorException ex)
            { return createErrorResponse(ex.ErrorCode ?? "InternalServerError", ex.Message, StatusCodes.Status500InternalServerError); }
            catch (Exception ex)
            {
                Console.WriteLine("IdentityAccess error: " + ex);
                return createErrorResponse("InternalServerError", "An unexpected error occurred.", StatusCodes.Status500InternalServerError);
            }
        }
    }
}
