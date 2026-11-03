
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/system-variables")]
    [Authorize(Roles = "Admin")]
    public class SystemVariablesController : ControllerBase
    {
        private readonly Nafadhcontext _context;

        public SystemVariablesController(Nafadhcontext context)
        {
            _context = context;
        }

        // GET: api/system-variables
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var variables = await _context.SystemVariables
                .AsNoTracking()
                .OrderBy(v => v.Id)
                .ToListAsync();

            return Ok(variables);
        }

        // GET: api/system-variables/{key}
        [HttpGet("{key}")]
        public async Task<IActionResult> GetByKey(string key)
        {
            var variable = await _context.SystemVariables
                .AsNoTracking()
                .FirstOrDefaultAsync(v => v.VariableKey == key);

            if (variable == null)
                return NotFound(new { message = "Setting not found." });

            return Ok(variable);
        }

        // PUT: api/system-variables/{key}
        [HttpPut("{key}")]
        public async Task<IActionResult> Update(
            string key,
            [FromBody] UpdateSystemVariableRequest request)
        {
            if (request == null || request.Value == null)
                return BadRequest(new { message = "Value is required." });

            var variable = await _context.SystemVariables
                .FirstOrDefaultAsync(v => v.VariableKey == key);

            if (variable == null)
                return NotFound(new { message = "Setting not found." });

            var value = request.Value.Trim();

            if (variable.ValueType.Equals(
                "Integer", StringComparison.OrdinalIgnoreCase))
            {
                if (!int.TryParse(value, out _))
                    return BadRequest(new { message = "Value must be an integer." });
            }
            else if (variable.ValueType.Equals(
                "Boolean", StringComparison.OrdinalIgnoreCase))
            {
                if (!bool.TryParse(value, out _))
                    return BadRequest(new { message = "Value must be true or false." });
            }
            else if (variable.ValueType.Equals(
                "Time", StringComparison.OrdinalIgnoreCase))
            {
                if (!TimeOnly.TryParse(value, out _))
                    return BadRequest(new { message = "Invalid time value." });
            }
            else if (variable.ValueType.Equals(
                "Json", StringComparison.OrdinalIgnoreCase))
            {
                try
                {
                    using var document =
                        System.Text.Json.JsonDocument.Parse(value);
                }
                catch (System.Text.Json.JsonException)
                {
                    return BadRequest(new { message = "Invalid JSON value." });
                }
            }

            variable.Value = value;

            await _context.SaveChangesAsync();

            return Ok(new
            {
                message = "Setting updated successfully.",
                variable
            });
        }
    }

    public class UpdateSystemVariableRequest
    {
        [Required]
        public string Value { get; set; } = string.Empty;
    }
}
