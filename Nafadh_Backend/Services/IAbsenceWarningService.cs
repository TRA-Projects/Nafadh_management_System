namespace Nafadh_Backend.Services
{
    public interface IAbsenceWarningService
    {
        Task ProcessConfirmedAbsenceAsync(int dailyAttendanceId);
    }
}
