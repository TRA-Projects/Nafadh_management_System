namespace Nafadh_Backend.DTOs
{
    public class BatchProgressDto
    {

            public int BatchId { get; set; }
            public int TotalTrainees { get; set; }
            public int TotalModules { get; set; }
            public int CompletedModules { get; set; }
            public double ProgressPercentage { get; set; }
        
    }
}
