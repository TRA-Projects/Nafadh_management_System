
using Nafadh_Backend.DTOs;

namespace Nafadh_Backend.Interfaces
{
    public interface IAdminSupervisorReportsRepository
    {
        Task<List<AdminSupervisorReportDto>>
            GetSupervisorReportsAsync(
                DateTime monthStart,
                DateTime nextMonthStart);
    }
}
