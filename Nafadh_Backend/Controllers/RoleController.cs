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
    public class RoleController : ControllerBase
    {
        private readonly IRoleService _service;

        public RoleController(IRoleService service)
        {
            _service = service;
        }

        //List roles.
        [HttpGet]
        [ProducesResponseType(typeof(List<RoleDTO>), StatusCodes.Status200OK)]
        public async Task<ActionResult<List<RoleDTO>>> GetAll()
        {
            var roles = await _service.GetAllAsync();
            return Ok(roles);
        }



        
        
    }
}
