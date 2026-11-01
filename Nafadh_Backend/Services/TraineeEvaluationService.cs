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
        public async Task<TraineeOverallEvaluationDTO> GetTraineeOverallEvaluationAsync(int enrollmentId)
        {
            var enrollment = await _context.NFD_Enrollments
                .Include(e => e.Trainee)
                .FirstOrDefaultAsync(e => e.EnrollmentId == enrollmentId);

            if (enrollment == null)
                throw new KeyNotFoundException("التسجيل غير موجود.");

            int traineeId = enrollment.TraineeId;
            int batchId = enrollment.BatchId;

            var result = new TraineeOverallEvaluationDTO
            {
                EnrollmentId = enrollmentId,
                TraineeId = traineeId
            };

            // 1. حساب نسبة الحضور (وزن 30%)
            var attendances = await _context.NFD_DailyAttendances
                .Where(a => a.EnrollmentId == enrollmentId)
                .ToListAsync();

            int totalDays = attendances.Count;
            int presentDays = attendances.Count(a => a.Status == Nafadh_Backend.Enums.NFD_AttendanceStatus.Present);

            result.AttendancePercentage = totalDays > 0
                ? Math.Round((double)presentDays / totalDays * 100, 2)
                : 0;

            // 2. حساب نسبة درجات المهام (وزن 50%)
            var submissions = await _context.NFD_Submissions
                .Where(s => s.TraineeId == traineeId && s.Task.BatchId == batchId)
                .ToListAsync();

            double totalEarnedGrades = 0;
            double maxPossibleGrades = 0;

            foreach (var sub in submissions)
            {
                if (!string.IsNullOrEmpty(sub.Grade) && double.TryParse(sub.Grade, out double grade))
                {
                    totalEarnedGrades += grade;
                    maxPossibleGrades += 100;
                }
            }

            result.TasksPercentage = maxPossibleGrades > 0
                ? Math.Round(totalEarnedGrades / maxPossibleGrades * 100, 2)
                : 0;

            // 3. حساب نسبة الاختبارات (وزن 20%)
            var quizAttempts = await _context.NFD_QuizAttempts
                .Where(q => q.TraineeId == traineeId)
                .ToListAsync();

            result.QuizzesPercentage = quizAttempts.Any()
                ? (double)quizAttempts.Max(q => q.Percentage)
                : 0;

            // 4. الحساب النهائي والتصنيف
            result.FinalScore = Math.Round(
                (result.AttendancePercentage * 0.30) +
                (result.TasksPercentage * 0.50) +
                (result.QuizzesPercentage * 0.20), 2);

            // التصنيف لـ 3 حالات 
            if (result.FinalScore >= 80)
            {
                result.FinalGrade = "ممتاز";
            }
            else if (result.FinalScore >= 60)
            {
                result.FinalGrade = "جيد";
            }
            else
            {
                result.FinalGrade = "يحتاج إلى تحسين";
            }

            return result;
        }
    }
}