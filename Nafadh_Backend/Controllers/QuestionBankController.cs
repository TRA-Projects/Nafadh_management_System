using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [Route("api/question-bank")]
    [ApiController]
    public class QuestionBankController
        : ControllerBase
    {
        private readonly IQuestionBankService _service;

        public QuestionBankController(
            IQuestionBankService service)
        {
            _service = service;
        }

        [HttpGet("trainer/{trainerId:int}")]
        public async Task<IActionResult> GetTrainerQuestions(
            int trainerId)
        {
            var questions =
                await _service.GetTrainerQuestionsAsync(trainerId);

            return Ok(questions);
        }

        [HttpPost]
        public async Task<IActionResult> CreateQuestion(
            [FromBody] CreateQuestionDto dto,
            [FromQuery] int trainerId)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                await _service.CreateQuestionAsync(
                    dto,
                    trainerId);

                return Ok(new
                {
                    message = "تمت إضافة السؤال بنجاح."
                });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
        }

        [HttpDelete("{questionId:int}")]
        public async Task<IActionResult> DeactivateQuestion(
            int questionId,
            [FromQuery] int trainerId)
        {
            try
            {
                await _service.DeactivateQuestionAsync(
                    questionId,
                    trainerId);

                return Ok(new
                {
                    message = "تم تعطيل السؤال بنجاح."
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new
                {
                    message = ex.Message
                });
            }
        }
    }
}
