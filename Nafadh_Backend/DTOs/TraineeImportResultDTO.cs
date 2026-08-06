namespace Nafadh_Backend.DTOs
{
    public class TraineeImportResultDto
    {
        // Total number of rows processed from the Excel file
        public int TotalRows { get; set; }

        // Number of trainees successfully imported
        public int SuccessCount { get; set; }

        // Number of rows that failed to import
        public int FailedCount { get; set; }

     }
}
