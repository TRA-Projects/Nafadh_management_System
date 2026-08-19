using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs;
using Nafadh_Backend.Enums;
using Nafadh_Backend.Services;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ConversationController : ControllerBase
    {
        private readonly IConversationService _service;


        public ConversationController(
            IConversationService service
        )
        {
            _service = service;
        }


        // ============================================================
        // GET: api/Conversation
        // ============================================================

        [HttpGet]
        public async Task<IActionResult> Get(
            [FromQuery]
            NFD_ConversationType? type,

            [FromQuery]
            int? participantUserId,

            [FromQuery]
            NFD_SupportTicketStatus? status
        )
        {
            var conversations =
                await _service.GetAsync(
                    type,
                    participantUserId,
                    status
                );


            return Ok(conversations);
        }


        // ============================================================
        // GET: api/Conversation/{id}
        // ============================================================

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(
            int id
        )
        {
            var conversation =
                await _service.GetByIdAsync(id);


            if (conversation == null)
            {
                return NotFound();
            }


            return Ok(conversation);
        }


        // ============================================================
        // POST: api/Conversation
        // ============================================================

        [HttpPost]
        public async Task<IActionResult> Create(
            [FromBody]
            CreateConversationDTO dto
        )
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }


            var created =
                await _service.CreateAsync(dto);


            return CreatedAtAction(
                nameof(GetById),
                new
                {
                    id = created.ConversationId
                },
                created
            );
        }


        // ============================================================
        // POST: api/Conversation/{id}/messages
        // ============================================================

        [HttpPost("{id}/messages")]
        public async Task<IActionResult> AddMessage(
            int id,
            [FromBody]
            AddConversationMessageDTO dto
        )
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }


            var message =
                await _service.AddMessageAsync(
                    id,
                    dto
                );


            return Ok(message);
        }


        // ============================================================
        // PUT: api/Conversation/{id}/status
        // ============================================================

        [HttpPut("{id}/status")]
        public async Task<IActionResult> UpdateStatus(
            int id,
            [FromBody]
            UpdateConversationStatusDTO dto
        )
        {
            await _service.UpdateStatusAsync(
                id,
                dto
            );


            return Ok(
                new
                {
                    message =
                        "Conversation status updated successfully."
                }
            );
        }


        // ============================================================
        // PUT: api/Conversation/{id}/read
        // ============================================================

        [HttpPut("{id}/read")]
        public async Task<IActionResult> MarkAsRead(
            int id,
            [FromQuery] int userId
        )
        {
            await _service.MarkAsReadAsync(
                id,
                userId
            );


            return Ok(
                new
                {
                    message =
                        "Conversation messages marked as read."
                }
            );
        }
    }
}