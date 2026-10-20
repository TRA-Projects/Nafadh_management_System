using Microsoft.AspNetCore.Mvc;
using Nafadh_Backend.DTOs.CompanyPayment;
using Nafadh_Backend.Services;

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
    }
}
