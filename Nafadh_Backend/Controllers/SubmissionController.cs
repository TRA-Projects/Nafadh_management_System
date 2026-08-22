using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Models;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class SubmissionController : ControllerBase
    {

        private readonly ISubmissionService _service;
        private readonly IBadgeEvaluationService _badgeEvaluationService;


        public SubmissionController(ISubmissionService service, IBadgeEvaluationService badgeEvaluationService)
        {
            _service = service;
            _badgeEvaluationService = badgeEvaluationService;
        }



        // GET: api/Submission/task/{taskId}
        // All submissions for a task (grading queue)
        [HttpGet("task/{taskId}")]
        public async Task<IActionResult> GetSubmissionsByTask(int taskId)
        {

            var submissions = await _service.GetSubmissionsByTaskIdAsync(taskId);


            var result = submissions.Select(s => new SubmissionResponseDto
            {
                SubmissionId = s.SubmissionId,
                FileUrl = s.FileUrl,
                SubmittedAt = s.SubmittedAt,
                Status = s.Status,
                Grade = s.Grade,
                Feedback = s.Feedback,
                TaskId = s.TaskId,
                TraineeId = s.TraineeId
            });


            return Ok(result);
        }







        // GET: api/Submission/trainee/{traineeId}
        // Trainee submission history
        [HttpGet("trainee/{traineeId}")]
        public async Task<IActionResult> GetSubmissionsByTrainee(int traineeId)
        {

            var submissions = await _service.GetSubmissionsByTraineeIdAsync(traineeId);


            var result = submissions.Select(s => new SubmissionResponseDto
            {
                SubmissionId = s.SubmissionId,
                FileUrl = s.FileUrl,
                SubmittedAt = s.SubmittedAt,
                Status = s.Status,
                Grade = s.Grade,
                Feedback = s.Feedback,
                TaskId = s.TaskId,
                TraineeId = s.TraineeId
            });


            return Ok(result);
        }








        // GET: api/Submission/{id}
        // Get submission details
        [HttpGet("{id}")]
        public async Task<IActionResult> GetSubmissionById(int id)
        {

            var submission = await _service.GetSubmissionByIdAsync(id);


            if (submission == null)
                return NotFound("Submission not found");



            var result = new SubmissionResponseDto
            {
                SubmissionId = submission.SubmissionId,
                FileUrl = submission.FileUrl,
                SubmittedAt = submission.SubmittedAt,
                Status = submission.Status,
                Grade = submission.Grade,
                Feedback = submission.Feedback,
                TaskId = submission.TaskId,
                TraineeId = submission.TraineeId
            };


            return Ok(result);
        }








        // POST: api/Submission
        // Trainee submits a task deliverable
        [HttpPost]
        public async Task<IActionResult> AddSubmission(AddSubmissionDto dto)
        {

            var submission = new NFD_Submission
            {

                FileUrl = dto.FileUrl,

                SubmittedAt = DateTime.Now,

                Status = NFD_SubmissionStatus.Submitted,

                TaskId = dto.TaskId,

                TraineeId = dto.TraineeId

            };


            await _service.AddSubmissionAsync(submission);



            var response = new SubmissionResponseDto
            {
                SubmissionId = submission.SubmissionId,
                FileUrl = submission.FileUrl,
                SubmittedAt = submission.SubmittedAt,
                Status = submission.Status,
                Grade = submission.Grade,
                Feedback = submission.Feedback,
                TaskId = submission.TaskId,
                TraineeId = submission.TraineeId
            };



            return CreatedAtAction(
                nameof(GetSubmissionById),
                new { id = submission.SubmissionId },
                response
            );

        }










        // PUT: api/Submission/{id}/grade
        // Grade a submission (score + feedback)
        [HttpPut("{id}/grade")]
        public async Task<IActionResult> GradeSubmission(
            int id,
            GradeSubmissionDto dto)
        {

            var submission = await _service.GetSubmissionByIdAsync(id);



            if (submission == null)
                return NotFound("Submission not found");



            submission.Grade = dto.Grade;

            submission.Feedback = dto.Feedback;

            submission.Status = NFD_SubmissionStatus.Graded;



            await _service.UpdateSubmissionAsync(submission);

            // NEW: grading may push this trainee over a HighScoreCount badge threshold.
            await _badgeEvaluationService.EvaluateTraineeAsync(submission.TraineeId);

            return NoContent();

        }









        // PUT: api/Submission/{id}/reopen
        // Reopen submission for revision
        [HttpPut("{id}/reopen")]
        public async Task<IActionResult> ReopenSubmission(int id)
        {

            var submission = await _service.GetSubmissionByIdAsync(id);



            if (submission == null)
                return NotFound("Submission not found");



            submission.Status = NFD_SubmissionStatus.ReturnedForRevision;


            submission.Grade = null;


            submission.Feedback = null;



            await _service.UpdateSubmissionAsync(submission);



            return NoContent();

        }


        // GET: api/Submission/task/{taskId}/trainer-view
        // Detailed task submissions for Trainer Portal
        [HttpGet("task/{taskId}/trainer-view")]
        public async Task<IActionResult>
            GetTrainerTaskSubmissions(int taskId)
        {
            var submissions =
                await _service
                    .GetTrainerTaskSubmissionsAsync(taskId);


            var result = submissions.Select(
                s => new
                {
                    SubmissionId =
                        s.SubmissionId,

                    FileUrl =
                        s.FileUrl,

                    SubmittedAt =
                        s.SubmittedAt,

                    Status =
                        s.Status,

                    Grade =
                        s.Grade,

                    Feedback =
                        s.Feedback,

                    TaskId =
                        s.TaskId,

                    TraineeId =
                        s.TraineeId,

                    TraineeName =
                        s.Trainee?
                            .User?
                            .FullName
                }
            );


            return Ok(result);
        }


    }
}