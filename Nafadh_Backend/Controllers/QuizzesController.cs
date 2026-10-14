using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.Models;
using Nafadh_Backend.Services;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Nafadh_Backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class QuizzesController : ControllerBase
    {
        private readonly IQuizService _quizService;

        public QuizzesController(IQuizService quizService)
        {
            _quizService = quizService;
        }

        // 1. جلب قائمة الاختبارات الخاصة بمدرب معين
        [HttpGet("trainer/{trainerId:int}")]
        public async Task<IActionResult> GetTrainerQuizzes(int trainerId)
        {
            var quizzes = await _quizService.GetTrainerQuizzesAsync(trainerId);
            return Ok(quizzes);
        }

        // 2. إنشاء اختبار جديد
        [HttpPost]
        public async Task<IActionResult> CreateQuiz([FromBody] NFD_Quiz quiz, [FromQuery] int trainerId)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            await _quizService.CreateQuizAsync(quiz, trainerId);
            return Ok(new { message = "تم إنشاء الاختبار بنجاح" });
        }

        // 3. تعديل اختبار موجود
        [HttpPut("{id:int}")]
        public async Task<IActionResult> UpdateQuiz(int id, [FromBody] NFD_Quiz quiz)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            try
            {
                await _quizService.UpdateQuizAsync(id, quiz);
                return Ok(new { message = "تم تحديث الاختبار بنجاح" });
            }
            catch (System.Exception ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }
    }
}
