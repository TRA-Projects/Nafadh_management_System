using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Interfaces;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/admin/remediation-requests")]
    public class RemediationRequestsController : ControllerBase
    {
        private readonly IRemediationService _service;

        public RemediationRequestsController(IRemediationService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? searchTerm, [FromQuery] int? status)
        {
            var result = await _service.GetAllRequestsAsync(searchTerm, status);
            return Ok(result);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _service.GetRequestByIdAsync(id);
            if (result == null) return NotFound();
            return Ok(result);
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateRemediationRequestDto dto)
        {
            var result = await _service.CreateRequestAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = result.RequestId }, result);
        }

        [HttpPut("{id}/review")]
        public async Task<IActionResult> Review(int id, [FromBody] ReviewRemediationRequestDto dto)
        {
            var success = await _service.ReviewRequestAsync(id, dto);
            if (!success) return NotFound();
            return Ok(new { message = "تم تحديث حالة الطلب بنجاح" });
        }
    }
}