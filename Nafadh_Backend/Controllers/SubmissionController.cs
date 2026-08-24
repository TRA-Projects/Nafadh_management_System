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
        private readonly IConfiguration _configuration;

        public SubmissionController(
      ISubmissionService service,
      IBadgeEvaluationService badgeEvaluationService,
      IConfiguration configuration
  )
        {
            _service = service;
            _badgeEvaluationService = badgeEvaluationService;
            _configuration = configuration;
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
        // ======================================================
        // POST: api/Submission/upload
        // Upload a real trainee submission file
        // ======================================================

        [HttpPost("upload")]
        public async Task<IActionResult> UploadSubmission(
            [FromForm] IFormFile file,
            [FromForm] int taskId,
            [FromForm] int traineeId
        )
        {
            if (
                file == null ||
                file.Length == 0
            )
            {
                return BadRequest(
                    "Submission file is required."
                );
            }


            var submissionsFolder =
                _configuration[
                    "Storage:SubmissionsPath"
                ];


            if (
                string.IsNullOrWhiteSpace(
                    submissionsFolder
                )
            )
            {
                return StatusCode(
                    500,
                    "Submissions storage path is not configured."
                );
            }


            Directory.CreateDirectory(
                submissionsFolder
            );


            var extension =
                Path.GetExtension(
                    file.FileName
                );


            var fileName =
                $"submission-{taskId}-{traineeId}-{DateTime.Now:yyyyMMddHHmmssfff}{extension}";


            var fullPath =
                Path.Combine(
                    submissionsFolder,
                    fileName
                );


            await using (
                var stream =
                    new FileStream(
                        fullPath,
                        FileMode.Create
                    )
            )
            {
                await file.CopyToAsync(
                    stream
                );
            }


            var submission =
                new NFD_Submission
                {
                    FileUrl =
                        fullPath,

                    SubmittedAt =
                        DateTime.Now,

                    Status =
                        NFD_SubmissionStatus.Submitted,

                    TaskId =
                        taskId,

                    TraineeId =
                        traineeId
                };


            await _service.AddSubmissionAsync(
                submission
            );


            return Ok(
                new SubmissionResponseDto
                {
                    SubmissionId =
                        submission.SubmissionId,

                    FileUrl =
                        submission.FileUrl,

                    SubmittedAt =
                        submission.SubmittedAt,

                    Status =
                        submission.Status,

                    Grade =
                        submission.Grade,

                    Feedback =
                        submission.Feedback,

                    TaskId =
                        submission.TaskId,

                    TraineeId =
                        submission.TraineeId
                }
            );
        }
        // ======================================================
        // GET: api/Submission/{id}/file
        // Open the real submitted file
        // ======================================================

        [HttpGet("{id}/file")]
        public async Task<IActionResult> GetSubmissionFile(
            int id
        )
        {
            var submission =
                await _service
                    .GetSubmissionByIdAsync(
                        id
                    );


            if (
                submission == null ||
                string.IsNullOrWhiteSpace(
                    submission.FileUrl
                )
            )
            {
                return NotFound(
                    "Submission file not found."
                );
            }


            var submissionsFolder =
                _configuration[
                    "Storage:SubmissionsPath"
                ];


            if (
                string.IsNullOrWhiteSpace(
                    submissionsFolder
                )
            )
            {
                return NotFound(
                    "Submission storage is not configured."
                );
            }


            var storageRoot =
                Path.GetFullPath(
                    submissionsFolder
                );


            string filePath;


            try
            {
                filePath =
                    Path.GetFullPath(
                        submission.FileUrl
                    );
            }
            catch
            {
                return NotFound(
                    "Invalid submission file path."
                );
            }


            var rootWithSeparator =
                storageRoot.TrimEnd(
                    Path.DirectorySeparatorChar,
                    Path.AltDirectorySeparatorChar
                )
                + Path.DirectorySeparatorChar;


            if (
                !filePath.StartsWith(
                    rootWithSeparator,
                    StringComparison.OrdinalIgnoreCase
                )
            )
            {
                return NotFound(
                    "Submission file is outside the allowed storage folder."
                );
            }


            if (
                !System.IO.File.Exists(
                    filePath
                )
            )
            {
                return NotFound(
                    "Submission file does not exist."
                );
            }


            var fileBytes =
                await System.IO.File
                    .ReadAllBytesAsync(
                        filePath
                    );


            var contentType =
                Path.GetExtension(
                    filePath
                )
                .ToLowerInvariant()
                switch
                {
                    ".pdf" =>
                        "application/pdf",

                    ".doc" =>
                        "application/msword",

                    ".docx" =>
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",

                    ".xls" =>
                        "application/vnd.ms-excel",

                    ".xlsx" =>
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",

                    ".png" =>
                        "image/png",

                    ".jpg" =>
                        "image/jpeg",

                    ".jpeg" =>
                        "image/jpeg",

                    ".txt" =>
                        "text/plain",

                    ".zip" =>
                        "application/zip",

                    _ =>
                        "application/octet-stream"
                };


            return File(
                fileBytes,
                contentType,
                Path.GetFileName(
                    filePath
                )
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