
using Microsoft.Extensions.Options;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;
using Nafadh_Backend.Settings;

namespace Nafadh_Backend.Services
{
    public class RiskWarningService : IRiskWarningService
    {
        private readonly IDailyAttendanceRepository _attendanceRepository;
        private readonly IEvaluationRepository _evaluationRepository;
        private readonly IWarningRepository _warningRepository;
        private readonly AbsenceWarningSettings _settings;
        private readonly IEnrollmentRepository _enrollmentRepository;
        private readonly ITrainingConstantsService _trainingConstants;

        private const string AttendanceRiskMarker =
            "[AUTO-RISK-ATTENDANCE-80]";

        private const string PerformanceRiskMarker =
            "[AUTO-RISK-PERFORMANCE-60]";

        public RiskWarningService(
            IDailyAttendanceRepository attendanceRepository,
            IEvaluationRepository evaluationRepository,
            IWarningRepository warningRepository,
            IEnrollmentRepository enrollmentRepository,
            ITrainingConstantsService trainingConstants,
            IOptions<AbsenceWarningSettings> settings)
        {
            _attendanceRepository = attendanceRepository;
            _evaluationRepository = evaluationRepository;
            _warningRepository = warningRepository;
            _enrollmentRepository = enrollmentRepository;
            _trainingConstants = trainingConstants;

            _settings = settings.Value;
        }

        public async Task ProcessEnrollmentRiskAsync(int enrollmentId)
        {
            if (enrollmentId <= 0)
            {
                throw new ArgumentException(
                    "EnrollmentId must be greater than zero.",
                    nameof(enrollmentId));
            }

            if (_settings.SystemUserId <= 0)
            {
                throw new InvalidOperationException(
                    "AbsenceWarnings:SystemUserId is not configured.");
            }

            // 1. فحص الحضور
            var attendances =
                await _attendanceRepository
                    .GetByEnrollmentIdAsync(enrollmentId);

            if (attendances.Count > 0)
            {
                double attendancePercentage =
                    attendances.Count(a =>
                        a.Status == NFD_AttendanceStatus.Present)
                    * 100.0 / attendances.Count;

                if (attendancePercentage < 80 &&
                    await WarningTypePolicy.IsActiveAsync(
                        _trainingConstants, NFD_WarningType.Attendance))
                {
                    bool warningExists =
                        await _warningRepository.AutoRiskWarningExistsAsync(
                            enrollmentId,
                            NFD_WarningType.Attendance,
                            AttendanceRiskMarker);

                    if (!warningExists)
                    {
                        var warning = new NFD_Warning
                        {
                            Scope = NFD_WarningScope.Trainee,
                            Type = NFD_WarningType.Attendance,
                            Level = NFD_WarningLevel.Medium,
                            Status = NFD_WarningStatus.Open,

                            EnrollmentId = enrollmentId,
                            CompanyId = null,

                            Evidence =
                                $"{AttendanceRiskMarker} " +
                                $"Attendance percentage is " +
                                $"{Math.Round(attendancePercentage, 1)}%, " +
                                "below the required 80% threshold.",

                            IssuedDate = DateTime.UtcNow,
                            RaisedByUserId = _settings.SystemUserId
                        };

                        await _warningRepository
                            .AddWarningAsync(warning);
                    }
                }
            }

            // 2. فحص الأداء
            var allEvaluations =
                await _evaluationRepository
                    .GetEvaluationsByEnrollmentIdAsync(enrollmentId);

            // استبعاد تقييمات أداء المدرب وتقييمات الشركة.
            // نعتمد على تقييمات المتدرب: Technical, Behavioral, Final.
            // اعتماد تقييمات المتدرب فقط، واستبعاد تقييمات الشركة والمدرب.
            // استبعاد الدرجات غير الصالحة قبل حساب متوسط الأداء.
            var validEvaluations = allEvaluations
                .Where(e =>
                    e.EnrollmentId == enrollmentId &&
                    e.EvaluationTemplate != null &&
                    (
                        e.EvaluationTemplate.Type ==
                            NFD_EvaluationType.Technical ||
                        e.EvaluationTemplate.Type ==
                            NFD_EvaluationType.Behavioral ||
                        e.EvaluationTemplate.Type ==
                            NFD_EvaluationType.Final
                    ) &&
                    e.Score >= 0 &&
                    e.Score <= 100)
                .ToList();

            // لا نصدر تحذير أداء قبل توفر تقييمين على الأقل.
            if (validEvaluations.Count >= 2)
            {
                double performancePercentage =
                    (double)validEvaluations.Average(e => e.Score);

                if (performancePercentage < 60 &&
                    await WarningTypePolicy.IsActiveAsync(
                        _trainingConstants, NFD_WarningType.Performance))
                {
                    bool warningExists =
                        await _warningRepository.AutoRiskWarningExistsAsync(
                            enrollmentId,
                            NFD_WarningType.Performance,
                            PerformanceRiskMarker);

                    if (!warningExists)
                    {
                        var warning = new NFD_Warning
                        {
                            Scope = NFD_WarningScope.Trainee,
                            Type = NFD_WarningType.Performance,
                            Level = NFD_WarningLevel.High,
                            Status = NFD_WarningStatus.Open,

                            EnrollmentId = enrollmentId,
                            CompanyId = null,

                            Evidence =
                                $"{PerformanceRiskMarker} " +
                                $"Average performance is " +
                                $"{Math.Round(performancePercentage, 1)}%, " +
                                $"based on {validEvaluations.Count} evaluations, " +
                                "below the required 60% threshold.",

                            IssuedDate = DateTime.UtcNow,
                            RaisedByUserId = _settings.SystemUserId
                        };

                        await _warningRepository
                            .AddWarningAsync(warning);
                    }
                }
            }
        }

        public async Task<int> ProcessAllActiveEnrollmentsRiskAsync()
        {
            var activeEnrollments = await _enrollmentRepository.GetAllAsync(
                batchId: null,
                traineeId: null,
                companyId: null,
                status: NFD_EnrollmentCompletionStatus.InProgress);

            int processedCount = 0;

            foreach (var enrollment in activeEnrollments)
            {
                await ProcessEnrollmentRiskAsync(enrollment.EnrollmentId);
                processedCount++;
            }

            return processedCount;
        }
    }
}
