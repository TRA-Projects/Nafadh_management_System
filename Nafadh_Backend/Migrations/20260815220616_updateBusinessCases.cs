using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nafadh_Backend.Migrations
{
    /// <inheritdoc />
    public partial class updateBusinessCases : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<int>(
                name: "EnrollmentId",
                table: "NFD_Warnings",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<int>(
                name: "CompanyId",
                table: "NFD_Warnings",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Scope",
                table: "NFD_Warnings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "GitHubUrl",
                table: "NFD_Trainees",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LinkedInUrl",
                table: "NFD_Trainees",
                type: "nvarchar(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "VerificationStatus",
                table: "NFD_Trainees",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Category",
                table: "NFD_SupportTickets",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Type",
                table: "NFD_SupportTickets",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AlterColumn<int>(
                name: "ReceiverId",
                table: "NFD_Messages",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<int>(
                name: "TicketId",
                table: "NFD_Messages",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ModuleId",
                table: "NFD_EvaluationTemplates",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Stage",
                table: "NFD_EvaluationTemplates",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "MaxPoints",
                table: "NFD_EvaluationCriteria",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateTable(
                name: "NFD_Badges",
                columns: table => new
                {
                    BadgeId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    Icon = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    ConditionType = table.Column<int>(type: "int", nullable: false),
                    ConditionValue = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_Badges", x => x.BadgeId);
                });

            migrationBuilder.CreateTable(
                name: "NFD_EvaluationCriterionScores",
                columns: table => new
                {
                    ScoreId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Score = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    EvaluationId = table.Column<int>(type: "int", nullable: false),
                    CriteriaId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_EvaluationCriterionScores", x => x.ScoreId);
                    table.ForeignKey(
                        name: "FK_NFD_EvaluationCriterionScores_NFD_EvaluationCriteria_CriteriaId",
                        column: x => x.CriteriaId,
                        principalTable: "NFD_EvaluationCriteria",
                        principalColumn: "CriteriaId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_EvaluationCriterionScores_NFD_Evaluations_EvaluationId",
                        column: x => x.EvaluationId,
                        principalTable: "NFD_Evaluations",
                        principalColumn: "EvaluationId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NFD_FeedbackCriteria",
                columns: table => new
                {
                    CriterionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AppliesTo = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    OrderIndex = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_FeedbackCriteria", x => x.CriterionId);
                });

            migrationBuilder.CreateTable(
                name: "NFD_Feedbacks",
                columns: table => new
                {
                    FeedbackId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Type = table.Column<int>(type: "int", nullable: false),
                    Comment = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TraineeId = table.Column<int>(type: "int", nullable: false),
                    ModuleId = table.Column<int>(type: "int", nullable: false),
                    TrainerId = table.Column<int>(type: "int", nullable: true),
                    BatchId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_Feedbacks", x => x.FeedbackId);
                    table.ForeignKey(
                        name: "FK_NFD_Feedbacks_NFD_Batches_BatchId",
                        column: x => x.BatchId,
                        principalTable: "NFD_Batches",
                        principalColumn: "BatchId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_Feedbacks_NFD_Modules_ModuleId",
                        column: x => x.ModuleId,
                        principalTable: "NFD_Modules",
                        principalColumn: "ModuleId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_Feedbacks_NFD_Trainees_TraineeId",
                        column: x => x.TraineeId,
                        principalTable: "NFD_Trainees",
                        principalColumn: "TraineeId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_Feedbacks_NFD_Trainers_TrainerId",
                        column: x => x.TrainerId,
                        principalTable: "NFD_Trainers",
                        principalColumn: "TrainerId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_TraineeBadges",
                columns: table => new
                {
                    TraineeBadgeId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EarnedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TraineeId = table.Column<int>(type: "int", nullable: false),
                    BadgeId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_TraineeBadges", x => x.TraineeBadgeId);
                    table.ForeignKey(
                        name: "FK_NFD_TraineeBadges_NFD_Badges_BadgeId",
                        column: x => x.BadgeId,
                        principalTable: "NFD_Badges",
                        principalColumn: "BadgeId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_TraineeBadges_NFD_Trainees_TraineeId",
                        column: x => x.TraineeId,
                        principalTable: "NFD_Trainees",
                        principalColumn: "TraineeId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NFD_FeedbackScores",
                columns: table => new
                {
                    FeedbackScoreId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Score = table.Column<int>(type: "int", nullable: false),
                    FeedbackId = table.Column<int>(type: "int", nullable: false),
                    CriterionId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_FeedbackScores", x => x.FeedbackScoreId);
                    table.ForeignKey(
                        name: "FK_NFD_FeedbackScores_NFD_FeedbackCriteria_CriterionId",
                        column: x => x.CriterionId,
                        principalTable: "NFD_FeedbackCriteria",
                        principalColumn: "CriterionId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_FeedbackScores_NFD_Feedbacks_FeedbackId",
                        column: x => x.FeedbackId,
                        principalTable: "NFD_Feedbacks",
                        principalColumn: "FeedbackId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Warnings_CompanyId",
                table: "NFD_Warnings",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Messages_TicketId",
                table: "NFD_Messages",
                column: "TicketId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_EvaluationTemplates_ModuleId",
                table: "NFD_EvaluationTemplates",
                column: "ModuleId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_EvaluationCriterionScores_CriteriaId",
                table: "NFD_EvaluationCriterionScores",
                column: "CriteriaId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_EvaluationCriterionScores_EvaluationId",
                table: "NFD_EvaluationCriterionScores",
                column: "EvaluationId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Feedbacks_BatchId",
                table: "NFD_Feedbacks",
                column: "BatchId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Feedbacks_ModuleId",
                table: "NFD_Feedbacks",
                column: "ModuleId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Feedbacks_TraineeId",
                table: "NFD_Feedbacks",
                column: "TraineeId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Feedbacks_TrainerId",
                table: "NFD_Feedbacks",
                column: "TrainerId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_FeedbackScores_CriterionId",
                table: "NFD_FeedbackScores",
                column: "CriterionId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_FeedbackScores_FeedbackId",
                table: "NFD_FeedbackScores",
                column: "FeedbackId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_TraineeBadges_BadgeId",
                table: "NFD_TraineeBadges",
                column: "BadgeId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_TraineeBadges_TraineeId_BadgeId",
                table: "NFD_TraineeBadges",
                columns: new[] { "TraineeId", "BadgeId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_NFD_EvaluationTemplates_NFD_Modules_ModuleId",
                table: "NFD_EvaluationTemplates",
                column: "ModuleId",
                principalTable: "NFD_Modules",
                principalColumn: "ModuleId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_NFD_Messages_NFD_SupportTickets_TicketId",
                table: "NFD_Messages",
                column: "TicketId",
                principalTable: "NFD_SupportTickets",
                principalColumn: "TicketId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_NFD_Warnings_NFD_Companies_CompanyId",
                table: "NFD_Warnings",
                column: "CompanyId",
                principalTable: "NFD_Companies",
                principalColumn: "CompanyId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_NFD_EvaluationTemplates_NFD_Modules_ModuleId",
                table: "NFD_EvaluationTemplates");

            migrationBuilder.DropForeignKey(
                name: "FK_NFD_Messages_NFD_SupportTickets_TicketId",
                table: "NFD_Messages");

            migrationBuilder.DropForeignKey(
                name: "FK_NFD_Warnings_NFD_Companies_CompanyId",
                table: "NFD_Warnings");

            migrationBuilder.DropTable(
                name: "NFD_EvaluationCriterionScores");

            migrationBuilder.DropTable(
                name: "NFD_FeedbackScores");

            migrationBuilder.DropTable(
                name: "NFD_TraineeBadges");

            migrationBuilder.DropTable(
                name: "NFD_FeedbackCriteria");

            migrationBuilder.DropTable(
                name: "NFD_Feedbacks");

            migrationBuilder.DropTable(
                name: "NFD_Badges");

            migrationBuilder.DropIndex(
                name: "IX_NFD_Warnings_CompanyId",
                table: "NFD_Warnings");

            migrationBuilder.DropIndex(
                name: "IX_NFD_Messages_TicketId",
                table: "NFD_Messages");

            migrationBuilder.DropIndex(
                name: "IX_NFD_EvaluationTemplates_ModuleId",
                table: "NFD_EvaluationTemplates");

            migrationBuilder.DropColumn(
                name: "CompanyId",
                table: "NFD_Warnings");

            migrationBuilder.DropColumn(
                name: "Scope",
                table: "NFD_Warnings");

            migrationBuilder.DropColumn(
                name: "GitHubUrl",
                table: "NFD_Trainees");

            migrationBuilder.DropColumn(
                name: "LinkedInUrl",
                table: "NFD_Trainees");

            migrationBuilder.DropColumn(
                name: "VerificationStatus",
                table: "NFD_Trainees");

            migrationBuilder.DropColumn(
                name: "Category",
                table: "NFD_SupportTickets");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "NFD_SupportTickets");

            migrationBuilder.DropColumn(
                name: "TicketId",
                table: "NFD_Messages");

            migrationBuilder.DropColumn(
                name: "ModuleId",
                table: "NFD_EvaluationTemplates");

            migrationBuilder.DropColumn(
                name: "Stage",
                table: "NFD_EvaluationTemplates");

            migrationBuilder.DropColumn(
                name: "MaxPoints",
                table: "NFD_EvaluationCriteria");

            migrationBuilder.AlterColumn<int>(
                name: "EnrollmentId",
                table: "NFD_Warnings",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.AlterColumn<int>(
                name: "ReceiverId",
                table: "NFD_Messages",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);
        }
    }
}
