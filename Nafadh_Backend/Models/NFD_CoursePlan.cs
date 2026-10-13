using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;
using Nafadh_Backend.Enums;

namespace Nafadh_Backend.Models
{
    /// <summary>
    /// Maps to [NFD_CoursePlans]. A course proposed by a host company: its stages,
    /// tasks and projects, assigned to trainers. It must be approved by the Authority
    /// before execution can start. Independent from NFD_Programs on purpose, so
    /// unapproved company proposals never appear in the Authority's program catalogue.
    /// </summary>
    public class NFD_CoursePlan
    {
        [Key]
        public int PlanId { get; set; }

        public int CompanyId { get; set; }
        public NFD_Company Company { get; set; } = null!;

        /// <summary>Canonical course/program record. Nullable keeps existing plans compatible.</summary>
        public int? ProgramId { get; set; }
        public NFD_Program? Program { get; set; }

        public int CreatedByUserId { get; set; }
        public NFD_User CreatedByUser { get; set; } = null!;

        [Required]
        [MaxLength(150)]
        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        [MaxLength(100)]
        public string? Category { get; set; }

        [Column(TypeName = "decimal(18,2)")]
        public decimal DurationHours { get; set; }

        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }

        public NFD_CoursePlanApprovalStatus ApprovalStatus { get; set; }
        public NFD_CoursePlanExecutionStatus ExecutionStatus { get; set; }

        public DateTime? SubmittedAt { get; set; }
        public DateTime? ReviewedAt { get; set; }
        public int? ReviewedByUserId { get; set; }
        public NFD_User? ReviewedByUser { get; set; }

        /// <summary>The Authority's note on its latest decision (shown to the company).</summary>
        public string? ReviewNote { get; set; }

        public DateTime? StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }

        public DateTime CreatedAt { get; set; }
        public DateTime UpdatedAt { get; set; }

        public ICollection<NFD_CoursePlanStage> Stages { get; set; } = new List<NFD_CoursePlanStage>();
        public ICollection<NFD_CoursePlanTrainer> Trainers { get; set; } = new List<NFD_CoursePlanTrainer>();
        public ICollection<NFD_CoursePlanNote> Notes { get; set; } = new List<NFD_CoursePlanNote>();
    }

    /// <summary>Maps to [NFD_CoursePlanStages] — one phase of the course.</summary>
    public class NFD_CoursePlanStage
    {
        [Key]
        public int StageId { get; set; }

        public int PlanId { get; set; }
        public NFD_CoursePlan Plan { get; set; } = null!;

        [Required]
        [MaxLength(150)]
        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        public int OrderIndex { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }

        public int? TrainerId { get; set; }
        public NFD_Trainer? Trainer { get; set; }

        public NFD_CoursePlanProgressStatus Status { get; set; }

        public ICollection<NFD_CoursePlanItem> Items { get; set; } = new List<NFD_CoursePlanItem>();
        public ICollection<NFD_CoursePlanStageTrainer> Trainers { get; set; } = new List<NFD_CoursePlanStageTrainer>();
    }

    /// <summary>Maps to [NFD_CoursePlanItems] — a task or project inside a stage.</summary>
    public class NFD_CoursePlanItem
    {
        [Key]
        public int ItemId { get; set; }

        public int StageId { get; set; }
        public NFD_CoursePlanStage Stage { get; set; } = null!;

        public NFD_CoursePlanItemType ItemType { get; set; }

        [Required]
        [MaxLength(150)]
        public string Title { get; set; } = string.Empty;

        public string? Description { get; set; }

        public DateTime DueDate { get; set; }
        public NFD_TaskPriority Priority { get; set; }
        public NFD_CoursePlanProgressStatus Status { get; set; }

        public int? TrainerId { get; set; }
        public NFD_Trainer? Trainer { get; set; }
    }

    /// <summary>Maps to [NFD_CoursePlanNotes] — notes by the company or the Authority.</summary>
    public class NFD_CoursePlanNote
    {
        [Key]
        public int NoteId { get; set; }

        public int PlanId { get; set; }
        public NFD_CoursePlan Plan { get; set; } = null!;

        public int? StageId { get; set; }
        public NFD_CoursePlanStage? Stage { get; set; }

        public int? ItemId { get; set; }
        public NFD_CoursePlanItem? Item { get; set; }

        public int UserId { get; set; }
        public NFD_User User { get; set; } = null!;

        [Required]
        public string Text { get; set; } = string.Empty;

        /// <summary>True when written by the Authority (approval/rejection feedback).</summary>
        public bool IsAuthority { get; set; }

        public DateTime CreatedAt { get; set; }
    }

    /// <summary>Fluent configuration for the course-plan tables (called from NafadhContext).</summary>
    public static class CoursePlanModelBuilderExtensions
    {
        public static void ConfigureCoursePlans(this ModelBuilder modelBuilder)
        {
            modelBuilder.Entity<NFD_CoursePlan>(entity =>
            {
                entity.ToTable("NFD_CoursePlans");
                entity.HasIndex(e => new { e.CompanyId, e.ApprovalStatus });
                entity.HasIndex(e => e.ProgramId);
                entity.HasOne(e => e.Program)
                    .WithMany()
                    .HasForeignKey(e => e.ProgramId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Company)
                    .WithMany()
                    .HasForeignKey(e => e.CompanyId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.CreatedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.CreatedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.ReviewedByUser)
                    .WithMany()
                    .HasForeignKey(e => e.ReviewedByUserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<NFD_CoursePlanTrainer>(entity =>
            {
                entity.ToTable("NFD_CoursePlanTrainers");
                entity.HasKey(e => new { e.PlanId, e.TrainerId });
                entity.HasIndex(e => e.TrainerId);
                entity.HasOne(e => e.Plan)
                    .WithMany(p => p.Trainers)
                    .HasForeignKey(e => e.PlanId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Trainer)
                    .WithMany()
                    .HasForeignKey(e => e.TrainerId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<NFD_CoursePlanStage>(entity =>
            {
                entity.ToTable("NFD_CoursePlanStages");
                entity.HasOne(e => e.Plan)
                    .WithMany(p => p.Stages)
                    .HasForeignKey(e => e.PlanId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Trainer)
                    .WithMany()
                    .HasForeignKey(e => e.TrainerId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<NFD_CoursePlanStageTrainer>(entity =>
            {
                entity.ToTable("NFD_CoursePlanStageTrainers");
                entity.HasKey(e => new { e.StageId, e.TrainerId });
                entity.HasIndex(e => e.TrainerId);
                entity.HasOne(e => e.Stage)
                    .WithMany(s => s.Trainers)
                    .HasForeignKey(e => e.StageId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Trainer)
                    .WithMany()
                    .HasForeignKey(e => e.TrainerId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<NFD_CoursePlanItem>(entity =>
            {
                entity.ToTable("NFD_CoursePlanItems");
                entity.HasOne(e => e.Stage)
                    .WithMany(s => s.Items)
                    .HasForeignKey(e => e.StageId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Trainer)
                    .WithMany()
                    .HasForeignKey(e => e.TrainerId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            modelBuilder.Entity<NFD_CoursePlanNote>(entity =>
            {
                entity.ToTable("NFD_CoursePlanNotes");
                entity.HasOne(e => e.Plan)
                    .WithMany(p => p.Notes)
                    .HasForeignKey(e => e.PlanId)
                    .OnDelete(DeleteBehavior.Cascade);
                entity.HasOne(e => e.Stage)
                    .WithMany()
                    .HasForeignKey(e => e.StageId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.Item)
                    .WithMany()
                    .HasForeignKey(e => e.ItemId)
                    .OnDelete(DeleteBehavior.Restrict);
                entity.HasOne(e => e.User)
                    .WithMany()
                    .HasForeignKey(e => e.UserId)
                    .OnDelete(DeleteBehavior.Restrict);
            });
        }
    }
}
