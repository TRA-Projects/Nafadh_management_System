using System;

namespace Nafadh_Backend.Models
{
    public class SupervisorTrainerDto
    {
        public int TrainerId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? Specialty { get; set; }
    }

    public class SupervisorTrainerEvaluationDto
    {
        public int TrainerId { get; set; }
        public int Rating { get; set; }
        public string? Comment { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }
    }

    public class AssignSupervisorTrainersRequest
    {
        public List<int> TrainerIds { get; set; } = new();
    }

    public class SaveSupervisorTrainerEvaluationRequest
    {
        public int Rating { get; set; }
        public string? Comment { get; set; }
    }
}