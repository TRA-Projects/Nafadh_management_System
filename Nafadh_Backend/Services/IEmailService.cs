namespace Nafadh_Backend.Services
{
    public interface IEmailService
    {
        Task SendFirstAbsenceWarningAsync(string email, string traineeName);

        Task SendSecondAbsenceWarningAsync(string email, string traineeName);

        // Company self-registration decision emails
        Task SendCompanyApprovedAsync(
            string email,
            string companyName,
            string contactName,
            string temporaryPassword);

        Task SendCompanyRejectedAsync(
            string email,
            string companyName,
            string contactName,
            string? reason);

        // Trainee withdrawal emails
        Task SendWithdrawalSubmittedAsync(string email, string traineeName);

        Task SendWithdrawalApprovedAsync(string email, string traineeName);

        Task SendWithdrawalRejectedAsync(
            string email,
            string traineeName,
            string? reason);

        // Trainee enrollment
        Task SendTraineeEnrolledAsync(
            string email,
            string traineeName,
            string batchName,
            string programName,
            string? temporaryPassword = null);

        // Certificate
        Task SendCertificateIssuedAsync(
            string email,
            string traineeName,
            string? programName = null,
            string? certificateUrl = null);

        // Announcement
        Task SendAnnouncementAsync(
            string email,
            string recipientName,
            string title,
            string content);

        // Company warning
        Task SendCompanyWarningAsync(
            string email,
            string companyName,
            string reason,
            string? warningLevel = null);

        // Course plan decision
        Task SendCoursePlanDecisionAsync(
            string email,
            string companyName,
            string planTitle,
            bool approved,
            string? note = null);

        // Course plan submission
        Task SendCoursePlanSubmittedAsync(
            string email,
            string companyName,
            string planTitle,
            int planId,
            bool resubmitted);

        // Batch assignment
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