using Nafadh_Backend.DTOs;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    public interface IQuestionBankService
    {
        Task<List<QuestionBankListDto>>
            GetTrainerQuestionsAsync(int trainerId);

        Task CreateQuestionAsync(
            CreateQuestionDto dto,
            int trainerId);

        Task DeactivateQuestionAsync(
            int questionId,
            int trainerId);
    }

    public class QuestionBankService
        : IQuestionBankService
    {
        private readonly IQuestionBankRepository _repository;

        public QuestionBankService(
            IQuestionBankRepository repository)
        {
            _repository = repository;
        }

        public async Task<List<QuestionBankListDto>>
            GetTrainerQuestionsAsync(int trainerId)
        {
            var questions =
                await _repository.GetByTrainerIdAsync(trainerId);

            return questions.Select(q =>
                new QuestionBankListDto
                {
                    QuestionId = q.QuestionId,
                    QuestionText = q.QuestionText,
                    QuestionType = q.QuestionType,
                    Difficulty = q.Difficulty,
                    Points = q.Points,
                    Explanation = q.Explanation,
                    IsActive = q.IsActive,
                    CreatedAt = q.CreatedAt,

                    Options = q.Options
                        .OrderBy(o => o.SortOrder)
                        .Select(o => new QuestionOptionDto
                        {
                            OptionId = o.OptionId,
                            OptionText = o.OptionText,
                            OptionCode = o.OptionCode,
                            SortOrder = o.SortOrder
                        })
                        .ToList()
                })
                .ToList();
        }

        public async Task CreateQuestionAsync(
            CreateQuestionDto dto,
            int trainerId)
        {
            ValidateOptions(dto);

            var question = new NFD_QuestionBank
            {
                QuestionText = dto.QuestionText.Trim(),
                QuestionType = dto.QuestionType,
                Difficulty = dto.Difficulty,
                Points = dto.Points,
                Explanation = dto.Explanation?.Trim(),
                TrainerId = trainerId,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            foreach (var optionDto in dto.Options)
            {
                question.Options.Add(
                    new NFD_QuestionOption
                    {
                        OptionText = optionDto.OptionText.Trim(),
                        OptionCode = optionDto.OptionCode.Trim(),
                        SortOrder = optionDto.SortOrder,
                        IsCorrect = optionDto.IsCorrect
                    });
            }

            await _repository.AddAsync(question);
            await _repository.SaveChangesAsync();
        }

        public async Task DeactivateQuestionAsync(
            int questionId,
            int trainerId)
        {
            var question =
                await _repository.GetByIdWithOptionsAsync(questionId);

            if (question == null ||
                question.TrainerId != trainerId)
            {
                throw new KeyNotFoundException(
                    "السؤال غير موجود أو لا تملكين صلاحية تعديله.");
            }

            question.IsActive = false;

            _repository.Update(question);
            await _repository.SaveChangesAsync();
        }

        private static void ValidateOptions(
            CreateQuestionDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto.QuestionText))
            {
                throw new ArgumentException(
                    "نص السؤال مطلوب.");
            }

            if (dto.Options == null ||
                dto.Options.Count == 0)
            {
                throw new ArgumentException(
                    "يجب إضافة خيارات للسؤال.");
            }

            var correctOptions = dto.Options
                .Count(x => x.IsCorrect);

            if (correctOptions != 1)
            {
                throw new ArgumentException(
                    "يجب تحديد إجابة صحيحة واحدة فقط.");
            }
        }
    }
}
