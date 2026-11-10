using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Nafadh_Backend.Services
{

    public interface ITraineeEvaluationService
    {
        Task SaveEvaluationAsync(
            int attemptId,
            int trainerId,
            SaveTraineeEvaluationDto dto);

        Task<TraineeEvaluationDto?> GetTraineeEvaluationAsync(
            int attemptId,
            int traineeId);

        // الدالة الجديدة لملف الإنجاز (التقييم الكلي)
        Task<TraineeOverallEvaluationDTO> GetTraineeOverallEvaluationAsync(int enrollmentId);
    }


    public class TraineeEvaluationService : ITraineeEvaluationService
    {
        private readonly ITraineeEvaluationRepository _repository;
        private readonly Nafadhcontext _context;

        public TraineeEvaluationService(
            ITraineeEvaluationRepository repository,
            Nafadhcontext context)
        {
            _repository = repository;
            _context = context;
        }

        public async Task SaveEvaluationAsync(
            int attemptId,
            int trainerId,
            SaveTraineeEvaluationDto dto)
        {
            var attempt = await _repository.GetAttemptAsync(attemptId);

            if (attempt == null)
                throw new KeyNotFoundException(
                    "محاولة الاختبار غير موجودة.");

            if (attempt.Quiz.TrainerId != trainerId)
                throw new UnauthorizedAccessException(
                    "لا يمكنك تقييم اختبار تابع لمدرب آخر.");

            if (attempt.SubmittedAt == null &&
                attempt.Status != "Terminated" &&
                attempt.Status != "Expired")
                throw new InvalidOperationException(
                    "لا يمكن تقييم محاولة لم تنتهِ بعد.");

            if (dto.IsCompleted)
            {
                // التحقق من اكتمال تصحيح الأسئلة المقالية
                var hasPendingEssay = await _context.NFD_AttemptQuestions
                    .AnyAsync(aq =>
                        aq.AttemptId == attemptId &&
                        aq.Question.QuestionType ==
                            Nafadh_Backend.Enums.NFD_QuizQuestionType.Essay &&
                        aq.Answers.Any(a => !a.IsManuallyGraded));

                if (hasPendingEssay)
                    throw new InvalidOperationException(
                        "يجب إكمال تصحيح الأسئلة المقالية قبل اعتماد التقييم.");
            }

            var evaluation =
                await _repository.GetEvaluationAsync(attemptId);

            if (evaluation == null)
            {
                evaluation = new NFD_TraineeEvaluation
                {
                    AttemptId = attemptId,
                    CreatedAt = DateTime.UtcNow
                };

                await _repository.AddAsync(evaluation);
            }

            if (evaluation.IsCompleted)
                throw new InvalidOperationException(
                    "هذا التقييم معتمد بالفعل ولا يمكن تعديله.");

            evaluation.Strengths = dto.Strengths?.Trim();
            evaluation.AreasForImprovement =
                dto.AreasForImprovement?.Trim();
            evaluation.Recommendations =
                dto.Recommendations?.Trim();
            evaluation.TrainerNotes = dto.TrainerNotes?.Trim();

            evaluation.IsCompleted = dto.IsCompleted;
            evaluation.CompletedAt = dto.IsCompleted
                ? DateTime.UtcNow
                : null;

            await _repository.SaveChangesAsync();
        }

        public async Task<TraineeEvaluationDto?>
            GetTraineeEvaluationAsync(
                int attemptId,
                int traineeId)
        {
            var attempt = await _repository.GetAttemptAsync(attemptId);

            if (attempt == null)
                throw new KeyNotFoundException(
                    "محاولة الاختبار غير موجودة.");

            if (attempt.TraineeId != traineeId)
                throw new UnauthorizedAccessException(
                    "لا يمكنك عرض تقييم متدرب آخر.");

            var evaluation =
                await _repository.GetEvaluationAsync(attemptId);

            // لا يظهر التقييم قبل اعتماده
            if (evaluation == null || !evaluation.IsCompleted)
                return null;

            return new TraineeEvaluationDto
            {
                EvaluationId = evaluation.EvaluationId,
                AttemptId = attempt.AttemptId,
                QuizId = attempt.QuizId,
                TraineeId = attempt.TraineeId,
                Score = attempt.Score,
                Percentage = attempt.Percentage,
                PassingPercentage = attempt.Quiz.PassingPercentage,
                IsPassed = attempt.Percentage >=
                           attempt.Quiz.PassingPercentage,
                Strengths = evaluation.Strengths,
                AreasForImprovement =
                    evaluation.AreasForImprovement,
                Recommendations = evaluation.Recommendations,
                TrainerNotes = evaluation.TrainerNotes,
                IsCompleted = evaluation.IsCompleted,
                CompletedAt = evaluation.CompletedAt
            };
        }

        // ==========================================
        // 3. التقييم الكلي للمتدرب (ملف الإنجاز - الدرجة النهائية)
        // ==========================================



        public async Task<TraineeOverallEvaluationDTO> GetTraineeOverallEvaluationAsync(
            int enrollmentId)
        {
            var enrollment = await _context.NFD_Enrollments
                .Include(e => e.Batch)
                .FirstOrDefaultAsync(e => e.EnrollmentId == enrollmentId);

            if (enrollment == null)
                throw new KeyNotFoundException("التسجيل غير موجود.");

            int traineeId = enrollment.TraineeId;
            int batchId = enrollment.BatchId;
            var batch = enrollment.Batch;

            var result = new TraineeOverallEvaluationDTO
            {
                EnrollmentId = enrollmentId,
                TraineeId = traineeId
            };

            // 1. Attendance
            var attendance = await _context.NFD_DailyAttendances
                .AsNoTracking()
                .Where(a => a.EnrollmentId == enrollmentId)
                .ToListAsync();

            var countedAttendance = attendance
                .Where(a => a.Status !=
                    Nafadh_Backend.Enums.NFD_AttendanceStatus.Excused)
                .ToList();

            if (countedAttendance.Any())
            {
                result.AttendancePercentage = Math.Round(
                    countedAttendance.Average(a =>
                        a.Status == Nafadh_Backend.Enums.NFD_AttendanceStatus.Present
                            ? 100.0
                            : a.Status == Nafadh_Backend.Enums.NFD_AttendanceStatus.Late
                                ? 50.0
                                : 0.0), 2);
            }

            // 2. Tasks
            var batchTasks = await _context.NFD_Tasks
                .AsNoTracking()
                .Where(t => t.BatchId == batchId)
                .Select(t => new
                {
                    t.TaskId,
                    t.DueDate
                })
                .ToListAsync();

            var taskIds = batchTasks.Select(t => t.TaskId).ToList();

            var submissions = await _context.NFD_Submissions
                .AsNoTracking()
                .Where(s =>
                    s.TraineeId == traineeId &&
                    taskIds.Contains(s.TaskId))
                .OrderByDescending(s => s.SubmittedAt)
                .Select(s => new
                {
                    s.TaskId,
                    s.Grade,
                    s.Status
                })
                .ToListAsync();

            var validTaskGrades = new Dictionary<int, double>();

            foreach (var group in submissions.GroupBy(s => s.TaskId))
            {
                var gradedSubmission = group.FirstOrDefault(s =>
                    s.Status == Nafadh_Backend.Enums.NFD_SubmissionStatus.Graded &&
                    double.TryParse(
                        s.Grade,
                        System.Globalization.NumberStyles.Any,
                        System.Globalization.CultureInfo.InvariantCulture,
                        out double grade) &&
                    grade >= 0 && grade <= 100);

                if (gradedSubmission != null &&
                    double.TryParse(
                        gradedSubmission.Grade,
                        System.Globalization.NumberStyles.Any,
                        System.Globalization.CultureInfo.InvariantCulture,
                        out double score))
                {
                    validTaskGrades[group.Key] = score;
                }
            }

            var now = DateTime.UtcNow;

            var resolvedTaskScores = new List<double>();

            foreach (var task in batchTasks)
            {
                if (validTaskGrades.TryGetValue(task.TaskId, out double grade))
                {
                    resolvedTaskScores.Add(grade);
                }
                else if (
                    !submissions.Any(s => s.TaskId == task.TaskId) &&
                    task.DueDate <= now)
                {
                    // Overdue task without submission = zero.
                    resolvedTaskScores.Add(0);
                }
            }

            result.TasksPercentage = resolvedTaskScores.Any()
                ? Math.Round(resolvedTaskScores.Average(), 2)
                : 0;

            // 3. Quizzes
            var batchQuizIds = await _context.NFD_Quizzes
                .AsNoTracking()
                .Where(q =>
    q.BatchId == batchId &&
    q.Status != Nafadh_Backend.Enums.NFD_QuizStatus.Draft)
                .Select(q => q.QuizId)
                .ToListAsync();

            var submittedAttempts = await _context.NFD_QuizAttempts
                .AsNoTracking()
                .Where(q =>
                    q.TraineeId == traineeId &&
                    batchQuizIds.Contains(q.QuizId) &&
                    q.SubmittedAt != null &&
                    q.Status == "Submitted")
                .OrderByDescending(q => q.AttemptNumber)
                .Select(q => new
                {
                    q.QuizId,
                    q.Percentage
                })
                .ToListAsync();

            var quizGrades = submittedAttempts
                .GroupBy(q => q.QuizId)
                .ToDictionary(
                    g => g.Key,
                    g => (double)g.First().Percentage);

            if (batchQuizIds.Count > 0)
            {
                result.QuizzesPercentage = Math.Round(
                    batchQuizIds
                        .Where(id => quizGrades.ContainsKey(id))
                        .Select(id => quizGrades[id])
                        .DefaultIfEmpty(0)
                        .Average(), 2);
            }


            // 4. Projects - trainer grades only
            var assignedProjectIds = await _context.NFD_ProjectBatches
                .AsNoTracking()
                .Where(pb =>
                    pb.BatchId == batchId &&
                    _context.NFD_ProjectMembers.Any(pm =>
                        pm.ProjectId == pb.ProjectId &&
                        pm.TraineeId == traineeId))
                .Select(pb => pb.ProjectId)
                .Distinct()
                .ToListAsync();

            var projectGrades = await _context.NFD_TrainerProjectGrades
                .AsNoTracking()
                .Where(g =>
                    g.EnrollmentId == enrollmentId &&
                    assignedProjectIds.Contains(g.ProjectId))
                .Select(g => new
                {
                    g.ProjectId,
                    g.Score
                })
                .ToListAsync();

            var validProjectGrades = projectGrades
                .Where(g => g.Score >= 0 && g.Score <= 100)
                .GroupBy(g => g.ProjectId)
                .ToDictionary(g => g.Key, g => (double)g.First().Score);

            result.ProjectsPercentage = validProjectGrades.Any()
                ? Math.Round(validProjectGrades.Values.Average(), 2)
                : 0;


            // 5. Check evaluation completeness
            bool attendanceComplete =
                batch.AttendanceWeight <= 0 ||
                countedAttendance.Any();

            bool tasksComplete =
    batch.TasksWeight <= 0 ||
    (batchTasks.Count > 0 &&
     batchTasks.All(task =>
         validTaskGrades.ContainsKey(task.TaskId) ||
         (
             !submissions.Any(s => s.TaskId == task.TaskId) &&
             task.DueDate <= now
         )));

            bool quizzesComplete =
                batch.QuizzesWeight <= 0 ||
                (batchQuizIds.Count > 0 &&
                 batchQuizIds.All(id => quizGrades.ContainsKey(id)));

            bool projectsComplete =
    batch.ProjectsWeight <= 0 ||
    (assignedProjectIds.Count > 0 &&
     assignedProjectIds.All(id =>
         validProjectGrades.ContainsKey(id)));

            result.IsComplete =
                attendanceComplete &&
                tasksComplete &&
                quizzesComplete &&
                projectsComplete;

            if (!result.IsComplete)
            {
                result.EvaluationStatus = "التقييم غير مكتمل";
                result.FinalGrade = "بانتظار استكمال التقييم";
                result.FinalScore = 0;

                return result;
            }

            // 6. Validate weights
            double attendanceWeight = (double)batch.AttendanceWeight;
            double tasksWeight = (double)batch.TasksWeight;
            double quizzesWeight = (double)batch.QuizzesWeight;
            double projectsWeight = (double)batch.ProjectsWeight;

            double totalWeight =
                attendanceWeight +
                tasksWeight +
                quizzesWeight +
                projectsWeight;

            if (totalWeight <= 0 ||
                Math.Abs(totalWeight - 100) > 0.01)
            {
                throw new InvalidOperationException(
                    "يجب أن يكون مجموع أوزان التقييم في الدفعة 100%.");
            }

            // 7. Final weighted score
            result.FinalScore = Math.Round(
                (
                    result.AttendancePercentage * attendanceWeight +
                    result.TasksPercentage * tasksWeight +
                    result.QuizzesPercentage * quizzesWeight +
                    result.ProjectsPercentage * projectsWeight
                ) / 100.0, 2);

            // 8. Classification
            if (result.AttendancePercentage <
                (double)batch.AtRiskMinAttendance)
            {
                result.FinalGrade = "معرض للخطر";
            }
            else if (
                result.FinalScore >= (double)batch.ExcellentMinScore &&
                result.AttendancePercentage >=
                    (double)batch.ExcellentMinAttendance)
            {
                result.FinalGrade = "ممتاز";
            }
            else if (
                result.FinalScore >= (double)batch.VeryGoodMinScore &&
                result.AttendancePercentage >=
                    (double)batch.VeryGoodMinAttendance)
            {
                result.FinalGrade = "جيد جداً";
            }
            else if (result.FinalScore >= (double)batch.GoodMinScore)
            {
                result.FinalGrade = "جيد";
            }
            else
            {
                result.FinalGrade = "يحتاج إلى تحسين";
            }

            result.EvaluationStatus = "مكتمل";

            return result;
        }

    }
}