namespace Nafadh_Backend.Services
{
    public interface IEmailService
    {
        Task SendFirstAbsenceWarningAsync(string email, string traineeName);

        Task SendSecondAbsenceWarningAsync(string email, string traineeName);
    }
}
