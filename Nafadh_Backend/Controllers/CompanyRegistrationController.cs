using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    // Public endpoint: a new company registers itself from the login page
    // ("تسجيل شركة جديدة"). The account stays unusable until an Admin approves.
    [ApiController]
    [Route("api/company-registration")]
    [AllowAnonymous]
    public class CompanyRegistrationController : ControllerBase
    {
        private readonly ICompanyRegistrationService _service;

        public CompanyRegistrationController(ICompanyRegistrationService service)
        {
            _service = service;
        }

        // POST api/company-registration
        [HttpPost]
        [ProducesResponseType(typeof(CompanyRegistrationResultDTO), StatusCodes.Status201Created)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status409Conflict)]
        public async Task<ActionResult<CompanyRegistrationResultDTO>> Register(
            [FromBody] CompanyRegistrationDTO dto)
        {
            var result = await _service.RegisterAsync(dto);
            return StatusCode(StatusCodes.Status201Created, result);
        }
    }
}
