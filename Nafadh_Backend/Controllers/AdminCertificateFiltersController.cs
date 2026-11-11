
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Models;

namespace Nafadh_Backend.Controllers
{
    [ApiController]
    [Route("api/admin/certificates")]
    //[Authorize(Roles = "Admin")]
    public class AdminCertificateFiltersController : ControllerBase
    {
        private readonly Nafadhcontext _context;

        public AdminCertificateFiltersController(Nafadhcontext context)
        {
            _context = context;
        }

        [HttpGet("filter-options")]
        public async Task<IActionResult> GetFilterOptions()
        {
            // Companies linked through trainee enrollments.
            var enrollmentLinks = await _context.NFD_Enrollments
                .AsNoTracking()
                .Select(e => new
                {
                    e.BatchId,
                    e.CompanyId,
                    e.Company.CompanyName
                })
                .Distinct()
                .ToListAsync();

            // Companies assigned directly to batches.
            var directLinks = await _context.NFD_Batches
                .AsNoTracking()
                .Where(b => b.CompanyId.HasValue)
                .Select(b => new
                {
                    b.BatchId,
                    CompanyId = b.CompanyId!.Value,
                    CompanyName = b.Company!.CompanyName
                })
                .ToListAsync();

            // Merge and remove duplicate company-batch relationships.
            var companies = enrollmentLinks
                .Concat(directLinks)
                .Where(x => !string.IsNullOrWhiteSpace(x.CompanyName))
                .GroupBy(x => x.CompanyId)
                .Select(g => new
                {
                    companyId = g.Key,
                    companyName = g.First().CompanyName,
                    batchIds = g.Select(x => x.BatchId)
                        .Distinct()
                        .OrderBy(id => id)
                        .ToList()
                })
                .OrderBy(x => x.companyName)
                .ToList();

            // Only tracks associated with existing batches.
            var tracks = await _context.NFD_Batches
                .AsNoTracking()
                .Select(b => new
                {
                    trackId = b.Program.TrackId,
                    trackName = b.Program.Track.Name
                })
                .Distinct()
                .OrderBy(x => x.trackName)
                .ToListAsync();

            return Ok(new
            {
                companies,
                tracks
            });
        }
    }
}
