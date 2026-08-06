using System.ComponentModel.DataAnnotations;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.DTOs
{
    // ── Add Task DTO ─────────────────────────────────────────
    public class AddTaskDto
    {
        [Required(ErrorMessage = "Title is required.")]
        [MaxLength(150)]
        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        [Required(ErrorMessage = "Due date is required.")]
        public DateTime DueDate { get; set; }

        [Required(ErrorMessage = "Priority is required.")]
        public NFD_TaskPriority Priority { get; set; }

        [Required(ErrorMessage = "Status is required.")]
        public NFD_TaskStatus Status { get; set; }

        [Required(ErrorMessage = "Batch Id is required.")]
        public int BatchId { get; set; }

        [Required(ErrorMessage = "Created By User Id is required.")]
        public int CreatedByUserId { get; set; }
    }

    // ── Update Task DTO ─────────────────────────────────────────
    public class UpdateTaskDto
    {
        [Required(ErrorMessage = "Title is required.")]
        [MaxLength(150)]
        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        [Required(ErrorMessage = "Due date is required.")]
        public DateTime DueDate { get; set; }

        [Required(ErrorMessage = "Priority is required.")]
        public NFD_TaskPriority Priority { get; set; }

        [Required(ErrorMessage = "Status is required.")]
        public NFD_TaskStatus Status { get; set; }

        [Required(ErrorMessage = "Batch Id is required.")]
        public int BatchId { get; set; }

        [Required(ErrorMessage = "Created By User Id is required.")]
        public int CreatedByUserId { get; set; }
    }

    // ── Response Task DTO ─────────────────────────────────────────
    public class TaskResponseDto
    {
        public int TaskId { get; set; }

        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        public DateTime DueDate { get; set; }

        public NFD_TaskPriority Priority { get; set; }

        public NFD_TaskStatus Status { get; set; }

        public int BatchId { get; set; }

        public int CreatedByUserId { get; set; }
    }
}