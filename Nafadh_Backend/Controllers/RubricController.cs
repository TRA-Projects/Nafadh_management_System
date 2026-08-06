using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Models;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{

    [Route("api/[controller]")]
    [ApiController]
    public class RubricController : ControllerBase
    {

        private readonly IRubricService _service;


        public RubricController(IRubricService service)
        {
            _service = service;
        }




        // GET: api/Rubric/task/{taskId}
        // Rubric criteria for a task
        [HttpGet("task/{taskId}")]
        public async Task<IActionResult> GetRubricsByTask(int taskId)
        {

            var rubrics = await _service.GetRubricsByTaskIdAsync(taskId);


            var result = rubrics.Select(r => new RubricResponseDto
            {
                RubricId = r.RubricId,
                Criterion = r.Criterion,
                Weight = r.Weight,
                MaxScore = r.MaxScore,
                TaskId = r.TaskId
            });


            return Ok(result);
        }





        // POST: api/Rubric
        // Add a rubric criterion
        [HttpPost]
        public async Task<IActionResult> AddRubric(AddRubricDto dto)
        {

            var rubric = new NFD_Rubric
            {
                Criterion = dto.Criterion,
                Weight = dto.Weight,
                MaxScore = dto.MaxScore,
                TaskId = dto.TaskId
            };


            await _service.AddRubricAsync(rubric);



            var response = new RubricResponseDto
            {
                RubricId = rubric.RubricId,
                Criterion = rubric.Criterion,
                Weight = rubric.Weight,
                MaxScore = rubric.MaxScore,
                TaskId = rubric.TaskId
            };


            return CreatedAtAction(
                nameof(GetRubricsByTask),
                new { taskId = rubric.TaskId },
                response
            );

        }







        // PUT: api/Rubric/{id}
        // Update criterion weight/max score
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateRubric(int id, UpdateRubricDto dto)
        {

            var rubric = await _service.GetRubricByIdAsync(id);


            if (rubric == null)
                return NotFound("Rubric not found");



            rubric.Criterion = dto.Criterion;
            rubric.Weight = dto.Weight;
            rubric.MaxScore = dto.MaxScore;



            await _service.UpdateRubricAsync(rubric);



            return NoContent();

        }







        // DELETE: api/Rubric/{id}
        // Remove a criterion
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteRubric(int id)
        {

            var rubric = await _service.GetRubricByIdAsync(id);


            if (rubric == null)
                return NotFound("Rubric not found");



            await _service.DeleteRubricAsync(rubric);



            return NoContent();

        }

    }
}