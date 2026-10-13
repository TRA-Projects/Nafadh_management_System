using Nafadh_Backend.Models;

namespace Nafadh_Backend.Services
{
    /// <summary>
    /// Business contract for execution actions initiated by an assigned trainer.
    /// </summary>
    public interface ICoursePlanExecutionService
    {
        Task<CoursePlanStartResult> StartAsync(int planId, int trainerUserId, string note);
    }

    public sealed class CoursePlanStartResult
    {
        public bool Success { get; init; }
        public int StatusCode { get; init; }
        public string Message { get; init; } = string.Empty;
        public NFD_CoursePlan? Plan { get; init; }

        public static CoursePlanStartResult Ok(NFD_CoursePlan plan) => new()
        {
            Success = true,
            StatusCode = 200,
            Plan = plan
        };

        public static CoursePlanStartResult Fail(int statusCode, string message) => new()
        {
            Success = false,
            StatusCode = statusCode,
            Message = message
        };
    }
}
