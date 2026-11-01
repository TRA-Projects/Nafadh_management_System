using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs.CompanyPayment;
using Nafadh_Backend.Services;
using Nafadh_Backend.DTOs;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/admin/batch-groups")]
    public class AdminBatchGroupsController :ControllerBase
    {
        private readonly IConversationService _conversationService;

        public AdminBatchGroupsController(
            IConversationService conversationService)
        {
            _conversationService = conversationService;
        }

        [HttpGet]
        public async Task<ActionResult<List<AdminBatchGroupListDTO>>>
            GetAllBatchGroups()
        {
            var groups = await _conversationService
                .GetAdminBatchGroupsAsync();

            return Ok(groups);
        }

        [HttpGet("{conversationId:int}/messages")]
        public async Task<ActionResult<List<AdminBatchGroupMessageDTO>>>
    GetBatchGroupMessages(int conversationId)
        {
            var messages = await _conversationService
                .GetAdminBatchGroupMessagesAsync(conversationId);

            if (messages == null)
            {
                return NotFound(new
                {
                    message = "Training batch group not found."
                });
            }

            return Ok(messages);
        }
    }
}
