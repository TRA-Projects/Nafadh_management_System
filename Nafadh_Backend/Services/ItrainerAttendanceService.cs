using Microsoft.AspNetCore.Http;
using Nafadh_Backend.DTOs;

namespace Nafadh_Backend.Services
{
    public interface ITrainerAttendanceService
    {
        Task<List<CompanyTrainerDto>> GetCompanyTrainersAsync(int companyId, DateTime date);

        Task<List<TrainerAttendanceDto>> GetRangeAsync(int companyId, DateTime from, DateTime to, int? trainerId);

        // Get trainer attendance records for Admin reports
        Task<List<AdminTrainerAttendanceDto>> GetAdminRangeAsync(DateTime from, DateTime to, int? trainerId, int? companyId);
        Task<TrainerAttendanceDto> UpsertAsync(TrainerAttendanceUpsertDto dto);

        // Returns the public URL of the saved proof, or null when the record does not exist.
        Task<string?> UploadProofAsync(int attendanceId, IFormFile file);

        // Returns false when the record does not exist.
        Task<bool> RemoveProofAsync(int attendanceId);

        // Trainer-only: verify ownership before changing an excuse or proof.
        Task<bool> TrainerOwnsAttendanceAsync(int attendanceId, int trainerId);

        // Trainer-only: submit the explanation within the Sunday–Saturday window.
        Task<TrainerAttendanceDto?> SubmitExcuseAsync(int attendanceId, int trainerId, string? reason);

        // Supervisor-only: make a single decision on a submitted excuse.
        Task<TrainerAttendanceDto?> ReviewExcuseAsync(int attendanceId, int companyId, string decision, int reviewerUserId);

        // Confirms the whole day for the company. Returns how many records the day contains.
        Task<int> ConfirmDayAsync(TrainerAttendanceConfirmDto dto);
        Task<List<TrainerAttendanceDto>> GetMyAttendanceAsync(int trainerId);
        Task<int?> GetTrainerIdByUserIdAsync(int userId);
        Task<bool> IsExcuseWindowOpenAsync(int attendanceId, int trainerId);
    }
}