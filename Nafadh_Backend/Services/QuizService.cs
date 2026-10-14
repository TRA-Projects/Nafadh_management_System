using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Nafadh_Backend.Services
{
    public interface IQuizService
    {
        Task<IEnumerable<NFD_Quiz>> GetTrainerQuizzesAsync(int trainerId);
        Task CreateQuizAsync(NFD_Quiz quiz, int trainerId);
        Task UpdateQuizAsync(int id, NFD_Quiz updatedQuiz);
    }

    public class QuizService : IQuizService
    {
        private readonly IQuizRepository _quizRepository;

        public QuizService(IQuizRepository quizRepository)
        {
            _quizRepository = quizRepository;
        }

        public async Task<IEnumerable<NFD_Quiz>> GetTrainerQuizzesAsync(int trainerId)
        {
            return await _quizRepository.GetQuizzesByTrainerIdAsync(trainerId);
        }

        public async Task CreateQuizAsync(NFD_Quiz quiz, int trainerId)
        {
            quiz.TrainerId = trainerId;
            quiz.CreatedAt = DateTime.UtcNow;

            await _quizRepository.AddAsync(quiz);
            await _quizRepository.SaveChangesAsync();
        }

        public async Task UpdateQuizAsync(int id, NFD_Quiz updatedQuiz)
        {
            var quiz = await _quizRepository.GetByIdAsync(id);
            if (quiz == null) throw new Exception("الاختبار غير موجود");

            quiz.Title = updatedQuiz.Title;
            quiz.Description = updatedQuiz.Description;
            quiz.BatchId = updatedQuiz.BatchId;
            quiz.StartDateTime = updatedQuiz.StartDateTime;
            quiz.EndDateTime = updatedQuiz.EndDateTime;
            quiz.DurationMinutes = updatedQuiz.DurationMinutes;
            quiz.Status = updatedQuiz.Status;
            quiz.RandomizeQuestions = updatedQuiz.RandomizeQuestions;
            quiz.MaxAttempts = updatedQuiz.MaxAttempts;
            quiz.CameraRequired = updatedQuiz.CameraRequired;

            await _quizRepository.UpdateAsync(quiz);
            await _quizRepository.SaveChangesAsync();
        }
    }
}