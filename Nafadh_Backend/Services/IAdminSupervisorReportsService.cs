
using Nafadh_Backend.DTOs;

namespace Nafadh_Backend.Services
{
    public interface IAdminSupervisorReportsService
    {
        Task<List<AdminSupervisorReportDto>> GetSupervisorReportsAsync(
            DateTime monthStart,
            DateTime nextMonthStart);
    }
}
