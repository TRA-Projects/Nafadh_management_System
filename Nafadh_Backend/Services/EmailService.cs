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

        public async Task SendCompanyApprovedAsync(
            string email,
            string companyName,
            string contactName,
            string temporaryPassword)
        {
            string safeCompany = WebUtility.HtmlEncode(companyName);
            string safeContact = WebUtility.HtmlEncode(contactName);
            string safeEmail = WebUtility.HtmlEncode(email);
            string safePassword = WebUtility.HtmlEncode(temporaryPassword);

            string subject = "تم اعتماد شركتكم - نظام نفاذ";

            string body = $@"
            <div dir='rtl'
                 style='font-family: Arial, sans-serif;
                        line-height: 1.8;
                        max-width: 650px;
                        margin: auto;'>

                <h2>تم اعتماد طلب التسجيل</h2>

                <p>
                    عزيزي/عزيزتي <strong>{safeContact}</strong>،
                </p>

                <p>
                    يسعدنا إبلاغكم بأنه تم اعتماد شركة
                    <strong>{safeCompany}</strong>
                    في <strong>نظام نفاذ</strong>.
                    يمكنكم الآن تسجيل الدخول وإضافة المدربين الخاصين بكم.
                </p>

                <p>بيانات الدخول:</p>
                <table style='border-collapse: collapse;'>
                    <tr>
                        <td style='padding: 4px 12px;'>البريد الإلكتروني</td>
                        <td style='padding: 4px 12px;' dir='ltr'><strong>{safeEmail}</strong></td>
                    </tr>
                    <tr>
                        <td style='padding: 4px 12px;'>كلمة المرور</td>
                        <td style='padding: 4px 12px;' dir='ltr'><strong>{safePassword}</strong></td>
                    </tr>
                </table>

                <p style='font-weight: bold;'>
                    يرجى الاحتفاظ بكلمة المرور في مكان آمن وعدم مشاركتها مع أي شخص.
                </p>

                <p>
                    مع التحية،<br/>
                    نظام نفاذ
                </p>

            </div>";

            await SendAsync(email, subject, body);
        }

        public async Task SendCompanyRejectedAsync(
            string email,
            string companyName,
            string contactName,
            string? reason)
        {
            string safeCompany = WebUtility.HtmlEncode(companyName);
            string safeContact = WebUtility.HtmlEncode(contactName);
            string safeReason = string.IsNullOrWhiteSpace(reason)
                ? "لم يتم تحديد سبب."
                : WebUtility.HtmlEncode(reason);

            string subject = "نتيجة طلب تسجيل الشركة - نظام نفاذ";

            string body = $@"
            <div dir='rtl'
                 style='font-family: Arial, sans-serif;
                        line-height: 1.8;
                        max-width: 650px;
                        margin: auto;'>

                <h2>نتيجة طلب التسجيل</h2>

                <p>
                    عزيزي/عزيزتي <strong>{safeContact}</strong>،
                </p>

                <p>
                    نأسف لإبلاغكم بأنه تم رفض طلب تسجيل شركة
                    <strong>{safeCompany}</strong>
                    في <strong>نظام نفاذ</strong>.
                </p>

                <p><strong>سبب الرفض:</strong> {safeReason}</p>

                <p>
                    يمكنكم تعديل البيانات وتقديم طلب تسجيل جديد.
                </p>

                <p>
                    مع التحية،<br/>
                    نظام نفاذ
                </p>

            </div>";

            await SendAsync(email, subject, body);
        }

        public async Task SendWithdrawalSubmittedAsync(string email, string traineeName)
        {
            string safeName = WebUtility.HtmlEncode(traineeName);

            string subject = "تم استلام طلب الانسحاب - نظام نفاذ";

            string body = $@"
            <div dir='rtl'
                 style='font-family: Arial, sans-serif;
                        line-height: 1.8;
                        max-width: 650px;
                        margin: auto;'>

                <h2>استلام طلب الانسحاب</h2>

                <p>
                    عزيزي/عزيزتي <strong>{safeName}</strong>،
                </p>

                <p>
                    نود إبلاغك بأنه تم استلام طلب الانسحاب الخاص بك في
                    <strong>نظام نفاذ</strong> بنجاح، وهو الآن <strong>قيد المراجعة</strong> من قبل الإدارة.
                </p>

                <p>
                    سيتم إشعارك عبر البريد الإلكتروني فور اتخاذ القرار بالاعتماد أو الرفض.
                </p>

                <p>
                    مع التحية،<br/>
                    نظام نفاذ
                </p>

            </div>";

            await SendAsync(email, subject, body);
        }

        public async Task SendWithdrawalApprovedAsync(string email, string traineeName)
        {
            string safeName = WebUtility.HtmlEncode(traineeName);

            string subject = "تم اعتماد طلب الانسحاب - نظام نفاذ";

            string body = $@"
            <div dir='rtl'
                 style='font-family: Arial, sans-serif;
                        line-height: 1.8;
                        max-width: 650px;
                        margin: auto;'>

                <h2>تم اعتماد طلب الانسحاب</h2>

                <p>
                    عزيزي/عزيزتي <strong>{safeName}</strong>،
                </p>

                <p>
                    نود إبلاغك بأنه تم الموافقة على طلب الانسحاب الخاص بك من
                    <strong>نظام نفاذ</strong>.
                </p>

                <p>
                    بناءً على ذلك، تم إلغاء ارتباطك بالبرامج التدريبية التابعة للمنصة،
                    ولن تتمكن من تسجيل الدخول إلى حسابك بعد الآن.
                </p>

                <p>
                    نتمنى لك التوفيق في مسيرتك القادمة.
                </p>

                <p>
                    مع التحية،<br/>
                    نظام نفاذ
                </p>

            </div>";

            await SendAsync(email, subject, body);
        }

        public async Task SendWithdrawalRejectedAsync(string email, string traineeName, string? reason)
        {
            string safeName = WebUtility.HtmlEncode(traineeName);
            string safeReason = string.IsNullOrWhiteSpace(reason)
                ? "لم يتم تحديد سبب."
                : WebUtility.HtmlEncode(reason);

            string subject = "تم رفض طلب الانسحاب - نظام نفاذ";

            string body = $@"
            <div dir='rtl'
                 style='font-family: Arial, sans-serif;
                        line-height: 1.8;
                        max-width: 650px;
                        margin: auto;'>

                <h2>نتيجة طلب الانسحاب</h2>

                <p>
                    عزيزي/عزيزتي <strong>{safeName}</strong>،
                </p>

                <p>
                    نود إبلاغك بأنه تم رفض طلب الانسحاب المقدم من قبلك في
                    <strong>نظام نفاذ</strong>.
                </p>

                <p><strong>سبب الرفض / ملاحظات الإدارة:</strong> {safeReason}</p>

                <p>
                    يرجى الاستمرار في الالتزام بالحضور في البرنامج التدريبي المخصص لك.
                </p>

                <p>
                    مع التحية،<br/>
                    نظام نفاذ
                </p>

            </div>";

            await SendAsync(email, subject, body);
        }

        public async Task SendTraineeEnrolledAsync(
            string email,
            string traineeName,
            string batchName,
            string programName,
            string? temporaryPassword = null)
        {
            string safeName = WebUtility.HtmlEncode(traineeName);
            string safeBatch = WebUtility.HtmlEncode(batchName);
            string safeProgram = WebUtility.HtmlEncode(programName);
            string safeEmail = WebUtility.HtmlEncode(email);

            string credentialsSection = "";
            if (!string.IsNullOrWhiteSpace(temporaryPassword))
            {
                string safePassword = WebUtility.HtmlEncode(temporaryPassword);
                credentialsSection = $@"
                <p>بيانات الدخول الخاصة بك:</p>
                <table style='border-collapse: collapse;'>
                    <tr>
                        <td style='padding: 4px 12px;'>البريد الإلكتروني</td>
                        <td style='padding: 4px 12px;' dir='ltr'><strong>{safeEmail}</strong></td>
                    </tr>
                    <tr>
                        <td style='padding: 4px 12px;'>كلمة المرور</td>
                        <td style='padding: 4px 12px;' dir='ltr'><strong>{safePassword}</strong></td>
                    </tr>
                </table>
                <p style='font-weight: bold;'>
                    يرجى الاحتفاظ بكلمة المرور في مكان آمن وعدم مشاركتها مع أي شخص.
                </p>";
            }

            string subject = "تم تسجيلك في البرنامج التدريبي - نظام نفاذ";

            string body = $@"
            <div dir='rtl'
                 style='font-family: Arial, sans-serif;
                        line-height: 1.8;
                        max-width: 650px;
                        margin: auto;'>

                <h2>تأكيد التسجيل في البرنامج التدريبي</h2>

                <p>
                    عزيزي/عزيزتي <strong>{safeName}</strong>،
                </p>

                <p>
                    يسعدنا الترحيب بك وإبلاغك بأنه قد تم تسجيلك بنجاح في
                    <strong>نظام نفاذ</strong> ضمن التفاصيل التالية:
                </p>

                <table style='border-collapse: collapse; margin: 12px 0;'>
                    <tr>
                        <td style='padding: 6px 12px;'><strong>البرنامج التدريبي:</strong></td>
                        <td style='padding: 6px 12px;'>{safeProgram}</td>
                    </tr>
                    <tr>
                        <td style='padding: 6px 12px;'><strong>الدفعة:</strong></td>
                        <td style='padding: 6px 12px;'>{safeBatch}</td>
                    </tr>
                </table>

                {credentialsSection}

                <p>
                    نتمنى لك رحلة تدريبية موفقة ومثمرة.
                </p>

                <p>
                    مع التحية،<br/>
                    نظام نفاذ
                </p>

            </div>";

            await SendAsync(email, subject, body);
        }

        public async Task SendCertificateIssuedAsync(
            string email,
            string traineeName,
            string? programName = null,
            string? certificateUrl = null)
        {
            string safeName = WebUtility.HtmlEncode(traineeName);

            string programSection = string.IsNullOrWhiteSpace(programName)
                ? "في <strong>نظام نفاذ</strong>."
                : $"لبرنامج <strong>{WebUtility.HtmlEncode(programName)}</strong> في <strong>نظام نفاذ</strong>.";

            string downloadSection = string.IsNullOrWhiteSpace(certificateUrl)
                ? "<p>يمكنك الآن الدخول إلى حسابك في المنصة لعرض الشهادة وتحميلها.</p>"
                : $@"<p>
                        يمكنك عرض وتحميل شهادتك من حسابك في المنصة أو عبر الرابط المباشر:
                        <br/>
                        <a href='{WebUtility.HtmlEncode(certificateUrl)}' dir='ltr'>{WebUtility.HtmlEncode(certificateUrl)}</a>
                     </p>";

            string subject = "تم إصدار شهادتك التدريبية - نظام نفاذ";

            string body = $@"
            <div dir='rtl'
                 style='font-family: Arial, sans-serif;
                        line-height: 1.8;
                        max-width: 650px;
                        margin: auto;'>

                <h2>إصدار شهادة التدريب</h2>

                <p>
                    عزيزي/عزيزتي <strong>{safeName}</strong>،
                </p>

                <p>
                    نبارك لك ونود إبلاغك بأنه قد تم إصدار شهادتك التدريبية بنجاح {programSection}
                </p>

                {downloadSection}

                <p>
                    نتمنى لك دوام التوفيق والنجاح في مسيرتك المهنية.
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

        public async Task SendAnnouncementAsync(
            string email,
            string recipientName,
            string title,
            string content)
        {
            string safeName = WebUtility.HtmlEncode(recipientName);
            string safeTitle = WebUtility.HtmlEncode(title);
            string safeContent = WebUtility.HtmlEncode(content)
                .Replace("\r\n", "<br/>")
                .Replace("\n", "<br/>");

            string subject = $"إعلان جديد: {title} - نظام نفاذ";

            string body = $@"
            <div dir='rtl'
                 style='font-family: Arial, sans-serif;
                        line-height: 1.8;
                        max-width: 650px;
                        margin: auto;'>

                <h2>{safeTitle}</h2>

                <p>
                    عزيزي/عزيزتي <strong>{safeName}</strong>،
                </p>

                <div style='background-color: #f8fafc;
                            border-right: 4px solid #1e3a8a;
                            padding: 12px 16px;
                            margin: 16px 0;'>
                    {safeContent}
                </div>

                <p>
                    مع التحية،<br/>
                    إدارة نظام نفاذ
                </p>

            </div>";

            await SendAsync(email, subject, body);
        }

        public async Task SendCompanyWarningAsync(string email, string companyName, string reason, string? warningLevel = null)
        {
            var levelBadge = string.IsNullOrWhiteSpace(warningLevel)
                ? "إنذار إداري"
                : $"المستوى: {warningLevel}";

            var subject = "إنذار رسمي من إدارة منصة نفاذ";

            var body = $@"
    <div dir='rtl' style='font-family: Arial, Tahoma, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #fecaca; border-radius: 10px; overflow: hidden; background-color: #ffffff;'>
        <div style='background-color: #dc2626; color: #ffffff; padding: 18px 24px;'>
            <h2 style='margin: 0; font-size: 20px;'>⚠️ إشعار إنذار رسمي</h2>
        </div>
        <div style='padding: 24px; color: #1f2937; line-height: 1.8;'>
            <p style='margin-top: 0;'>السادة شركة <strong>{companyName}</strong> المحترمين،</p>
            <p>نود إشعاركم بأنه قد تم تسجيل إنذار رسمي بحق منشأتكم عبر منصة <strong>نفاذ</strong>.</p>
            
            <div style='background-color: #fef2f2; border-right: 4px solid #dc2626; padding: 14px 16px; margin: 18px 0; border-radius: 6px;'>
                <p style='margin: 0 0 8px 0; color: #991b1b; font-weight: bold;'>{levelBadge}</p>
                <p style='margin: 0; color: #374151;'><strong>التفاصيل / السبب:</strong> {reason}</p>
            </div>

            <p>يرجى الدخول إلى حساب الشركة في منصة نفاذ للاطلاع على تفاصيل الإنذار وتقديم الرد أو المعالجة اللازمة.</p>
            <hr style='border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;' />
            <p style='font-size: 12px; color: #6b7280; margin-bottom: 0;'>مع تحيات،<br/>إدارة منصة نفاذ</p>
        </div>
    </div>";

            await SendAsync(email, subject, body);

        }

        public async Task SendCoursePlanSubmittedAsync(
            string email, string companyName, string planTitle, int planId, bool resubmitted)
        {
            var safeCompany = WebUtility.HtmlEncode(companyName);
            var safePlan = WebUtility.HtmlEncode(planTitle);
            var statusText = resubmitted ? "إعادة تقديم" : "تقديم";
            var subject = $"{statusText} خطة تدريبية لاعتماد الهيئة - منصة نفاذ (#{planId})";
            var body = $@"
            <div dir='rtl' style='font-family:Arial,Tahoma,sans-serif;max-width:620px;margin:auto;line-height:1.8'>
                <h2>إشعار {statusText} خطة تدريبية</h2>
                <p>السادة فريق اعتماد البرامج في الهيئة،</p>
                <p>قامت شركة <strong>{safeCompany}</strong> بـ{statusText} الخطة
                   <strong>«{safePlan}»</strong> إلى قائمة المراجعة.</p>
                <p>رقم الخطة: <strong>{planId}</strong></p>
                <p>يرجى الدخول إلى بوابة الإدارة لمراجعة المراحل وتسجيل قرار الاعتماد أو الرفض.</p>
                <p style='color:#64748b;font-size:12px'>هذه رسالة آلية من نظام نفاذ نيابة عن الشركة.
                   لا يُعتمد على الرد على هذا البريد لاتخاذ قرار.</p>
            </div>";

            await SendAsync(email, subject, body);
        }

        public async Task SendCoursePlanDecisionAsync(
            string email,
            string companyName,
            string planTitle,
            bool approved,
            string? note = null)
        {
            string safeCompany = WebUtility.HtmlEncode(companyName);
            string safePlan = WebUtility.HtmlEncode(planTitle);
            string? safeNote = string.IsNullOrWhiteSpace(note)
                ? null
                : WebUtility.HtmlEncode(note).Replace("\r\n", "<br/>").Replace("\n", "<br/>");

            string headerColor = approved ? "#16a34a" : "#dc2626";
            string headerTitle = approved
                ? "✅ إشعار اعتماد الخطة التدريبية / الدراسية"
                : "❌ إشعار رفض الخطة التدريبية / الدراسية";

            string subject = approved
                ? $"تم اعتماد الخطة التدريبية ({planTitle}) - منصة نفاذ"
                : $"قرار مراجعة الخطة التدريبية ({planTitle}) - منصة نفاذ";

            string decisionParagraph = approved
                ? $"يسعدنا إبلاغكم بأنه تمت مراجعة واعتماد الخطة التدريبية <strong>«{safePlan}»</strong> المقدمة من شركتكم لدى الهيئة، ويمكن للمدرب المكلّف البدء في تنفيذها."
                : $"نود إبلاغكم بأنه تمت مراجعة الخطة التدريبية <strong>«{safePlan}»</strong> المقدمة من شركتكم، وتقرر <strong>عدم اعتمادها (مرفوضة)</strong> في الوقت الحالي. يرجى مراجعة ملاحظات الهيئة وتعديل الخطة ثم إعادة إرسالها.";

            string noteSection = string.IsNullOrWhiteSpace(safeNote)
                ? ""
                : $@"
                <div style='background-color: {(approved ? "#f0fdf4" : "#fef2f2")};
                            border-right: 4px solid {headerColor};
                            padding: 14px 16px;
                            margin: 18px 0;
                            border-radius: 6px;'>
                    <p style='margin: 0; color: #1f2937;'>
                        <strong>{(approved ? "ملاحظات الهيئة:" : "سبب الرفض / ملاحظات الهيئة:")}</strong><br/>
                        {safeNote}
                    </p>
                </div>";

            string body = $@"
            <div dir='rtl' style='font-family: Arial, Tahoma, sans-serif; max-width: 620px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; background-color: #ffffff;'>
                <div style='background-color: {headerColor}; color: #ffffff; padding: 18px 24px;'>
                    <h2 style='margin: 0; font-size: 20px;'>{headerTitle}</h2>
                </div>
                <div style='padding: 24px; color: #1f2937; line-height: 1.8;'>
                    <p style='margin-top: 0;'>السادة شركة <strong>{safeCompany}</strong> المحترمين،</p>
                    <p>{decisionParagraph}</p>
                    {noteSection}
                    <hr style='border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;' />
                    <p style='font-size: 12px; color: #6b7280; margin-bottom: 0;'>مع التحية،<br/>إدارة الهيئة - منصة نفاذ</p>
                </div>
            </div>";

            await SendAsync(email, subject, body);
        }
    }
}