namespace Nafadh_Backend.DTOs
{
    public class QuestionOptionDto
    {
        public int OptionId { get; set; }

        public string OptionText { get; set; } = string.Empty;

        public string OptionCode { get; set; } = string.Empty;

        public int SortOrder { get; set; }
    }
}
