namespace Nafadh_Backend.DTOs
{
    public class UserPagePermissionDto
    {
        public string PageCode { get; set; } = string.Empty;
        public string NameAr { get; set; } = string.Empty;
        public string NameEn { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
        public int ActionFlags { get; set; }
        public string DataScope { get; set; } = string.Empty;
        public List<string> AllowedActions { get; set; } = new();
    }
}

