
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/system-variables")]
    public class SystemVariablesController : ControllerBase
    {
        private readonly Nafadhcontext _context;

        public SystemVariablesController(Nafadhcontext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var variables = await _context.SystemVariables
                .AsNoTracking()
                .OrderBy(v => v.Id)
                .ToListAsync();

            return Ok(variables);
        }

        [HttpGet("{key}")]
        public async Task<IActionResult> GetByKey(string key)
        {
            var variable = await _context.SystemVariables
                .AsNoTracking()
                .FirstOrDefaultAsync(v => v.VariableKey == key);

            if (variable == null)
                return NotFound();

            return Ok(variable);
        }
    }
}
