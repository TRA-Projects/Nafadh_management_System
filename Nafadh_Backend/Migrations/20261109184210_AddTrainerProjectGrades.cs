using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nafadh_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddTrainerProjectGrades : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NFD_TrainerProjectGrades",
                columns: table => new
                {
                    TrainerProjectGradeId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProjectId = table.Column<int>(type: "int", nullable: false),
                    EnrollmentId = table.Column<int>(type: "int", nullable: false),
                    TrainerId = table.Column<int>(type: "int", nullable: false),
                    Score = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    Feedback = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    GradedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_TrainerProjectGrades", x => x.TrainerProjectGradeId);
                    table.ForeignKey(
                        name: "FK_NFD_TrainerProjectGrades_NFD_Enrollments_EnrollmentId",
                        column: x => x.EnrollmentId,
                        principalTable: "NFD_Enrollments",
                        principalColumn: "EnrollmentId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_TrainerProjectGrades_NFD_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "NFD_Projects",
                        principalColumn: "ProjectId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_TrainerProjectGrades_NFD_Trainers_TrainerId",
                        column: x => x.TrainerId,
                        principalTable: "NFD_Trainers",
                        principalColumn: "TrainerId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NFD_TrainerProjectGrades_EnrollmentId",
                table: "NFD_TrainerProjectGrades",
                column: "EnrollmentId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_TrainerProjectGrades_ProjectId_EnrollmentId",
                table: "NFD_TrainerProjectGrades",
                columns: new[] { "ProjectId", "EnrollmentId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NFD_TrainerProjectGrades_TrainerId",
                table: "NFD_TrainerProjectGrades",
                column: "TrainerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NFD_TrainerProjectGrades");
        }
    }
}
