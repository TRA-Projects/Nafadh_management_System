using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.Models
{
    public class NFD_CompanySupervisorTrainer
    {
        public int SupervisorId { get; set; }
        public int TrainerId { get; set; }

        public NFD_CompanySupervisor Supervisor { get; set; } = null!;
        public NFD_Trainer Trainer { get; set; } = null!;
    }

}