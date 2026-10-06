using Nafadh_Backend.DTOs;

namespace Nafadh_Backend.Interfaces
{
    public interface ILessonFeedbackService
    {
        Task<LessonFeedbackResponseDTO?> GetAsync(
            int userId,
            int lessonId);

        Task<LessonFeedbackResponseDTO> CreateAsync(
            int userId,
            int lessonId,
            LessonFeedbackCreateDTO dto);

        Task<LessonFeedbackResponseDTO> UpdateAsync(
            int userId,
            int lessonId,
            LessonFeedbackUpdateDTO dto);
    }
}