using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nafadh_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddCompanySupervisorTrainersTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NFD_CompanySupervisorTrainers",
                columns: table => new
                {
                    SupervisorId = table.Column<int>(type: "int", nullable: false),
                    TrainerId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_CompanySupervisorTrainers", x => new { x.SupervisorId, x.TrainerId });
                    table.ForeignKey(
                        name: "FK_NFD_CompanySupervisorTrainers_NFD_CompanySupervisors_SupervisorId",
                        column: x => x.SupervisorId,
                        principalTable: "NFD_CompanySupervisors",
                        principalColumn: "SupervisorId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NFD_CompanySupervisorTrainers_NFD_Trainers_TrainerId",
                        column: x => x.TrainerId,
                        principalTable: "NFD_Trainers",
                        principalColumn: "TrainerId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_CompanyTrainerEvaluations",
                columns: table => new
                {
                    EvaluationId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SupervisorId = table.Column<int>(type: "int", nullable: false),
                    TrainerId = table.Column<int>(type: "int", nullable: false),
                    Rating = table.Column<int>(type: "int", nullable: false),
                    Comment = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_CompanyTrainerEvaluations", x => x.EvaluationId);
                    table.ForeignKey(
                        name: "FK_NFD_CompanyTrainerEvaluations_NFD_CompanySupervisors_SupervisorId",
                        column: x => x.SupervisorId,
                        principalTable: "NFD_CompanySupervisors",
                        principalColumn: "SupervisorId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_CompanyTrainerEvaluations_NFD_Trainers_TrainerId",
                        column: x => x.TrainerId,
                        principalTable: "NFD_Trainers",
                        principalColumn: "TrainerId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NFD_CompanySupervisorTrainers_TrainerId",
                table: "NFD_CompanySupervisorTrainers",
                column: "TrainerId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_CompanyTrainerEvaluations_SupervisorId_TrainerId",
                table: "NFD_CompanyTrainerEvaluations",
                columns: new[] { "SupervisorId", "TrainerId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NFD_CompanyTrainerEvaluations_TrainerId",
                table: "NFD_CompanyTrainerEvaluations",
                column: "TrainerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NFD_CompanySupervisorTrainers");

            migrationBuilder.DropTable(
                name: "NFD_CompanyTrainerEvaluations");
        }
    }
}
