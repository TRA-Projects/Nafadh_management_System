// Implemented by Noura

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PermissionController : ControllerBase
    {
        private readonly IPermissionService _service;

        public PermissionController(IPermissionService service)
        {
            _service = service;
        }

        //List all fine-grained permissions.
        [HttpGet]
        [ProducesResponseType(typeof(List<PermissionDTO>), StatusCodes.Status200OK)]
        public async Task<ActionResult<List<PermissionDTO>>> GetAll()
        {
            var permissions = await _service.GetAllAsync();
            return Ok(permissions);
        }


        
       
    }
}
