using MailKit.Security;
using MailKit.Net.Smtp;
using Microsoft.Extensions.Options;
using MimeKit;
using Nafadh_Backend.Settings;
using System.Net;

namespace Nafadh_Backend.Services
{
    public class EmailService : IEmailService
    {
        private readonly EmailSettings _settings;

        public EmailService(IOptions<EmailSettings> options)
        {
            _settings = options.Value;
        }

        public async Task SendFirstAbsenceWarningAsync(string email, string traineeName)
        {
            string safeName = WebUtility.HtmlEncode(traineeName);

            string subject = "إنذار الغياب الأول - نظام نفاذ";

            string body = $@"
            <div dir='rtl'
                 style='font-family: Arial, sans-serif;
                        line-height: 1.8;
                        max-width: 650px;
                        margin: auto;'>

                <h2>إنذار الغياب الأول</h2>

                <p>
                    عزيزي/عزيزتي <strong>{safeName}</strong>،
                </p>

                <p>
                    تم تسجيل الغياب الأول لك في
                    <strong>نظام نفاذ</strong>.
                </p>

                <p>
                    نرجو الالتزام بالحضور خلال الفترة القادمة
                    لتجنب تكرار الغياب واتخاذ الإجراءات المترتبة عليه.
                </p>

                <p>
                    مع التحية،<br/>
                    نظام نفاذ
                </p>

            </div>";

            await SendAsync(email, subject, body);
        }

        public async Task SendSecondAbsenceWarningAsync(string email, string traineeName)
        {
            string safeName = WebUtility.HtmlEncode(traineeName);

            string subject = "إنذار الغياب الثاني - نظام نفاذ";

            string body = $@"
            <div dir='rtl'
                 style='font-family: Arial, sans-serif;
                        line-height: 1.8;
                        max-width: 650px;
                        margin: auto;'>

                <h2>إنذار الغياب الثاني</h2>

                <p>
                    عزيزي/عزيزتي <strong>{safeName}</strong>،
                </p>

                <p>
                    تم تسجيل الغياب الثاني لك في
                    <strong>نظام نفاذ</strong>.
                </p>

                <p>
                    نرجو الالتزام بالحضور خلال الفترة القادمة.
                </p>

                <p style='font-weight: bold;'>
                    يرجى العلم بأن تسجيل الغياب للمرة الثالثة
                    سيؤدي إلى تصعيد الحالة لاتخاذ إجراء إبلاغ الهيئة.
                </p>

                <p>
                    مع التحية،<br/>
                    نظام نفاذ
                </p>

            </div>";

            await SendAsync(email, subject, body);
        }

        private async Task SendAsync(
            string toEmail,
            string subject,
            string htmlBody)
        {
            if (string.IsNullOrWhiteSpace(toEmail))
            {
                throw new InvalidOperationException(
                    "Trainee email address is missing.");
            }

            var message = new MimeMessage();

            message.From.Add(
                new MailboxAddress(
                    _settings.SenderName,
                    _settings.SenderEmail));

            message.To.Add(MailboxAddress.Parse(toEmail));

            message.Subject = subject;

            message.Body = new BodyBuilder
            {
                HtmlBody = htmlBody
            }.ToMessageBody();

            using var client = new SmtpClient();

            try
            {
                await client.ConnectAsync(
                    _settings.SmtpServer,
                    _settings.Port,
                    SecureSocketOptions.StartTls);

                await client.AuthenticateAsync(
                    _settings.Username,
                    _settings.Password);

                await client.SendAsync(message);
            }
            finally
            {
                if (client.IsConnected)
                {
                    await client.DisconnectAsync(true);
                }
            }
        }
    }
}
