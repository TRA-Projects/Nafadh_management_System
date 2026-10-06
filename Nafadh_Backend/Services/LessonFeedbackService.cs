

using Nafadh_Backend.DTOs;
using Nafadh_Backend.Exceptions;
using Nafadh_Backend.Interfaces;
using Nafadh_Backend.Models;
using Nafadh_Backend.Repositories;

namespace Nafadh_Backend.Services
{
    public class LessonFeedbackService : ILessonFeedbackService
    {
        private readonly ILessonFeedbackRepository _repository;
        private readonly ITraineeRepository _traineeRepository;

        public LessonFeedbackService(
            ILessonFeedbackRepository repository,
            ITraineeRepository traineeRepository)
        {
            _repository = repository;
            _traineeRepository = traineeRepository;
        }

        public async Task<LessonFeedbackResponseDTO?> GetAsync(
            int userId,
            int lessonId)
        {
            var trainee = await GetTraineeAsync(userId);

            var feedback = await _repository.GetByTraineeAndLessonAsync(
                trainee.TraineeId,
                lessonId);

            if (feedback == null)
            {
                return null;
            }

            return MapToResponseDTO(feedback);
        }

        public async Task<LessonFeedbackResponseDTO> CreateAsync(
            int userId,
            int lessonId,
            LessonFeedbackCreateDTO dto)
        {
            ValidateFeedback(dto.Note, dto.Rating);

            // Check lesson exists
            if (!await _repository.LessonExistsAsync(lessonId))
            {
                throw new NotFoundException(
                    $"Lesson {lessonId} was not found.");
            }

            // Get trainee from logged-in user
            var trainee = await GetTraineeAsync(userId);

            // Check if feedback already exists
            var existing =
                await _repository.GetByTraineeAndLessonAsync(
                    trainee.TraineeId,
                    lessonId);

            if (existing != null)
            {
                throw new ConflictException(
                    "Feedback for this lesson already exists.");
            }

            var feedback = new NFD_LessonFeedback
            {
                LessonId = lessonId,
                TraineeId = trainee.TraineeId,

                Note = string.IsNullOrWhiteSpace(dto.Note)
                    ? null
                    : dto.Note.Trim(),

                Rating = dto.Rating,

                CreatedAt = DateTime.UtcNow
            };

            var created = await _repository.AddAsync(feedback);

            return MapToResponseDTO(created);
        }

        public async Task<LessonFeedbackResponseDTO> UpdateAsync(
            int userId,
            int lessonId,
            LessonFeedbackUpdateDTO dto)
        {
            ValidateFeedback(dto.Note, dto.Rating);

            var trainee = await GetTraineeAsync(userId);

            var feedback =
                await _repository.GetByTraineeAndLessonAsync(
                    trainee.TraineeId,
                    lessonId);

            if (feedback == null)
            {
                throw new NotFoundException(
                    "Feedback for this lesson was not found.");
            }

            feedback.Note = string.IsNullOrWhiteSpace(dto.Note)
                ? null
                : dto.Note.Trim();

            feedback.Rating = dto.Rating;

            feedback.UpdatedAt = DateTime.UtcNow;

            await _repository.UpdateAsync(feedback);

            return MapToResponseDTO(feedback);
        }

        private async Task<NFD_Trainee> GetTraineeAsync(int userId)
        {
            var trainee =
                await _traineeRepository.GetTraineeIdByUserID(userId);

            if (trainee == null)
            {
                throw new NotFoundException(
                    $"Trainee profile for user {userId} was not found.");
            }

            return trainee;
        }

        private static void ValidateFeedback(
            string? note,
            int? rating)
        {
            var hasNote = !string.IsNullOrWhiteSpace(note);
            var hasRating = rating.HasValue;

            // At least one of Note or Rating must be provided
            if (!hasNote && !hasRating)
            {
                throw new ValidationException(
                    "At least a note or a rating is required.");
            }

            // Rating must be between 1 and 5
            if (rating.HasValue &&
                (rating.Value < 1 || rating.Value > 5))
            {
                throw new ValidationException(
                    "Rating must be between 1 and 5.");
            }
        }

        private static LessonFeedbackResponseDTO MapToResponseDTO(
            NFD_LessonFeedback feedback)
        {
            return new LessonFeedbackResponseDTO
            {
                LessonFeedbackId = feedback.LessonFeedbackId,
                LessonId = feedback.LessonId,
                TraineeId = feedback.TraineeId,
                Note = feedback.Note,
                Rating = feedback.Rating,
                CreatedAt = feedback.CreatedAt,
                UpdatedAt = feedback.UpdatedAt
            };
        }
    }
}
