namespace Nafadh_Backend.DTOs
{
    public class AssignTrainerDto
    {
        public int BatchId { get; set; }
        public int TrainerId { get; set; }
    }

    public class UnassignTrainerDto
    {
        public int BatchId { get; set; }
        public int TrainerId { get; set; }
    }

    // Shape of GET /api/BatchTrainer/batch/{batchId}
    // TrainerName is a placeholder (belongs to NFD_Trainers / External Scope)
    public class TrainerInBatchDto
    {
        public int TrainerId { get; set; }
        public string TrainerName { get; set; } = string.Empty;
    }

    // Shape of GET /api/BatchTrainer/trainer/{trainerId}
    // BatchName is populated directly from NFD_Batch
    public class BatchForTrainerDto
    {
        public int BatchId { get; set; }
        public string BatchName { get; set; } = string.Empty;
    }
}
