using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nafadh_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddTraineeEvaluation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NFD_TraineeEvaluations",
                columns: table => new
                {
                    EvaluationId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AttemptId = table.Column<int>(type: "int", nullable: false),
                    Strengths = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    AreasForImprovement = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Recommendations = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    TrainerNotes = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    IsCompleted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_TraineeEvaluations", x => x.EvaluationId);
                    table.ForeignKey(
                        name: "FK_NFD_TraineeEvaluations_NFD_QuizAttempts_AttemptId",
                        column: x => x.AttemptId,
                        principalTable: "NFD_QuizAttempts",
                        principalColumn: "AttemptId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NFD_TraineeEvaluations_AttemptId",
                table: "NFD_TraineeEvaluations",
                column: "AttemptId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NFD_TraineeEvaluations");
        }
    }
}
