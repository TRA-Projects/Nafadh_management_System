using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nafadh_Backend.Migrations
{
    public partial class LinkCoursePlansToProgramsAndAddTrainerAssignments : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ProgramId",
                table: "NFD_CoursePlans",
                type: "int",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "NFD_CoursePlanStageTrainers",
                columns: table => new
                {
                    StageId = table.Column<int>(type: "int", nullable: false),
                    TrainerId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_CoursePlanStageTrainers", x => new { x.StageId, x.TrainerId });
                    table.ForeignKey(
                        name: "FK_NFD_CoursePlanStageTrainers_NFD_CoursePlanStages_StageId",
                        column: x => x.StageId,
                        principalTable: "NFD_CoursePlanStages",
                        principalColumn: "StageId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NFD_CoursePlanStageTrainers_NFD_Trainers_TrainerId",
                        column: x => x.TrainerId,
                        principalTable: "NFD_Trainers",
                        principalColumn: "TrainerId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_CoursePlanTrainers",
                columns: table => new
                {
                    PlanId = table.Column<int>(type: "int", nullable: false),
                    TrainerId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_CoursePlanTrainers", x => new { x.PlanId, x.TrainerId });
                    table.ForeignKey(
                        name: "FK_NFD_CoursePlanTrainers_NFD_CoursePlans_PlanId",
                        column: x => x.PlanId,
                        principalTable: "NFD_CoursePlans",
                        principalColumn: "PlanId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NFD_CoursePlanTrainers_NFD_Trainers_TrainerId",
                        column: x => x.TrainerId,
                        principalTable: "NFD_Trainers",
                        principalColumn: "TrainerId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NFD_CoursePlans_ProgramId",
                table: "NFD_CoursePlans",
                column: "ProgramId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_CoursePlanStageTrainers_TrainerId",
                table: "NFD_CoursePlanStageTrainers",
                column: "TrainerId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_CoursePlanTrainers_TrainerId",
                table: "NFD_CoursePlanTrainers",
                column: "TrainerId");

            migrationBuilder.AddForeignKey(
                name: "FK_NFD_CoursePlans_NFD_Programs_ProgramId",
                table: "NFD_CoursePlans",
                column: "ProgramId",
                principalTable: "NFD_Programs",
                principalColumn: "ProgramId",
                onDelete: ReferentialAction.Restrict);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_NFD_CoursePlans_NFD_Programs_ProgramId",
                table: "NFD_CoursePlans");

            migrationBuilder.DropTable(
                name: "NFD_CoursePlanStageTrainers");

            migrationBuilder.DropTable(
                name: "NFD_CoursePlanTrainers");

            migrationBuilder.DropIndex(
                name: "IX_NFD_CoursePlans_ProgramId",
                table: "NFD_CoursePlans");

            migrationBuilder.DropColumn(
                name: "ProgramId",
                table: "NFD_CoursePlans");
        }
    }
}
