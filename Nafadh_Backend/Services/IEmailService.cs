namespace Nafadh_Backend.Services
{
    public interface IEmailService
    {
        Task SendFirstAbsenceWarningAsync(string email, string traineeName);

        Task SendSecondAbsenceWarningAsync(string email, string traineeName);

        // Company self-registration decision emails
        Task SendCompanyApprovedAsync(string email, string companyName, string contactName, string temporaryPassword);

        Task SendCompanyRejectedAsync(string email, string companyName, string contactName, string? reason);
    }
}
