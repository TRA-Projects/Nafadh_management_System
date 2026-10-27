using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/admin/reports/trainer-attendance")]
   
    public class AdminTrainerAttendanceController:ControllerBase
    {
        private readonly ITrainerAttendanceService _service;

        public AdminTrainerAttendanceController(
            ITrainerAttendanceService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetTrainerAttendance(
            [FromQuery] DateTime? from,
            [FromQuery] DateTime? to,
            [FromQuery] int? trainerId,
            [FromQuery] int? companyId)
        {
            if (!from.HasValue || !to.HasValue)
            {
                return BadRequest(new
                {
                    message = "From and to dates are required."
                });
            }

            if (trainerId <= 0 || companyId <= 0)
            {
                return BadRequest(new
                {
                    message = "Invalid trainer or company ID."
                });
            }

            try
            {
                var records = await _service.GetAdminRangeAsync(
                    from.Value,
                    to.Value,
                    trainerId,
                    companyId);

                return Ok(records);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
        }
    }
}
