
// Added by Noura (Team 3 - Division 2: Identity, Organizations & People)

namespace Nafadh_Backend.Common
{
   
    /// Generic envelope for paged list/search endpoints (e.g. GET /api/User).
 
    public class PagedResult<T>
    {
        public List<T> Items { get; set; } = new();
        public int TotalCount { get; set; }
        public int Page { get; set; }
        public int PageSize { get; set; }
        public int TotalPages => PageSize <= 0 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);
    }
}
