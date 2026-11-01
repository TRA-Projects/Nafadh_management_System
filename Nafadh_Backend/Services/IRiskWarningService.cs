
namespace Nafadh_Backend.Services
{
    public interface IRiskWarningService
    {
        Task ProcessEnrollmentRiskAsync(int enrollmentId);
        Task<int> ProcessAllActiveEnrollmentsRiskAsync();

    }
}
