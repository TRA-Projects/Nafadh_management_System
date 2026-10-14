using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    public class QuestionBankService : IQuestionBankService
    {
        private readonly IQuestionBankRepository _repository;

        public QuestionBankService(
            IQuestionBankRepository repository)
        {
            _repository = repository;
        }

        public async Task<IEnumerable<NFD_QuestionBank>>
            GetTrainerQuestionsAsync(int trainerId)
        {
            return await _repository.GetByTrainerIdAsync(trainerId);
        }

        public async Task<NFD_QuestionBank?>
            GetQuestionByIdAsync(
                int questionId,
                int trainerId)
        {
            var question =
                await _repository.GetByIdAsync(questionId);

            if (question == null)
            {
                return null;
            }

            if (question.TrainerId != trainerId)
            {
                return null;
            }

            return question;
        }

        public async Task<NFD_QuestionBank>
            CreateQuestionAsync(
                NFD_QuestionBank question,
                int trainerId)
        {
            ValidateQuestion(question);

            question.QuestionId = 0;
            question.TrainerId = trainerId;
            question.CreatedAt = DateTime.UtcNow;
            question.IsActive = true;

            if (question.Options == null)
            {
                question.Options =
                    new List<NFD_QuestionOption>();
            }

            foreach (var option in question.Options)
            {
                option.OptionId = 0;
                option.QuestionId = 0;
            }

            await _repository.AddAsync(question);
            await _repository.SaveChangesAsync();

            return question;
        }

        public async Task<bool>
            UpdateQuestionAsync(
                int questionId,
                NFD_QuestionBank updatedQuestion,
                int trainerId)
        {
            ValidateQuestion(updatedQuestion);

            var existingQuestion =
                await _repository.GetByIdAsync(questionId);

            if (existingQuestion == null)
            {
                return false;
            }

            if (existingQuestion.TrainerId != trainerId)
            {
                return false;
            }

            existingQuestion.QuestionText =
                updatedQuestion.QuestionText;

            existingQuestion.QuestionType =
                updatedQuestion.QuestionType;

            existingQuestion.Difficulty =
                updatedQuestion.Difficulty;

            existingQuestion.Points =
                updatedQuestion.Points;

            existingQuestion.Explanation =
                updatedQuestion.Explanation;

            existingQuestion.IsActive =
                updatedQuestion.IsActive;

            existingQuestion.Options.Clear();

            if (updatedQuestion.Options != null)
            {
                foreach (var option in updatedQuestion.Options)
                {
                    existingQuestion.Options.Add(
                        new NFD_QuestionOption
                        {
                            OptionText = option.OptionText,
                            OptionCode = option.OptionCode,
                            SortOrder = option.SortOrder,
                            IsCorrect = option.IsCorrect
                        });
                }
            }

            await _repository.UpdateAsync(existingQuestion);
            await _repository.SaveChangesAsync();

            return true;
        }

        public async Task<bool>
            DeactivateQuestionAsync(
                int questionId,
                int trainerId)
        {
            var question =
                await _repository.GetByIdAsync(questionId);

            if (question == null)
            {
                return false;
            }

            if (question.TrainerId != trainerId)
            {
                return false;
            }

            // تعطيل السؤال بدلاً من حذفه
            // حتى لا تتأثر الاختبارات السابقة
            question.IsActive = false;

            await _repository.UpdateAsync(question);
            await _repository.SaveChangesAsync();

            return true;
        }

        private static void ValidateQuestion(
            NFD_QuestionBank question)
        {
            if (question == null)
            {
                throw new ArgumentNullException(
                    nameof(question));
            }

            if (string.IsNullOrWhiteSpace(
                question.QuestionText))
            {
                throw new ArgumentException(
                    "نص السؤال مطلوب.");
            }

            if (question.Points <= 0)
            {
                throw new ArgumentException(
                    "يجب أن تكون درجة السؤال أكبر من صفر.");
            }

            var options = question.Options
                ?? new List<NFD_QuestionOption>();

            if (question.QuestionType ==
                NFD_QuizQuestionType.MultipleChoice)
            {
                if (options.Count < 2)
                {
                    throw new ArgumentException(
                        "سؤال الاختيار من متعدد يحتاج خيارين على الأقل.");
                }

                if (options.Count(x => x.IsCorrect) != 1)
                {
                    throw new ArgumentException(
                        "يجب تحديد إجابة صحيحة واحدة فقط.");
                }
            }

            if (question.QuestionType ==
                NFD_QuizQuestionType.TrueFalse)
            {
                if (options.Count != 2)
                {
                    throw new ArgumentException(
                        "سؤال True/False يجب أن يحتوي على خيارين فقط.");
                }

                if (options.Count(x => x.IsCorrect) != 1)
                {
                    throw new ArgumentException(
                        "يجب تحديد إجابة صحيحة واحدة فقط.");
                }
            }

            if (question.QuestionType ==
                NFD_QuizQuestionType.Essay)
            {
                question.Options.Clear();
            }

            foreach (var option in options)
            {
                if (string.IsNullOrWhiteSpace(
                    option.OptionText))
                {
                    throw new ArgumentException(
                        "نص الخيار مطلوب.");
                }

                if (string.IsNullOrWhiteSpace(
                    option.OptionCode))
                {
                    throw new ArgumentException(
                        "رمز الخيار مطلوب.");
                }
            }
        }
    }
}
