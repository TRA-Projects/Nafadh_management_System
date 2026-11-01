
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    public interface IQuizService
    {
        Task<IEnumerable<QuizListDto>> GetTrainerQuizzesAsync(int trainerId);
        Task<IEnumerable<QuizListDto>> GetTraineeQuizzesAsync(int traineeId);

        Task<QuizListDto> GetQuizDetailsAsync(int id, int trainerId);

        Task CreateQuizAsync(CreateQuizDto dto, int trainerId);
        Task UpdateQuizAsync(int id, UpdateQuizDto dto, int trainerId);

        Task PublishQuizAsync(int id, int trainerId);
        Task CloseQuizAsync(int id, int trainerId);
        Task ArchiveQuizAsync(int id, int trainerId);
        Task<int> DuplicateQuizAsync(int id, int trainerId);
    }

    public class QuizService : IQuizService
    {
        private readonly IQuizRepository _quizRepository;
        private readonly IQuizQuestionRepository _quizQuestionRepository;

        public QuizService(
            IQuizRepository quizRepository,
            IQuizQuestionRepository quizQuestionRepository)
        {
            _quizRepository = quizRepository;
            _quizQuestionRepository = quizQuestionRepository;
        }

        private static QuizListDto MapToDto(NFD_Quiz q)
        {
            return new QuizListDto
            {
                QuizId = q.QuizId,
                Title = q.Title,
                Description = q.Description,
                BatchId = q.BatchId,
                BatchName = q.Batch?.BatchName,
                StartDateTime = q.StartDateTime,
                EndDateTime = q.EndDateTime,
                DurationMinutes = q.DurationMinutes,
                Status = GetEffectiveStatus(q),
                RandomizeQuestions = q.RandomizeQuestions,
                MaxAttempts = q.MaxAttempts,
                CameraRequired = q.CameraRequired,
                PreventCopyPaste = q.PreventCopyPaste,
                MaxExitAttempts = q.MaxExitAttempts,
                ExitLimitAction = q.ExitLimitAction,
                RandomizeOptions = q.RandomizeOptions,
                ShowOneQuestionAtTime = q.ShowOneQuestionAtTime,
                AllowBackNavigation = q.AllowBackNavigation,
                ShowResultImmediately = q.ShowResultImmediately,
                ShowCorrectAnswers = q.ShowCorrectAnswers,
                ShowScoreToTrainee = q.ShowScoreToTrainee,
                PassingPercentage = q.PassingPercentage,
                CreatedAt = q.CreatedAt
            };
        }
        private static NFD_QuizStatus GetEffectiveStatus(NFD_Quiz quiz)
        {

            if (quiz.Status == NFD_QuizStatus.Draft ||
                quiz.Status == NFD_QuizStatus.Archived)
            {
                return quiz.Status;
            }

            var now = DateTime.UtcNow;


            if (now < quiz.StartDateTime)
            {
                return NFD_QuizStatus.Scheduled;
            }

            if (now >= quiz.EndDateTime)
            {
                return NFD_QuizStatus.Closed;
            }


            return NFD_QuizStatus.Open;
        }
        private static void ValidateQuiz(
            string title,
            int batchId,
            DateTime start,
            DateTime end,
            int duration,
            int maxAttempts,
            int maxExitAttempts,
            decimal passingPercentage,
            NFD_ExitLimitAction exitLimitAction)
        {
            if (string.IsNullOrWhiteSpace(title))
                throw new ArgumentException("عنوان الاختبار مطلوب.");

            if (batchId <= 0)
                throw new ArgumentException("يجب اختيار دفعة صحيحة.");

            if (end <= start)
                throw new ArgumentException(
                    "يجب أن يكون وقت الانتهاء بعد وقت البداية.");

            if (duration < 1 || duration > 600)
                throw new ArgumentException(
                    "مدة الاختبار يجب أن تكون بين 1 و600 دقيقة.");

            if (maxAttempts < 1 || maxAttempts > 10)
                throw new ArgumentException(
                    "عدد المحاولات يجب أن يكون بين 1 و10.");

            if (maxExitAttempts < 0 || maxExitAttempts > 100)
                throw new ArgumentException(
                    "عدد مرات الخروج يجب أن يكون بين 0 و100.");

            if (passingPercentage < 0 || passingPercentage > 100)
                throw new ArgumentException(
                    "نسبة النجاح يجب أن تكون بين 0 و100.");

            if (!Enum.IsDefined(typeof(NFD_ExitLimitAction), exitLimitAction))
                throw new ArgumentException(
                    "الإجراء المحدد عند تجاوز الخروج غير صحيح.");
        }

        private async Task<NFD_Quiz> GetOwnedQuizAsync(
            int id, int trainerId)
        {
            var quiz = await _quizRepository.GetByIdAsync(id);

            if (quiz == null)
                throw new KeyNotFoundException("الاختبار غير موجود.");

            if (quiz.TrainerId != trainerId)
                throw new UnauthorizedAccessException(
                    "لا تملكين صلاحية الوصول لهذا الاختبار.");

            return quiz;
        }

        public async Task<IEnumerable<QuizListDto>>
            GetTrainerQuizzesAsync(int trainerId)
        {
            var quizzes =
                await _quizRepository.GetQuizzesByTrainerIdAsync(trainerId);

            return quizzes.Select(MapToDto).ToList();
        }

        public async Task<IEnumerable<QuizListDto>>
            GetTraineeQuizzesAsync(int traineeId)
        {
            var quizzes =
                await _quizRepository.GetQuizzesByTraineeIdAsync(traineeId);

            return quizzes.Select(MapToDto).ToList();
        }

        public async Task<QuizListDto> GetQuizDetailsAsync(
            int id, int trainerId)
        {
            var quiz = await GetOwnedQuizAsync(id, trainerId);
            return MapToDto(quiz);
        }

        public async Task CreateQuizAsync(
            CreateQuizDto dto, int trainerId)
        {
            ValidateQuiz(
                dto.Title, dto.BatchId,
                dto.StartDateTime, dto.EndDateTime,
                dto.DurationMinutes, dto.MaxAttempts,
                dto.MaxExitAttempts, dto.PassingPercentage,
                dto.ExitLimitAction);

            // التحقق من ارتباط المدرب بالدفعة
            if (!await _quizRepository.IsTrainerAssignedToBatchAsync(
    trainerId, dto.BatchId))
            {
                throw new UnauthorizedAccessException(
                    "لا يمكنك إنشاء اختبار لدفعة غير مرتبطة بك.");
            }

            var quiz = new NFD_Quiz
            {
                Title = dto.Title.Trim(),
                Description = dto.Description?.Trim(),
                BatchId = dto.BatchId,
                TrainerId = trainerId,
                StartDateTime = dto.StartDateTime,
                EndDateTime = dto.EndDateTime,
                DurationMinutes = dto.DurationMinutes,

                // النشر يتم عبر PublishQuizAsync فقط
                Status = NFD_QuizStatus.Draft,

                RandomizeQuestions = dto.RandomizeQuestions,
                MaxAttempts = dto.MaxAttempts,
                CameraRequired = dto.CameraRequired,
                PreventCopyPaste = dto.PreventCopyPaste,
                MaxExitAttempts = dto.MaxExitAttempts,
                ExitLimitAction = dto.ExitLimitAction,
                RandomizeOptions = dto.RandomizeOptions,
                ShowOneQuestionAtTime = dto.ShowOneQuestionAtTime,
                AllowBackNavigation = dto.AllowBackNavigation,
                ShowResultImmediately = dto.ShowResultImmediately,
                ShowCorrectAnswers = dto.ShowCorrectAnswers,
                ShowScoreToTrainee = dto.ShowScoreToTrainee,
                PassingPercentage = dto.PassingPercentage,
                CreatedAt = DateTime.UtcNow
            };

            await _quizRepository.AddAsync(quiz);
            await _quizRepository.SaveChangesAsync();
        }

        public async Task UpdateQuizAsync(
            int id, UpdateQuizDto dto, int trainerId)
        {
            ValidateQuiz(
                dto.Title, dto.BatchId,
                dto.StartDateTime, dto.EndDateTime,
                dto.DurationMinutes, dto.MaxAttempts,
                dto.MaxExitAttempts, dto.PassingPercentage,
                dto.ExitLimitAction);

            var quiz = await GetOwnedQuizAsync(id, trainerId);

            if (quiz.Status != NFD_QuizStatus.Draft)
                throw new InvalidOperationException(
                    "يمكن تعديل إعدادات الاختبار في حالة المسودة فقط.");

            if (await _quizQuestionRepository.HasQuizAttemptsAsync(id))
                throw new InvalidOperationException(
                    "لا يمكن تعديل إعدادات اختبار بدأت فيه محاولات.");

            // التحقق من ارتباط المدرب بالدفعة الجديدة.
            if (!await _quizRepository.IsTrainerAssignedToBatchAsync(
    trainerId, dto.BatchId))
            {
                throw new UnauthorizedAccessException(
                    "لا يمكنك نقل الاختبار إلى دفعة غير مرتبطة بك.");
            }

            quiz.Title = dto.Title.Trim();
            quiz.Description = dto.Description?.Trim();
            quiz.BatchId = dto.BatchId;
            quiz.StartDateTime = dto.StartDateTime;
            quiz.EndDateTime = dto.EndDateTime;
            quiz.DurationMinutes = dto.DurationMinutes;

            // لا نغير Status من طلب التعديل
            quiz.RandomizeQuestions = dto.RandomizeQuestions;
            quiz.MaxAttempts = dto.MaxAttempts;
            quiz.CameraRequired = dto.CameraRequired;
            quiz.PreventCopyPaste = dto.PreventCopyPaste;
            quiz.MaxExitAttempts = dto.MaxExitAttempts;
            quiz.ExitLimitAction = dto.ExitLimitAction;
            quiz.RandomizeOptions = dto.RandomizeOptions;
            quiz.ShowOneQuestionAtTime = dto.ShowOneQuestionAtTime;
            quiz.AllowBackNavigation = dto.AllowBackNavigation;
            quiz.ShowResultImmediately = dto.ShowResultImmediately;
            quiz.ShowCorrectAnswers = dto.ShowCorrectAnswers;
            quiz.ShowScoreToTrainee = dto.ShowScoreToTrainee;
            quiz.PassingPercentage = dto.PassingPercentage;

            await _quizRepository.UpdateAsync(quiz);
            await _quizRepository.SaveChangesAsync();
        }


        public async Task PublishQuizAsync(int id, int trainerId)
        {
            var quiz = await GetOwnedQuizAsync(id, trainerId);

            if (quiz.Status != NFD_QuizStatus.Draft)
                throw new InvalidOperationException(
                    "يمكن نشر الاختبارات الموجودة في المسودة فقط.");

            if (!quiz.QuizQuestions.Any())
                throw new InvalidOperationException(
                    "لا يمكن نشر اختبار بدون أسئلة.");

            if (quiz.QuizQuestions.Any(q => q.Points <= 0))
                throw new InvalidOperationException(
                    "يجب أن تكون درجة كل سؤال أكبر من صفر.");

            if (quiz.QuizQuestions
                .Select(q => q.QuestionId)
                .Distinct()
                .Count() != quiz.QuizQuestions.Count)
                throw new InvalidOperationException(
                    "لا يمكن نشر اختبار يحتوي على أسئلة مكررة.");

            if (!await _quizQuestionRepository.AreQuizQuestionsValidAsync(
                id, trainerId))
            {
                throw new InvalidOperationException(
                    "لا يمكن نشر الاختبار؛ يوجد سؤال غير فعال أو تابع لمدرب آخر أو خياراته غير صحيحة.");
            }

            var now = DateTime.UtcNow;

            if (quiz.EndDateTime <= now)
                throw new InvalidOperationException(
                    "لا يمكن نشر اختبار انتهى موعده.");

            if ((quiz.EndDateTime - quiz.StartDateTime).TotalMinutes
                < quiz.DurationMinutes)
                throw new InvalidOperationException(
                    "الفترة الزمنية للاختبار أقصر من مدته المحددة.");

            quiz.Status = quiz.StartDateTime > now
                ? NFD_QuizStatus.Scheduled
                : NFD_QuizStatus.Open;

            await _quizRepository.UpdateAsync(quiz);
            await _quizRepository.SaveChangesAsync();
        }


        public async Task CloseQuizAsync(int id, int trainerId)
        {
            var quiz = await GetOwnedQuizAsync(id, trainerId);

            if (quiz.Status != NFD_QuizStatus.Open &&
                quiz.Status != NFD_QuizStatus.Scheduled)
                throw new InvalidOperationException(
                    "لا يمكن إغلاق الاختبار في حالته الحالية.");

            quiz.Status = NFD_QuizStatus.Closed;

            await _quizRepository.UpdateAsync(quiz);
            await _quizRepository.SaveChangesAsync();
        }

        public async Task ArchiveQuizAsync(int id, int trainerId)
        {
            var quiz = await GetOwnedQuizAsync(id, trainerId);

            if (quiz.Status != NFD_QuizStatus.Closed)
                throw new InvalidOperationException(
                    "يجب إغلاق الاختبار قبل أرشفته.");

            quiz.Status = NFD_QuizStatus.Archived;

            await _quizRepository.UpdateAsync(quiz);
            await _quizRepository.SaveChangesAsync();
        }

        public async Task<int> DuplicateQuizAsync(int id, int trainerId)
        {
            var original = await GetOwnedQuizAsync(id, trainerId);

            var copy = new NFD_Quiz
            {
                Title = original.Title.Length > 193
    ? original.Title.Substring(0, 193) + " - نسخة"
    : original.Title + " - نسخة",
                Description = original.Description,
                BatchId = original.BatchId,
                TrainerId = trainerId,
                StartDateTime = original.StartDateTime,
                EndDateTime = original.EndDateTime,
                DurationMinutes = original.DurationMinutes,
                Status = NFD_QuizStatus.Draft,
                RandomizeQuestions = original.RandomizeQuestions,
                MaxAttempts = original.MaxAttempts,
                CameraRequired = original.CameraRequired,
                PreventCopyPaste = original.PreventCopyPaste,
                MaxExitAttempts = original.MaxExitAttempts,
                ExitLimitAction = original.ExitLimitAction,
                RandomizeOptions = original.RandomizeOptions,
                ShowOneQuestionAtTime = original.ShowOneQuestionAtTime,
                AllowBackNavigation = original.AllowBackNavigation,
                ShowResultImmediately = original.ShowResultImmediately,
                ShowCorrectAnswers = original.ShowCorrectAnswers,
                ShowScoreToTrainee = original.ShowScoreToTrainee,
                PassingPercentage = original.PassingPercentage,
                CreatedAt = DateTime.UtcNow,

                QuizQuestions = original.QuizQuestions
                    .Select(q => new NFD_QuizQuestion
                    {
                        QuestionId = q.QuestionId,
                        QuestionOrder = q.QuestionOrder,
                        Points = q.Points
                    })
                    .ToList()
            };

            await _quizRepository.AddAsync(copy);
            await _quizRepository.SaveChangesAsync();

            return copy.QuizId;
        }
    }
}
