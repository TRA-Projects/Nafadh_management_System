using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CompanyController : ControllerBase
    {
        private readonly ICompanyService _service;

        public CompanyController(ICompanyService service)
        {
            _service = service;
        }

        // =========================================================================
        // 1. GET: api/Company (مع دعم البحث الفوري من أول حرف والمدينة والترتيب)
        // =========================================================================
        [HttpGet]
        public async Task<ActionResult<IEnumerable<NFD_CompanyOutputDTO>>> GetCompanies(
            [FromQuery] NFD_CompanyStatus? status,
            [FromQuery] string? workField,
            [FromQuery] string? city,
            [FromQuery] string? search,
            [FromQuery] string? sort)
        {
            var companies = await _service.GetCompaniesAsync(
                status,
                workField,
                city,
                search,
                sort);

            return Ok(companies);
        }

        // =========================================================================
        // 2. GET: api/Company/{companyId}
        // =========================================================================
        [HttpGet("{companyId}")]
        public async Task<ActionResult<NFD_CompanyOutputDTO>> GetCompanyById(int companyId)
        {
            var company = await _service.GetCompanyByIdAsync(companyId);

            if (company == null)
            {
                return NotFound(new { message = "Company not found." });
            }

            return Ok(company);
        }

        // =========================================================================
        // 3. GET: api/Company/{companyId}/details (ملء الشاشة مع الإنذارات والمشرف والملاحظات)
        // =========================================================================
        [HttpGet("{companyId}/details")]
        public async Task<ActionResult<object>> GetCompanyFullDetails(int companyId)
        {
            var details = await _service.GetCompanyFullDetailsAsync(companyId);

            if (details == null)
            {
                return NotFound(new { message = "Company not found." });
            }

            return Ok(details);
        }

        // =========================================================================
        // 4. POST: api/Company (إضافة شركة جديدة)
        // =========================================================================
        [HttpPost]
        public async Task<ActionResult<NFD_CompanyOutputDTO>> AddCompany([FromBody] NFD_CompanyInputDTO dto)
        {
            var (company, error) = await _service.AddCompanyAsync(dto);

            if (error is not null)
                return BadRequest(new { message = error });

            return CreatedAtAction(
                nameof(GetCompanyById),
                new { companyId = company!.CompanyId },
                company
            );
        }

        // =========================================================================
        // 5. PUT: api/Company/{companyId} (تحديث بيانات الشركة)
        // =========================================================================
        [HttpPut("{companyId}")]
        public async Task<ActionResult<NFD_CompanyOutputDTO>> UpdateCompany(
            int companyId,
            [FromBody] NFD_CompanyInputDTO dto)
        {
            var company = await _service.UpdateCompanyAsync(companyId, dto);

            if (company == null)
            {
                return NotFound(new { message = "Company not found." });
            }

            return Ok(company);
        }

        // =========================================================================
        // 6. PUT: api/Company/{companyId}/approve (اعتماد الشركة)
        // =========================================================================
        [HttpPut("{companyId}/approve")]
        public async Task<ActionResult<NFD_CompanyOutputDTO>> ApproveCompany(int companyId)
        {
            var company = await _service.ApproveCompanyAsync(companyId);

            if (company == null)
            {
                return NotFound(new { message = "Company not found." });
            }

            return Ok(company);
        }

        // =========================================================================
        // 7. PUT: api/Company/{companyId}/suspend (إيقاف / تعليق الشركة)
        // =========================================================================
        [HttpPut("{companyId}/suspend")]
        public async Task<ActionResult<NFD_CompanyOutputDTO>> SuspendCompany(int companyId)
        {
            var company = await _service.SuspendCompanyAsync(companyId);

            if (company == null)
            {
                return NotFound(new { message = "Company not found." });
            }

            return Ok(company);
        }

        // =========================================================================
        // 8. PUT: api/Company/{companyId}/reject (جديدة: رفض الشركة مع حفظ سبب الرفض)
        // =========================================================================
        [HttpPut("{companyId}/reject")]
        public async Task<ActionResult<NFD_CompanyOutputDTO>> RejectCompany(
            int companyId,
            [FromBody] RejectCompanyDTO dto)
        {
            var company = await _service.RejectCompanyAsync(companyId, dto.RejectionReason);

            if (company == null)
            {
                return NotFound(new { message = "Company not found." });
            }

            return Ok(company);
        }

        // =========================================================================
        // 9. GET: api/Company/{companyId}/warnings (جديدة: جلب إنذارات الشركة)
        // =========================================================================
        [HttpGet("{companyId}/warnings")]
        public async Task<ActionResult<IEnumerable<object>>> GetCompanyWarnings(int companyId)
        {
            var warnings = await _service.GetCompanyWarningsAsync(companyId);
            return Ok(warnings);
        }

        // =========================================================================
        // 10. POST: api/Company/{companyId}/warnings (جديدة: إصدار إنذار جديد للشركة)
        // =========================================================================
        [HttpPost("{companyId}/warnings")]
        public async Task<ActionResult<object>> AddCompanyWarning(
            int companyId,
            [FromBody] CreateCompanyWarningDTO dto)
        {
            var warning = await _service.AddCompanyWarningAsync(companyId, dto);
            return Ok(warning);
        }

        // =========================================================================
        // 11. GET: api/Company/{companyId}/capacity
        // =========================================================================
        [HttpGet("{companyId}/capacity")]
        public async Task<ActionResult<object>> GetCompanyCapacity(int companyId)
        {
            var capacity = await _service.GetCompanyCapacityAsync(companyId);

            if (capacity == null)
            {
                return NotFound(new { message = "Company not found." });
            }

            return Ok(capacity);
        }

        // =========================================================================
        // 12. DELETE: api/Company/{companyId}
        // =========================================================================
        [HttpDelete("{companyId}")]
        public async Task<IActionResult> DeleteCompany(int companyId)
        {
            var deleted = await _service.DeleteCompanyAsync(companyId);

            if (!deleted)
            {
                return NotFound(new { message = "Company not found." });
            }

            return NoContent();
        }
    }

    // DTOs السريعة للرفض والإنذار (يمكنك وضعها هنا أو داخل مجلد DTOs):
    public class RejectCompanyDTO
    {
        public string RejectionReason { get; set; } = string.Empty;
    }

    public class CreateCompanyWarningDTO
    {
        public int Level { get; set; } = 1;
        public string Evidence { get; set; } = string.Empty;
        public string? Resolution { get; set; }
        public int? RaisedByUserId { get; set; }
    }
}