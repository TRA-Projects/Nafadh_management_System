
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Interfaces;

namespace Nafadh_Backend.Services
{
    public class AdminSupervisorReportsService
        : IAdminSupervisorReportsService
    {
        private readonly IAdminSupervisorReportsRepository _repository;

        public AdminSupervisorReportsService(
            IAdminSupervisorReportsRepository repository)
        {
            _repository = repository;
        }

        public async Task<List<AdminSupervisorReportDto>> GetSupervisorReportsAsync(
            DateTime monthStart,
            DateTime nextMonthStart)
        {
            return await _repository.GetSupervisorReportsAsync(
                monthStart,
                nextMonthStart);
        }
    }
}
