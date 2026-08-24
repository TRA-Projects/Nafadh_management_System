using Microsoft.Extensions.Options;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;
using Nafadh_Backend.Settings;

namespace Nafadh_Backend.Services
{
    public class AbsenceWarningService : IAbsenceWarningService
    {
        private readonly IDailyAttendanceRepository _attendanceRepository;
        private readonly IWarningRepository _warningRepository;
        private readonly IEmailService _emailService;
        private readonly AbsenceWarningSettings _settings;

        public AbsenceWarningService(
            IDailyAttendanceRepository attendanceRepository,
            IWarningRepository warningRepository,
            IEmailService emailService,
            IOptions<AbsenceWarningSettings> settings)
        {
            _attendanceRepository = attendanceRepository;
            _warningRepository = warningRepository;
            _emailService = emailService;
            _settings = settings.Value;
        }

        public async Task ProcessConfirmedAbsenceAsync(
            int dailyAttendanceId)
        {
            NFD_DailyAttendance? currentAttendance =
                await _attendanceRepository
                    .GetByIdWithDetailsAsync(dailyAttendanceId);

            if (currentAttendance == null)
            {
                throw new InvalidOperationException(
                    "Attendance record was not found.");
            }

            // يجب أن يكون السجل غياباً أصلاً
            if (currentAttendance.Status != NFD_AttendanceStatus.Absent)
            {
                return;
            }

            /*
             * Pending:
             * المتدرب قدم عذراً وما زال ينتظر قرار المدرب.
             *
             * Approved:
             * العذر مقبول، لذلك الغياب لا يحسب.
             */
            bool hasPendingOrApprovedExcuse =
                currentAttendance.Excuses.Any(e =>
                    e.Status == NFD_ExcuseStatus.Pending ||
                    e.Status == NFD_ExcuseStatus.Approved);

            if (hasPendingOrApprovedExcuse)
            {
                return;
            }

            List<NFD_DailyAttendance> allAttendances =
                await _attendanceRepository
                    .GetByEnrollmentIdWithDetailsAsync(
                        currentAttendance.EnrollmentId);

            /*
             * الغياب المحتسب:
             *
             * Status = Absent
             *
             * ولا يوجد له عذر Pending أو Approved.
             *
             * إذا لم يوجد عذر نهائياً -> يعتبر غياباً مؤكداً
             * عند استدعاء ProcessConfirmedAbsenceAsync.
             *
             * إذا وجد عذر Rejected -> يحسب أيضاً.
             */
            List<NFD_DailyAttendance> confirmedAbsences =
                allAttendances
                    .Where(a =>
                        a.Status == NFD_AttendanceStatus.Absent &&
                        !a.Excuses.Any(e =>
                            e.Status == NFD_ExcuseStatus.Pending ||
                            e.Status == NFD_ExcuseStatus.Approved))
                    .OrderBy(a => a.Date)
                    .ThenBy(a => a.DailyAttendanceId)
                    .ToList();

            int index = confirmedAbsences.FindIndex(a =>
                a.DailyAttendanceId == dailyAttendanceId);

            if (index < 0)
            {
                return;
            }

            int absenceNumber = index + 1;

            // حالياً المطلوب فقط أول 3 غيابات
            if (absenceNumber > 3)
            {
                return;
            }

            bool alreadyCreated =
                await _warningRepository
                    .AutoAbsenceWarningExistsAsync(
                        currentAttendance.EnrollmentId,
                        absenceNumber);

            if (alreadyCreated)
            {
                return;
            }

            if (_settings.SystemUserId <= 0)
            {
                throw new InvalidOperationException(
                    "AbsenceWarnings:SystemUserId is not configured.");
            }

            NFD_User? traineeUser =
                currentAttendance.Enrollment?
                    .Trainee?
                    .User;

            if (traineeUser == null)
            {
                throw new InvalidOperationException(
                    "Trainee user information could not be loaded.");
            }

            switch (absenceNumber)
            {
                case 1:
                    await HandleFirstAbsenceAsync(
                        currentAttendance,
                        traineeUser);
                    break;

                case 2:
                    await HandleSecondAbsenceAsync(
                        currentAttendance,
                        traineeUser);
                    break;

                case 3:
                    await HandleThirdAbsenceAsync(
                        currentAttendance);
                    break;
            }
        }

        private async Task HandleFirstAbsenceAsync(
            NFD_DailyAttendance attendance,
            NFD_User user)
        {
            // أرسل الإيميل أولاً
            await _emailService.SendFirstAbsenceWarningAsync(
                    user.Email,
                    user.FullName);

            var warning = new NFD_Warning
            {
                Scope = NFD_WarningScope.Trainee,
                Type = NFD_WarningType.Attendance,
                Level = NFD_WarningLevel.Low,
                Status = NFD_WarningStatus.Open,

                EnrollmentId = attendance.EnrollmentId,
                CompanyId = null,

                Evidence =
                    $"[AUTO-ABSENCE-1]" +
                    $"[ATTENDANCE-{attendance.DailyAttendanceId}] " +
                    $"First confirmed absence. " +
                    $"Attendance date: {attendance.Date:yyyy-MM-dd}.",

                IssuedDate = DateTime.UtcNow,
                RaisedByUserId = _settings.SystemUserId
            };

            await _warningRepository
                .AddWarningAsync(warning);
        }

        private async Task HandleSecondAbsenceAsync(
            NFD_DailyAttendance attendance,
            NFD_User user)
        {
            await _emailService.SendSecondAbsenceWarningAsync(
                    user.Email,
                    user.FullName);

            var warning = new NFD_Warning
            {
                Scope = NFD_WarningScope.Trainee,
                Type = NFD_WarningType.Attendance,
                Level = NFD_WarningLevel.Medium,
                Status = NFD_WarningStatus.Open,

                EnrollmentId = attendance.EnrollmentId,
                CompanyId = null,

                Evidence =
                    $"[AUTO-ABSENCE-2]" +
                    $"[ATTENDANCE-{attendance.DailyAttendanceId}] " +
                    $"Second confirmed absence. " +
                    $"Attendance date: {attendance.Date:yyyy-MM-dd}.",

                IssuedDate = DateTime.UtcNow,
                RaisedByUserId = _settings.SystemUserId
            };

            await _warningRepository
                .AddWarningAsync(warning);
        }

        private async Task HandleThirdAbsenceAsync(
            NFD_DailyAttendance attendance)
        {
            var warning = new NFD_Warning
            {
                Scope = NFD_WarningScope.Trainee,
                Type = NFD_WarningType.Attendance,
                Level = NFD_WarningLevel.Critical,

                // المرة الثالثة = تصعيد
                Status = NFD_WarningStatus.Escalated,

                EnrollmentId = attendance.EnrollmentId,
                CompanyId = null,

                Evidence =
                    $"[AUTO-ABSENCE-3]" +
                    $"[ATTENDANCE-{attendance.DailyAttendanceId}] " +
                    $"Third confirmed absence. " +
                    $"Authority notification is required. " +
                    $"Attendance date: {attendance.Date:yyyy-MM-dd}.",

                IssuedDate = DateTime.UtcNow,
                RaisedByUserId = _settings.SystemUserId
            };

            await _warningRepository
                .AddWarningAsync(warning);

            /*
             * المرحلة القادمة:
             *
             * await _authorityNotificationService
             *     .NotifyAsync(attendance.EnrollmentId);
             *
             * حالياً لا يوجد في الملفات المرسلة
             * API / Email / Service خاص بالهيئة،
             * لذلك نسجل الحالة Escalated فقط.
             */
        }
    }
}
