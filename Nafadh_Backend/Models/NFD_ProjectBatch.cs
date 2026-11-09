
using System.ComponentModel.DataAnnotations;

namespace Nafadh_Backend.Models
{
    public class NFD_ProjectBatch
    {
        [Key]
        public int ProjectBatchId { get; set; }

        [Required]
        public int ProjectId { get; set; }

        public NFD_Project Project { get; set; } = null!;

        [Required]
        public int BatchId { get; set; }

        public NFD_Batch Batch { get; set; } = null!;
    }
}
