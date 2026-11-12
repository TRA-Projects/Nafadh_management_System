using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Repositories
{
    public class QuestionAttachmentRepository : IQuestionAttachmentRepository
    {
        private readonly Nafadhcontext _context;

        public QuestionAttachmentRepository(Nafadhcontext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<NFD_QuestionAttachment>> GetByQuestionIdAsync(
            int questionId)
        {
            return await _context.NFD_QuestionAttachments
                .Include(a => a.Question)
                .Where(a => a.QuestionId == questionId)
                .OrderByDescending(a => a.UploadedAt)
                .ToListAsync();
        }

        public async Task<NFD_QuestionAttachment?> GetByIdAsync(int id)
        {
            return await _context.NFD_QuestionAttachments
                .Include(a => a.Question)
                .FirstOrDefaultAsync(a =>
                    a.QuestionAttachmentId == id);
        }

        public async Task<NFD_QuestionAttachment> CreateAsync(
            NFD_QuestionAttachment attachment)
        {
            await _context.NFD_QuestionAttachments.AddAsync(attachment);
            await _context.SaveChangesAsync();

            return attachment;
        }

        public async Task DeleteAsync(
            NFD_QuestionAttachment attachment)
        {
            _context.NFD_QuestionAttachments.Remove(attachment);
            await _context.SaveChangesAsync();
        }

        public async Task<bool> ExistsAsync(int id)
        {
            return await _context.NFD_QuestionAttachments
                .AnyAsync(a =>
                    a.QuestionAttachmentId == id);
        }
    }
}