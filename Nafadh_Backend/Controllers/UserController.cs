
// Implemented by Noura

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UserController : ControllerBase
    {
        private readonly IUserService _service;

        public UserController(IUserService service)
        {
            _service = service;
        }

        /// Create a new user account.</summary>
        [HttpPost("register")]
        [AllowAnonymous]
        [ProducesResponseType(typeof(UserResponseDTO), StatusCodes.Status201Created)]
        public async Task<ActionResult<UserResponseDTO>> Register([FromBody] UserRegisterationDTO dto)
        {
            var created = await _service.RegisterAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = created.UserId }, created);
        }

   
     


  

   

      
        
    }
}
