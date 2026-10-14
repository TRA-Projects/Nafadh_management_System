using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Models;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [Route("api/question-bank")]
    [ApiController]
    public class QuestionBankController : ControllerBase
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

        [HttpGet("{questionId:int}")]
        public async Task<IActionResult> GetQuestion(
            int questionId,
            [FromQuery] int trainerId)
        {
            var question =
                await _service.GetQuestionByIdAsync(
                    questionId,
                    trainerId);

            if (question == null)
            {
                return NotFound(new
                {
                    message = "السؤال غير موجود."
                });
            }

            return Ok(question);
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
                var question = new NFD_QuestionBank
                {
                    QuestionText = dto.QuestionText,
                    QuestionType = dto.QuestionType,
                    Difficulty = dto.Difficulty,
                    Points = dto.Points,
                    Explanation = dto.Explanation,

                    Options = dto.Options?
                        .Select(option =>
                            new NFD_QuestionOption
                            {
                                OptionText =
                                    option.OptionText,

                                OptionCode =
                                    option.OptionCode,

                                SortOrder =
                                    option.SortOrder,

                                IsCorrect =
                                    option.IsCorrect
                            })
                        .ToList()
                        ?? new List<NFD_QuestionOption>()
                };

                var createdQuestion =
                    await _service.CreateQuestionAsync(
                        question,
                        trainerId);

                return Ok(createdQuestion);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new
                {
                    message = ex.Message
                });
            }
        }

        [HttpPut("{questionId:int}")]
        public async Task<IActionResult> UpdateQuestion(
            int questionId,
            [FromBody] CreateQuestionDto dto,
            [FromQuery] int trainerId)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var question = new NFD_QuestionBank
                {
                    QuestionText = dto.QuestionText,
                    QuestionType = dto.QuestionType,
                    Difficulty = dto.Difficulty,
                    Points = dto.Points,
                    Explanation = dto.Explanation,

                    Options = dto.Options?
                        .Select(option =>
                            new NFD_QuestionOption
                            {
                                OptionText =
                                    option.OptionText,

                                OptionCode =
                                    option.OptionCode,

                                SortOrder =
                                    option.SortOrder,

                                IsCorrect =
                                    option.IsCorrect
                            })
                        .ToList()
                        ?? new List<NFD_QuestionOption>()
                };

                var updated =
                    await _service.UpdateQuestionAsync(
                        questionId,
                        question,
                        trainerId);

                if (!updated)
                {
                    return NotFound(new
                    {
                        message =
                            "السؤال غير موجود أو لا تملكين صلاحية تعديله."
                    });
                }

                return Ok(new
                {
                    message = "تم تحديث السؤال بنجاح."
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
            var deactivated =
                await _service.DeactivateQuestionAsync(
                    questionId,
                    trainerId);

            if (!deactivated)
            {
                return NotFound(new
                {
                    message =
                        "السؤال غير موجود أو لا تملكين صلاحية تعطيله."
                });
            }

            return Ok(new
            {
                message = "تم تعطيل السؤال بنجاح."
            });
        }
    }
}
