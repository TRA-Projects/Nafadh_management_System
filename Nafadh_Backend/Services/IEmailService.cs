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


        // إرسال إعلان إداري للمستخدمين (متدرب / مدرب / شركة)
        Task SendAnnouncementAsync(
            string email,
            string recipientName,
            string title,
            string content);

        Task SendCompanyWarningAsync(string email, string companyName, string reason, string? warningLevel = null);


        Task SendCoursePlanDecisionAsync(string email, string companyName, string planTitle, bool approved, string? note = null);

        Task SendBatchAssignedToCompanyAsync(
        string email,
        string companyName,
        string batchName,
        string programName,
        DateTime startDate,
        DateTime endDate,
        decimal capacity);
    }
}