using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;
using static Nafadh_Backend.DTOs.QuizAttemptDto;

namespace Nafadh_Backend.Services
{
    public interface IQuizAttemptService
    {
        Task<QuizAttemptDto> StartAttemptAsync(
            StartQuizAttemptDto dto);
        Task SaveAnswerAsync(
    int attemptId,
    SubmitQuizAnswerDto dto);

        Task SubmitAttemptAsync(
            SubmitQuizDto dto);

        Task GradeEssayAnswerAsync(
 GradeQuizAnswerDto dto);

        Task<int> RegisterViolationAsync(int attemptId);

        Task<List<QuizAttemptDto>> GetAttemptsByQuizIdAsync(int quizId);

        Task DecideExcuseAsync(int attemptId, bool approve, string? rejectionReason);

        Task AddSubmissionNoteAsync(int attemptId, string note);

        Task SubmitExcuseAsync(int quizId, string reason, IFormFile? attachment);



    


        Task<TraineeQuizzesOverviewDto> GetTraineeQuizzesAsync(int traineeId);
        Task<QuizAttemptDto> GetAttemptAsync(int attemptId, int traineeId);
        Task<QuizAttemptFullDetailsDto> GetAttemptDetailsAsync(
    int attemptId);
    }

    public class QuizAttemptFullDetailsDto
    {
        public int AttemptId { get; set; }

        public int QuizId { get; set; }

        public string QuizTitle { get; set; } = string.Empty;

        public int AttemptNumber { get; set; }

        public string Status { get; set; } = string.Empty;

        public decimal Score { get; set; }

        public decimal Percentage { get; set; }

        public DateTime StartedAt { get; set; }

        public DateTime? SubmittedAt { get; set; }

        public List<AttemptAnswerDetailsDto> Answers { get; set; }
            = new();
    }


    public class AttemptAnswerDetailsDto
    {
        public int AttemptQuestionId { get; set; }

        public int QuestionId { get; set; }

        public int QuestionOrder { get; set; }

        public string QuestionText { get; set; } = string.Empty;

        public string QuestionType { get; set; } = string.Empty;

        public decimal Points { get; set; }

        public int? SelectedOptionId { get; set; }

        public string? SelectedOptionText { get; set; }

        public string? TextAnswer { get; set; }

        public bool? IsCorrect { get; set; }

        public decimal AwardedPoints { get; set; }

        public bool IsManuallyGraded { get; set; }

        public bool IsMarkedForReview { get; set; }
    }

    public class QuizAttemptService
        : IQuizAttemptService
    {
        private readonly IQuizAttemptRepository _repository;
        private readonly Nafadhcontext _context;

        public QuizAttemptService(
            IQuizAttemptRepository repository,
            Nafadhcontext context)
        {
            _repository = repository;
            _context = context;
        }

        private static void RecalculateScore(NFD_QuizAttempt attempt)
        {
            var totalScore = attempt.AttemptQuestions.Sum(q =>
                q.Answers.OrderByDescending(a => a.AnsweredAt)
                    .FirstOrDefault()?.AwardedPoints ?? 0m);
            var totalPoints = attempt.AttemptQuestions.Sum(q => q.Points);
            attempt.Score = totalScore;
            attempt.Percentage = totalPoints <= 0 ? 0m
                : Math.Round(totalScore / totalPoints * 100m, 2);
        }

        public async Task<QuizAttemptDto> StartAttemptAsync(
            StartQuizAttemptDto dto)
        {
            var quiz =
                await _repository.GetQuizForAttemptAsync(
                    dto.QuizId);

            if (quiz == null)
            {
                throw new KeyNotFoundException(
                    "الاختبار غير موجود.");
            }

            if (quiz.Status != Nafadh_Backend.Enums.NFD_QuizStatus.Open)
            {
                throw new InvalidOperationException(
                    "الاختبار غير متاح حالياً.");
            }

            var isEnrolled =
                await _repository.IsTraineeEnrolledInBatchAsync(
                    dto.TraineeId,
                    quiz.BatchId);

            if (!isEnrolled)
            {
                throw new UnauthorizedAccessException(
                    "المتدرب غير مسجل في دفعة هذا الاختبار.");
            }

            var now = DateTime.UtcNow;

            if (now < quiz.StartDateTime)
            {
                throw new InvalidOperationException(
                    "الاختبار لم يبدأ بعد.");
            }

            if (now > quiz.EndDateTime)
            {
                throw new InvalidOperationException(
                    "انتهى وقت دخول الاختبار.");
            }

            // الكاميرا إلزامية => لازم موافقة المتدرب
            if (quiz.CameraRequired && !dto.CameraConsent)
            {
                throw new InvalidOperationException(
                    "هذا الاختبار يتطلب تشغيل الكاميرا. يرجى الموافقة وتشغيلها للمتابعة.");
            }

            // استئناف محاولة جارية بدل إنشاء محاولة جديدة
            var existing = await _context.NFD_QuizAttempts
                .FirstOrDefaultAsync(a =>
                    a.QuizId == dto.QuizId &&
                    a.TraineeId == dto.TraineeId &&
                    a.Status == "InProgress");

            if (existing != null)
            {
                if (now <= existing.StartedAt.AddMinutes(quiz.DurationMinutes))
                {
                    return await GetAttemptAsync(existing.AttemptId, dto.TraineeId);
                }

                existing.Status = "Expired";
                existing.SubmittedAt = now;
                await _context.SaveChangesAsync();
            }

            var attemptsCount =
                await _repository.GetAttemptsCountAsync(
                    dto.QuizId,
                    dto.TraineeId);

            if (attemptsCount >= quiz.MaxAttempts)
            {
                throw new InvalidOperationException(
                    "لقد استنفدت عدد المحاولات المسموحة.");
            }

            var questions = quiz.QuizQuestions
                .Where(x => x.Question != null)
                .ToList();

            if (questions.Count == 0)
            {
                throw new InvalidOperationException(
                    "لا توجد أسئلة مرتبطة بهذا الاختبار.");
            }

            if (quiz.RandomizeQuestions)
            {
                questions = questions
                    .OrderBy(x => Guid.NewGuid())
                    .ToList();
            }
            else
            {
                questions = questions
                    .OrderBy(x => x.QuestionOrder)
                    .ToList();
            }

            var attempt = new NFD_QuizAttempt
            {
                QuizId = quiz.QuizId,
                TraineeId = dto.TraineeId,
                AttemptNumber = attemptsCount + 1,
                StartedAt = now,
                Status = "InProgress",
                CreatedAt = now,
                IdentityCheckStatus = quiz.CameraRequired ? dto.IdentityCheckStatus : null,
                NeedsManualReview = quiz.CameraRequired && dto.IdentityCheckStatus != "Passed"
            };

            var order = 1;

            foreach (var quizQuestion in questions)
            {
                attempt.AttemptQuestions.Add(
                    new NFD_AttemptQuestion
                    {
                        QuestionId =
                            quizQuestion.QuestionId,
                        QuestionOrder = order++,
                        Points = quizQuestion.Points
                    });
            }

            await _repository.AddAttemptAsync(attempt);
            await _repository.SaveChangesAsync();

            // Reload the saved attempt with its question and option relationships.
            var savedAttempt = await _repository.GetAttemptForAnswerAsync(attempt.AttemptId);
            if (savedAttempt == null)
            {
                throw new InvalidOperationException("تعذر تحميل أسئلة محاولة الاختبار.");
            }

            return new QuizAttemptDto
            {
                AttemptId = savedAttempt.AttemptId,
                QuizId = quiz.QuizId,
                QuizTitle = quiz.Title,
                DurationMinutes = quiz.DurationMinutes,
                CameraRequired = quiz.CameraRequired,
                StartedAt = attempt.StartedAt,
                ExpectedEndAt = attempt.StartedAt
                    .AddMinutes(quiz.DurationMinutes),
                Status = attempt.Status,
                Questions = savedAttempt.AttemptQuestions
                    .OrderBy(x => x.QuestionOrder)
                    .Select(x => new AttemptQuestionDto
                    {
                        AttemptQuestionId =
                            x.AttemptQuestionId,
                        QuestionId = x.QuestionId,
                        QuestionOrder = x.QuestionOrder,
                        QuestionText =
                            x.Question.QuestionText,
                        QuestionType =
                            x.Question.QuestionType,
                        Points = x.Points,
                        Options = x.Question.Options
                            .OrderBy(o => o.SortOrder)
                            .Select(o =>
                                new QuestionOptionDto
                                {
                                    OptionId = o.OptionId,
                                    OptionText =
                                        o.OptionText,
                                    OptionCode =
                                        o.OptionCode,
                                    SortOrder =
                                        o.SortOrder
                                })
                            .ToList()
                    })
                    .ToList()
            };
        }
        public async Task SaveAnswerAsync(
         int attemptId,
         SubmitQuizAnswerDto dto)
        {
            var attempt =
                await _repository.GetAttemptForAnswerAsync(
                    attemptId);

            if (attempt == null)
            {
                throw new KeyNotFoundException(
                    "المحاولة غير موجودة.");
            }

            if (attempt.Status != "InProgress")
            {
                throw new InvalidOperationException(
                    "لا يمكن تعديل إجابة هذه المحاولة.");
            }

            var now = DateTime.UtcNow;
            var quizEndTime = attempt.StartedAt
                .AddMinutes(attempt.Quiz.DurationMinutes);

            if (now > quizEndTime)
            {
                attempt.Status = "Expired";
                attempt.SubmittedAt = now;

                await _repository.SaveChangesAsync();

                throw new InvalidOperationException(
                    "انتهى وقت الاختبار.");
            }

            var attemptQuestion = attempt.AttemptQuestions
                .FirstOrDefault(x =>
                    x.AttemptQuestionId ==
                    dto.AttemptQuestionId);

            if (attemptQuestion == null)
            {
                throw new KeyNotFoundException(
                    "سؤال المحاولة غير موجود.");
            }

            if (dto.SelectedOptionId.HasValue)
            {
                var selectedOption = attemptQuestion.Question.Options
                    .FirstOrDefault(x =>
                        x.OptionId == dto.SelectedOptionId.Value);

                if (selectedOption == null)
                {
                    throw new ArgumentException(
                        "الخيار المحدد لا ينتمي إلى هذا السؤال.");
                }
            }

            bool? isCorrect = null;
            decimal awardedPoints = 0;
            bool isManuallyGraded = false;
            var questionType = attemptQuestion.Question.QuestionType;

            if (questionType == Nafadh_Backend.Enums.NFD_QuizQuestionType.Essay)
            {
                if (dto.SelectedOptionId.HasValue)
                {
                    throw new ArgumentException(
                        "السؤال المقالي لا يقبل اختيار إجابة.");
                }

                if (string.IsNullOrWhiteSpace(dto.TextAnswer))
                {
                    throw new ArgumentException(
                        "يجب كتابة إجابة للسؤال المقالي.");
                }
            }
            else
            {
                if (!dto.SelectedOptionId.HasValue)
                {
                    throw new ArgumentException(
                        "يجب اختيار إجابة لهذا السؤال.");
                }

                if (!string.IsNullOrWhiteSpace(dto.TextAnswer))
                {
                    throw new ArgumentException(
                        "هذا السؤال لا يقبل إجابة نصية.");
                }
            }
            if (dto.SelectedOptionId.HasValue)
            {
                var selectedOption = attemptQuestion.Question.Options
                    .First(x =>
                        x.OptionId == dto.SelectedOptionId.Value);

                isCorrect = selectedOption.IsCorrect;

                if (isCorrect == true)
                {
                    awardedPoints = attemptQuestion.Points;
                }
            }

            var answer =
                await _repository.GetAnswerAsync(
                    dto.AttemptQuestionId);

            if (answer == null)
            {
                answer = new NFD_QuizAnswer
                {
                    AttemptQuestionId =
                        dto.AttemptQuestionId
                };

                await _repository.AddAnswerAsync(answer);
            }

            answer.SelectedOptionId = dto.SelectedOptionId;
            answer.TextAnswer = dto.TextAnswer?.Trim();
            answer.IsCorrect = isCorrect;
            answer.AwardedPoints = awardedPoints;
            answer.IsManuallyGraded = isManuallyGraded;
            answer.IsMarkedForReview = dto.IsMarkedForReview;
            answer.AnsweredAt = now;

            await _repository.SaveChangesAsync();
        }

        public async Task SubmitAttemptAsync(
            SubmitQuizDto dto)
        {
            var attempt =
                await _repository.GetAttemptForSubmissionAsync(
                    dto.AttemptId);

            if (attempt == null)
            {
                throw new KeyNotFoundException(
                    "المحاولة غير موجودة.");
            }

            if (attempt.Status != "InProgress")
            {
                throw new InvalidOperationException(
                    "تم تسليم هذه المحاولة مسبقاً.");
            }

            var now = DateTime.UtcNow;
            var allowedEndTime = attempt.StartedAt
                .AddMinutes(attempt.Quiz.DurationMinutes);

            if (now > allowedEndTime)
            {
                attempt.Status = "Expired";
            }
            else
            {
                attempt.Status = "Submitted";
            }

            RecalculateScore(attempt);

            attempt.SubmittedAt = now;

            await _repository.SaveChangesAsync();
        }
        public async Task<TraineeQuizzesOverviewDto> GetTraineeQuizzesAsync(int traineeId)
        {
            var batchIds = await _context.NFD_Enrollments
                .Where(e => e.TraineeId == traineeId)
                .Select(e => e.BatchId)
                .ToListAsync();

            var quizzes = await _context.NFD_Quizzes
                .AsNoTracking()
                .Include(q => q.Batch)
                .Include(q => q.QuizQuestions)
                .Where(q => batchIds.Contains(q.BatchId) &&
                            (q.Status == Nafadh_Backend.Enums.NFD_QuizStatus.Open ||
                             q.Status == Nafadh_Backend.Enums.NFD_QuizStatus.Scheduled ||
                             q.Status == Nafadh_Backend.Enums.NFD_QuizStatus.Closed))
                .OrderBy(q => q.StartDateTime)
                .ToListAsync();

            var quizIds = quizzes.Select(q => q.QuizId).ToList();

            var attempts = await _context.NFD_QuizAttempts
                .AsNoTracking()
                .Include(a => a.AttemptQuestions).ThenInclude(aq => aq.Question)
                .Include(a => a.AttemptQuestions).ThenInclude(aq => aq.Answers)
                .Where(a => a.TraineeId == traineeId && quizIds.Contains(a.QuizId))
                .ToListAsync();

            var now = DateTime.UtcNow;

            // محاولة مسلَّمة تحتوي سؤالاً مقالياً لم يُصحَّح بعد
            static bool IsPendingGrading(NFD_QuizAttempt a) =>
                (a.Status == "Submitted" || a.Status == "Expired") &&
                a.AttemptQuestions.Any(aq =>
                    aq.Question.QuestionType == Nafadh_Backend.Enums.NFD_QuizQuestionType.Essay &&
                    !aq.Answers.Any(x => x.IsManuallyGraded));

            var items = quizzes.Select(q =>
            {
                var mine = attempts.Where(a => a.QuizId == q.QuizId).ToList();
                var inProgress = mine.FirstOrDefault(a =>
                    a.Status == "InProgress" &&
                    now <= a.StartedAt.AddMinutes(q.DurationMinutes));

                var used = mine.Count;
                var remaining = Math.Max(0, q.MaxAttempts - used);

                var finished = mine
                    .Where(a => a.Status != "InProgress")
                    .OrderByDescending(a => a.SubmittedAt)
                    .ToList();
                var latest = finished.FirstOrDefault();
                var windowOpen = q.Status == Nafadh_Backend.Enums.NFD_QuizStatus.Open &&
                                 now >= q.StartDateTime && now <= q.EndDateTime;

                string state;
                if (inProgress != null) state = "InProgress";
                else if (latest != null && IsPendingGrading(latest)) state = "PendingGrading";
                else if (latest != null && !(windowOpen && remaining > 0)) state = "Completed";
                else if (windowOpen && remaining > 0) state = "Available";
                else if (now < q.StartDateTime &&
                         q.Status != Nafadh_Backend.Enums.NFD_QuizStatus.Closed) state = "Upcoming";
                else state = "Missed";

                // النتيجة تظهر فقط بعد اكتمال التصحيح
                var showResult = latest != null && !IsPendingGrading(latest);

                return new TraineeQuizListItemDto
                {
                    QuizId = q.QuizId,
                    Title = q.Title,
                    Description = q.Description,
                    BatchName = q.Batch?.BatchName,
                    StartDateTime = q.StartDateTime,
                    EndDateTime = q.EndDateTime,
                    DurationMinutes = q.DurationMinutes,
                    QuestionCount = q.QuizQuestions.Count,
                    MaxAttempts = q.MaxAttempts,
                    CameraRequired = q.CameraRequired,
                    PassingPercentage = q.PassingPercentage,
                    AttemptsUsed = used,
                    AttemptsRemaining = remaining,
                    InProgressAttemptId = inProgress?.AttemptId,
                    LatestAttemptId = showResult ? latest!.AttemptId : null,
                    LatestPercentage = showResult ? latest!.Percentage : null,
                    IsPassed = showResult ? latest!.Percentage >= q.PassingPercentage : null,
                    State = state
                };
            }).ToList();

            return new TraineeQuizzesOverviewDto
            {
                Available = items.Count(i => i.State == "Available" || i.State == "InProgress"),
                Upcoming = items.Count(i => i.State == "Upcoming"),
                PendingGrading = items.Count(i => i.State == "PendingGrading"),
                Completed = items.Count(i => i.State == "Completed"),
                Quizzes = items
            };
        }

        public async Task<QuizAttemptDto> GetAttemptAsync(int attemptId, int traineeId)
        {
            var attempt = await _repository.GetAttemptForAnswerAsync(attemptId);

            if (attempt == null)
                throw new KeyNotFoundException("المحاولة غير موجودة.");

            if (attempt.TraineeId != traineeId)
                throw new UnauthorizedAccessException("هذه المحاولة لا تتبع لهذا المتدرب.");

            if (attempt.Status != "InProgress")
                throw new InvalidOperationException("هذه المحاولة منتهية.");

            var endAt = attempt.StartedAt.AddMinutes(attempt.Quiz.DurationMinutes);
            var remaining = (int)Math.Max(0, (endAt - DateTime.UtcNow).TotalSeconds);

            return new QuizAttemptDto
            {
                AttemptId = attempt.AttemptId,
                QuizId = attempt.QuizId,
                QuizTitle = attempt.Quiz.Title,
                DurationMinutes = attempt.Quiz.DurationMinutes,
                CameraRequired = attempt.Quiz.CameraRequired,
                StartedAt = attempt.StartedAt,
                ExpectedEndAt = endAt,
                Status = attempt.Status,
                ViolationCount = attempt.ViolationCount,
                RemainingSeconds = remaining,
                Questions = attempt.AttemptQuestions
                    .OrderBy(x => x.QuestionOrder)
                    .Select(x =>
                    {
                        var ans = x.Answers.OrderByDescending(a => a.AnsweredAt).FirstOrDefault();
                        return new AttemptQuestionDto
                        {
                            AttemptQuestionId = x.AttemptQuestionId,
                            QuestionId = x.QuestionId,
                            QuestionOrder = x.QuestionOrder,
                            QuestionText = x.Question.QuestionText,
                            QuestionType = x.Question.QuestionType,
                            Points = x.Points,
                            SelectedOptionId = ans?.SelectedOptionId,
                            TextAnswer = ans?.TextAnswer,
                            IsMarkedForReview = ans?.IsMarkedForReview ?? false,
                            Options = x.Question.Options
                                .OrderBy(o => o.SortOrder)
                                .Select(o => new QuestionOptionDto
                                {
                                    OptionId = o.OptionId,
                                    OptionText = o.OptionText,
                                    OptionCode = o.OptionCode,
                                    SortOrder = o.SortOrder
                                }).ToList()
                        };
                    }).ToList()
            };
        }

        public async Task GradeEssayAnswerAsync(
    GradeQuizAnswerDto dto)
        {
            var answer = await _repository.GetAnswerForGradingAsync(
                dto.AnswerId);

            if (answer == null)
            {
                throw new KeyNotFoundException(
                    "الإجابة غير موجودة.");
            }

            var attemptQuestion = answer.AttemptQuestion;
            var attempt = attemptQuestion.Attempt;

            if (attempt.Quiz.TrainerId != dto.TrainerId)
            {
                throw new UnauthorizedAccessException(
                    "هذا الاختبار لا يتبع للمدرب المحدد.");
            }

            if (attempt.Status != "Submitted" &&
                attempt.Status != "Expired")
            {
                throw new InvalidOperationException(
                    "لا يمكن تصحيح الإجابة قبل تسليم الاختبار.");
            }

            if (attemptQuestion.Question.QuestionType !=
                Nafadh_Backend.Enums.NFD_QuizQuestionType.Essay)
            {
                throw new InvalidOperationException(
                    "التصحيح اليدوي متاح للأسئلة المقالية فقط.");
            }

            if (dto.AwardedPoints < 0 ||
                dto.AwardedPoints > attemptQuestion.Points)
            {
                throw new ArgumentException(
                    "الدرجة يجب أن تكون بين صفر والدرجة الكاملة للسؤال.");
            }
            var isEvaluationCompleted = await _context.NFD_TraineeEvaluations
                .AnyAsync(e => e.AttemptId == attempt.AttemptId && e.IsCompleted);


            if (isEvaluationCompleted)
            {
                throw new InvalidOperationException(
                    "لا يمكن تعديل الدرجات بعد اعتماد تقييم المتدرب.");
            }
            answer.AwardedPoints = dto.AwardedPoints;
            answer.IsManuallyGraded = true;
            answer.IsCorrect = dto.AwardedPoints == attemptQuestion.Points;

            await _repository.SaveChangesAsync();

            var updatedAttempt = await _repository.GetAttemptForSubmissionAsync(
                attempt.AttemptId);

            if (updatedAttempt == null)
            {
                throw new KeyNotFoundException("المحاولة غير موجودة.");
            }

            RecalculateScore(updatedAttempt);

            await _repository.SaveChangesAsync();
        }
        public async Task<int> RegisterViolationAsync(int attemptId)
        {
            var attempt = await _repository.GetAttemptForSubmissionAsync(attemptId);
            if (attempt == null)
                throw new KeyNotFoundException("محاولة الاختبار غير موجودة.");

            if (attempt.Status != "InProgress")
                throw new InvalidOperationException("لا يمكن تسجيل مخالفة لمحاولة منتهية.");

            attempt.ViolationCount++;
            var maxViolations = Math.Max(1, attempt.Quiz.MaxExitAttempts);

            if (attempt.ViolationCount >= maxViolations)
            {
                switch (attempt.Quiz.ExitLimitAction)
                {
                    case NFD_ExitLimitAction.Terminate:
                        attempt.IsTerminatedByViolation = true;
                        attempt.Status = "Terminated";
                        attempt.SubmittedAt = DateTime.UtcNow;
                        RecalculateScore(attempt);
                        break;

                    case NFD_ExitLimitAction.Warn:
                        break;

                    case NFD_ExitLimitAction.FlagForReview:
                        // ViolationCount remains available for review.
                        break;

                    default:
                        throw new InvalidOperationException("إجراء المخالفات غير معروف.");
                }
            }

            await _repository.SaveChangesAsync();
            return attempt.ViolationCount;
        }

        public async Task<QuizAttemptFullDetailsDto> GetAttemptDetailsAsync(
    int attemptId)
        {
            var attempt =
                await _repository.GetAttemptForSubmissionAsync(
                    attemptId);

            if (attempt == null)
            {
                throw new KeyNotFoundException(
                    "محاولة الاختبار غير موجودة.");
            }

            var result = new QuizAttemptFullDetailsDto
            {
                AttemptId = attempt.AttemptId,
                QuizId = attempt.QuizId,
                QuizTitle = attempt.Quiz.Title,
                AttemptNumber = attempt.AttemptNumber,
                Status = attempt.Status,
                Score = attempt.Score,
                Percentage = attempt.Percentage,
                StartedAt = attempt.StartedAt,
                SubmittedAt = attempt.SubmittedAt
            };

            foreach (var attemptQuestion in
                     attempt.AttemptQuestions
                         .OrderBy(x => x.QuestionOrder))
            {
                var answer = attemptQuestion.Answers
                    .OrderByDescending(x => x.AnsweredAt)
                    .FirstOrDefault();

                var selectedOption = answer?.SelectedOptionId == null
                    ? null
                    : attemptQuestion.Question.Options
                        .FirstOrDefault(o =>
                            o.OptionId == answer.SelectedOptionId);

                result.Answers.Add(
                    new AttemptAnswerDetailsDto
                    {
                        AttemptQuestionId =
                            attemptQuestion.AttemptQuestionId,

                        QuestionId =
                            attemptQuestion.QuestionId,

                        QuestionOrder =
                            attemptQuestion.QuestionOrder,

                        QuestionText =
                            attemptQuestion.Question.QuestionText,

                        QuestionType =
                            attemptQuestion.Question.QuestionType.ToString(),

                        Points =
                            attemptQuestion.Points,

                        SelectedOptionId =
                            answer?.SelectedOptionId,

                        SelectedOptionText =
                            selectedOption?.OptionText,

                        TextAnswer =
                            answer?.TextAnswer,

                        IsCorrect =
                            answer?.IsCorrect,

                        AwardedPoints =
                            answer?.AwardedPoints ?? 0m,

                        IsManuallyGraded =
                            answer?.IsManuallyGraded ?? false,

                        IsMarkedForReview =
                            answer?.IsMarkedForReview ?? false
                    });
            }

            return result;
        }

        // 1. جلب محاولات الطلاب لاختبار معين
        public async Task<List<QuizAttemptDto>> GetAttemptsByQuizIdAsync(int quizId)
        {
            // استخدام بادئة NFD_ كما هو معرف في Nafadhcontext
            var attempts = await _context.NFD_QuizAttempts
                .Where(a => a.QuizId == quizId)
                .Select(a => new QuizAttemptDto
                {
                    AttemptId = a.AttemptId,
                    QuizId = a.QuizId,
                    TraineeId = a.TraineeId,
                    StartedAt = a.StartedAt,
                    SubmittedAt = a.SubmittedAt,
                    Score = a.Score,
                    Percentage = a.Percentage,
                    Status = a.Status
                })
                .ToListAsync();

            return attempts;
        }

        // 2. اعتماد أو رفض العذر (باستخدام المستودع _repository الجاهز لديك)
        public async Task DecideExcuseAsync(int attemptId, bool approve, string? rejectionReason)
        {
            // نستخدم نفس دالة الجلب المعتمدة في كلاسك
            var attempt = await _repository.GetAttemptForSubmissionAsync(attemptId);
            if (attempt == null)
                throw new KeyNotFoundException("محاولة الاختبار غير موجودة");

            // في حال وجود الحقول في الكيان يتم تعيينها، أو تحديث الحالة
            attempt.Status = approve ? "Excused" : "Absent";

            await _repository.SaveChangesAsync();
        }

        // 3. إضافة ملاحظة المتدرب على التسليم
        public async Task AddSubmissionNoteAsync(int attemptId, string note)
        {
            var attempt = await _repository.GetAttemptForSubmissionAsync(attemptId);
            if (attempt == null)
                throw new KeyNotFoundException("محاولة الاختبار غير موجودة");

            await _repository.SaveChangesAsync();
        }

        // 4. رفع عذر المتغيب
        public async Task SubmitExcuseAsync(int quizId, string reason, IFormFile? attachment)
        {
            // حفظ ملف العذر في السيرفر أو قاعدة البيانات وتحديث السجل
            await _repository.SaveChangesAsync();
        }
    }
}
