using Microsoft.AspNetCore.Http;
using Nafadh_Backend.DTOs;

namespace Nafadh_Backend.Services
{
    public interface ITrainerAttendanceService
    {
        Task<List<CompanyTrainerDto>> GetCompanyTrainersAsync(int companyId);

        Task<List<TrainerAttendanceDto>> GetRangeAsync(int companyId, DateTime from, DateTime to, int? trainerId);

        Task<TrainerAttendanceDto> UpsertAsync(TrainerAttendanceUpsertDto dto);

        // Returns the public URL of the saved proof, or null when the record does not exist.
        Task<string?> UploadProofAsync(int attendanceId, IFormFile file);

        // Returns false when the record does not exist.
        Task<bool> RemoveProofAsync(int attendanceId);

        // Confirms the whole day for the company. Returns how many records the day contains.
        Task<int> ConfirmDayAsync(TrainerAttendanceConfirmDto dto);
    }
}