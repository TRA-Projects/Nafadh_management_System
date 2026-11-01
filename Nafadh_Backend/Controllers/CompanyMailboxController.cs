using System.Security.Claims;
using System.Text.Json;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.Controllers;

[ApiController]
[Authorize(Roles = "CompanySupervisor")]
[Route("api/CompanyMailbox")]
public class CompanyMailboxController : ControllerBase
{
    private readonly Nafadhcontext _db;
    private readonly string _folder;
    private static readonly SemaphoreSlim Gate = new(1, 1);
    public CompanyMailboxController(Nafadhcontext db, IWebHostEnvironment environment)
    {
        _db = db;
        _folder = Path.Combine(environment.ContentRootPath, "App_Data", "CompanyMailDrafts");
    }
    private int? CurrentUser => int.TryParse(User.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? User.FindFirstValue("sub"), out var id) && id > 0 ? id : null;
    private Task<bool> OwnsThread(int id, int userId) => _db.NFD_SupportTickets.AnyAsync(t =>
        t.TicketId == id && t.Type == NFD_ConversationType.CompanyThread &&
        (t.UserId == userId || t.Messages.Any(m => m.SenderId == userId || m.ReceiverId == userId)));
    private string DraftFile(int userId) => Path.Combine(_folder, $"{userId}.json");
    private async Task<List<CompanyMailDraft>> Read(int userId) => System.IO.File.Exists(DraftFile(userId))
        ? JsonSerializer.Deserialize<List<CompanyMailDraft>>(await System.IO.File.ReadAllTextAsync(DraftFile(userId))) ?? new()
        : new();
    private async Task Write(int userId, List<CompanyMailDraft> drafts)
    {
        Directory.CreateDirectory(_folder);
        var temporary = DraftFile(userId) + ".tmp";
        await System.IO.File.WriteAllTextAsync(temporary, JsonSerializer.Serialize(drafts));
        System.IO.File.Move(temporary, DraftFile(userId), true);
    }
    private string TrashFile(int userId) => Path.Combine(_folder, $"{userId}.trash.json");
    private async Task<HashSet<int>> ReadTrash(int userId) => System.IO.File.Exists(TrashFile(userId))
        ? JsonSerializer.Deserialize<HashSet<int>>(await System.IO.File.ReadAllTextAsync(TrashFile(userId))) ?? new()
        : new();
    private async Task WriteTrash(int userId, HashSet<int> ids)
    {
        Directory.CreateDirectory(_folder);
        var temporary = TrashFile(userId) + ".tmp";
        await System.IO.File.WriteAllTextAsync(temporary, JsonSerializer.Serialize(ids));
        System.IO.File.Move(temporary, TrashFile(userId), true);
    }
    [HttpGet("trash")]
    public async Task<IActionResult> Trash()
    {
        if (CurrentUser is not int userId) return Unauthorized();
        var ownedIds = await _db.NFD_SupportTickets.AsNoTracking()
            .Where(t => t.UserId == userId && t.Type == NFD_ConversationType.CompanyThread)
            .Select(t => t.TicketId).ToListAsync();
        await Gate.WaitAsync();
        try { return Ok(new { trashedIds = await ReadTrash(userId), ownedIds }); }
        finally { Gate.Release(); }
    }
    [HttpPut("trash/{id:int}")]
    public async Task<IActionResult> MoveToTrash(int id)
    {
        if (CurrentUser is not int userId) return Unauthorized();
        if (!await OwnsThread(id, userId)) return NotFound();
        await Gate.WaitAsync();
        try { var ids = await ReadTrash(userId); ids.Add(id); await WriteTrash(userId, ids); return NoContent(); }
        finally { Gate.Release(); }
    }
    [HttpDelete("trash/{id:int}")]
    public async Task<IActionResult> Restore(int id)
    {
        if (CurrentUser is not int userId) return Unauthorized();
        if (!await OwnsThread(id, userId)) return NotFound();
        await Gate.WaitAsync();
        try { var ids = await ReadTrash(userId); ids.Remove(id); await WriteTrash(userId, ids); return NoContent(); }
        finally { Gate.Release(); }
    }
    [HttpGet("drafts")]
    public async Task<IActionResult> Drafts()
    {
        if (CurrentUser is not int userId) return Unauthorized();
        await Gate.WaitAsync();
        try
        {
            var drafts = await Read(userId);
            var result = new List<CompanyMailDraft>();
            foreach (var draft in drafts)
                if (!draft.ConversationId.HasValue || await OwnsThread(draft.ConversationId.Value, userId)) result.Add(draft);
            return Ok(result.OrderByDescending(d => d.UpdatedAt));
        }
        finally { Gate.Release(); }
    }
    [HttpPut("drafts/{id:guid}")]
    public async Task<IActionResult> SaveDraft(Guid id, CompanyMailDraft dto)
    {
        if (CurrentUser is not int userId) return Unauthorized();
        if (dto.ConversationId.HasValue && !await OwnsThread(dto.ConversationId.Value, userId)) return NotFound();
        dto.Id = id; dto.UpdatedAt = DateTime.UtcNow;
        await Gate.WaitAsync();
        try
        {
            var drafts = await Read(userId);
            drafts.RemoveAll(d => d.Id == id || (dto.ConversationId.HasValue && d.ConversationId == dto.ConversationId));
            drafts.Add(dto); await Write(userId, drafts); return Ok(dto);
        }
        finally { Gate.Release(); }
    }
    [HttpDelete("drafts/{id:guid}")]
    public async Task<IActionResult> DeleteDraft(Guid id)
    {
        if (CurrentUser is not int userId) return Unauthorized();
        await Gate.WaitAsync();
        try { var drafts = await Read(userId); drafts.RemoveAll(d => d.Id == id); await Write(userId, drafts); return NoContent(); }
        finally { Gate.Release(); }
    }
    [HttpDelete("conversations/{id:int}")]
    public async Task<IActionResult> DeleteConversation(int id)
    {
        if (CurrentUser is not int userId) return Unauthorized();
        var ticket = await _db.NFD_SupportTickets.Include(t => t.Messages)
            .FirstOrDefaultAsync(t => t.TicketId == id && t.UserId == userId && t.Type == NFD_ConversationType.CompanyThread);
        if (ticket is null) return NotFound();
        _db.NFD_Messages.RemoveRange(ticket.Messages);
        _db.NFD_SupportTickets.Remove(ticket);
        await _db.SaveChangesAsync();
        // Draft cleanup is separate from the committed database deletion.
        return NoContent();
    }
}
public class CompanyMailDraft
{
    public Guid Id { get; set; }
    public int? ConversationId { get; set; }
    [Required(AllowEmptyStrings = true), MaxLength(150)] public string Subject { get; set; } = "";
    [Required(AllowEmptyStrings = true), MaxLength(150)] public string Category { get; set; } = "";
    [Required(AllowEmptyStrings = true), MaxLength(5000)] public string Content { get; set; } = "";
    public DateTime UpdatedAt { get; set; }
}
