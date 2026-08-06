using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Models;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TaskController : ControllerBase
    {
        private readonly ITaskService _service;

        public TaskController(ITaskService service)
        {
            _service = service;
        }


        // GET: api/Task
        [HttpGet]
        public async Task<IActionResult> GetAllTasks()
        {
            var tasks = await _service.GetAllTasksAsync();

            var result = tasks.Select(t => new TaskResponseDto
            {
                TaskId = t.TaskId,
                Title = t.Title,
                Description = t.Description,
                DueDate = t.DueDate,
                Priority = t.Priority,
                Status = t.Status,
                BatchId = t.BatchId,
                CreatedByUserId = t.CreatedByUserId
            });

            return Ok(result);
        }



        // GET: api/Task/{id}
        [HttpGet("{id}")]
        public async Task<IActionResult> GetTaskById(int id)
        {
            var task = await _service.GetTaskByIdAsync(id);

            if (task == null)
                return NotFound("Task not found");


            var result = new TaskResponseDto
            {
                TaskId = task.TaskId,
                Title = task.Title,
                Description = task.Description,
                DueDate = task.DueDate,
                Priority = task.Priority,
                Status = task.Status,
                BatchId = task.BatchId,
                CreatedByUserId = task.CreatedByUserId
            };


            return Ok(result);
        }




        // POST: api/Task
        [HttpPost]
        public async Task<IActionResult> AddTask(AddTaskDto dto)
        {

            var task = new NFD_Task
            {
                Title = dto.Title,
                Description = dto.Description,
                DueDate = dto.DueDate,
                Priority = dto.Priority,
                Status = dto.Status,
                BatchId = dto.BatchId,
                CreatedByUserId = dto.CreatedByUserId
            };


            await _service.AddTaskAsync(task);


            var response = new TaskResponseDto
            {
                TaskId = task.TaskId,
                Title = task.Title,
                Description = task.Description,
                DueDate = task.DueDate,
                Priority = task.Priority,
                Status = task.Status,
                BatchId = task.BatchId,
                CreatedByUserId = task.CreatedByUserId
            };


            return CreatedAtAction(
                nameof(GetTaskById),
                new { id = task.TaskId },
                response);
        }




        // PUT: api/Task/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTask(int id, UpdateTaskDto dto)
        {

            var existingTask = await _service.GetTaskByIdAsync(id);


            if (existingTask == null)
                return NotFound("Task not found");



            existingTask.Title = dto.Title;
            existingTask.Description = dto.Description;
            existingTask.DueDate = dto.DueDate;
            existingTask.Priority = dto.Priority;
            existingTask.Status = dto.Status;
            existingTask.BatchId = dto.BatchId;
            existingTask.CreatedByUserId = dto.CreatedByUserId;



            await _service.UpdateTaskAsync(existingTask);


            return NoContent();
        }





        // DELETE: api/Task/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTask(int id)
        {

            var task = await _service.GetTaskByIdAsync(id);


            if (task == null)
                return NotFound("Task not found");



            await _service.DeleteTaskAsync(task);


            return NoContent();
        }





        // GET: api/Task/batch/{batchId}
        [HttpGet("batch/{batchId}")]
        public async Task<IActionResult> GetTasksByBatch(int batchId)
        {

            var tasks = await _service.GetTasksByBatchIdAsync(batchId);


            var result = tasks.Select(t => new TaskResponseDto
            {
                TaskId = t.TaskId,
                Title = t.Title,
                Description = t.Description,
                DueDate = t.DueDate,
                Priority = t.Priority,
                Status = t.Status,
                BatchId = t.BatchId,
                CreatedByUserId = t.CreatedByUserId
            });


            return Ok(result);
        }





        // GET: api/Task/{id}/rubrics
        [HttpGet("{id}/rubrics")]
        public async Task<IActionResult> GetRubricsByTask(int id)
        {

            var rubrics = await _service.GetRubricsByTaskIdAsync(id);


            return Ok(rubrics);
        }






        // GET: api/Task/{id}/submissions
        [HttpGet("{id}/submissions")]
        public async Task<IActionResult> GetSubmissionsByTask(int id)
        {

            var submissions = await _service.GetSubmissionsByTaskIdAsync(id);


            return Ok(submissions);
        }

    }
}