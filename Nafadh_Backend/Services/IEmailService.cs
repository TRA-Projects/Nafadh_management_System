namespace Nafadh_Backend.Services
{
    public interface IEmailService
    {
        Task SendFirstAbsenceWarningAsync(string email, string traineeName);

        Task SendSecondAbsenceWarningAsync(string email, string traineeName);

        // Company self-registration decision emails
        Task SendCompanyApprovedAsync(string email, string companyName, string contactName, string temporaryPassword);

        Task SendCompanyRejectedAsync(string email, string companyName, string contactName, string? reason);

        // Trainee withdrawal decision emails (Admin actions)
        Task SendWithdrawalApprovedAsync(string email, string traineeName);

        Task SendWithdrawalRejectedAsync(string email, string traineeName, string? reason);
       
        // إشعار تسجيل متدرب جديد في دفعة وبرنامج تدريبي
        Task SendTraineeEnrolledAsync(
            string email,
            string traineeName,
            string batchName,
            string programName,
            string? temporaryPassword = null);



        Task SendCertificateIssuedAsync(
          string email,
          string traineeName,
          string? programName = null,
          string? certificateUrl = null);


    }
}