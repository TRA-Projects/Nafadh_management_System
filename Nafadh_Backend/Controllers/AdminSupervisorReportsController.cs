
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/admin/reports/supervisors")]
    public class AdminSupervisorReportsController : ControllerBase
    {
        private readonly IAdminSupervisorReportsService _service;

        public AdminSupervisorReportsController(
            IAdminSupervisorReportsService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetSupervisorReports(
            [FromQuery] int? year,
            [FromQuery] int? month)
        {
            var now = DateTime.UtcNow;

            int selectedYear = year ?? now.Year;
            int selectedMonth = month ?? now.Month;

            if (selectedYear < 1 || selectedYear > 9999 ||
                selectedMonth < 1 || selectedMonth > 12 ||
                (selectedYear == 9999 && selectedMonth == 12))
            {
                return BadRequest("Invalid year or month.");
            }

            var monthStart = new DateTime(
                selectedYear, selectedMonth, 1);

            var nextMonthStart = monthStart.AddMonths(1);

            var reports = await _service.GetSupervisorReportsAsync(
                monthStart,
                nextMonthStart);

            return Ok(reports);
        }
    }
}
