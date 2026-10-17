using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nafadh_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddCompanyCoursePlans : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NFD_CoursePlans",
                columns: table => new
                {
                    PlanId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CompanyId = table.Column<int>(type: "int", nullable: false),
                    CreatedByUserId = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Category = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    DurationHours = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ApprovalStatus = table.Column<int>(type: "int", nullable: false),
                    ExecutionStatus = table.Column<int>(type: "int", nullable: false),
                    SubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReviewedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ReviewedByUserId = table.Column<int>(type: "int", nullable: true),
                    ReviewNote = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    StartedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_CoursePlans", x => x.PlanId);
                    table.ForeignKey(
                        name: "FK_NFD_CoursePlans_NFD_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "NFD_Companies",
                        principalColumn: "CompanyId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_CoursePlans_NFD_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "NFD_Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_CoursePlans_NFD_Users_ReviewedByUserId",
                        column: x => x.ReviewedByUserId,
                        principalTable: "NFD_Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_CoursePlanStages",
                columns: table => new
                {
                    StageId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PlanId = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    OrderIndex = table.Column<int>(type: "int", nullable: false),
                    StartDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    TrainerId = table.Column<int>(type: "int", nullable: true),
                    Status = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_CoursePlanStages", x => x.StageId);
                    table.ForeignKey(
                        name: "FK_NFD_CoursePlanStages_NFD_CoursePlans_PlanId",
                        column: x => x.PlanId,
                        principalTable: "NFD_CoursePlans",
                        principalColumn: "PlanId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NFD_CoursePlanStages_NFD_Trainers_TrainerId",
                        column: x => x.TrainerId,
                        principalTable: "NFD_Trainers",
                        principalColumn: "TrainerId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_CoursePlanItems",
                columns: table => new
                {
                    ItemId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    StageId = table.Column<int>(type: "int", nullable: false),
                    ItemType = table.Column<int>(type: "int", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DueDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Priority = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    TrainerId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_CoursePlanItems", x => x.ItemId);
                    table.ForeignKey(
                        name: "FK_NFD_CoursePlanItems_NFD_CoursePlanStages_StageId",
                        column: x => x.StageId,
                        principalTable: "NFD_CoursePlanStages",
                        principalColumn: "StageId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NFD_CoursePlanItems_NFD_Trainers_TrainerId",
                        column: x => x.TrainerId,
                        principalTable: "NFD_Trainers",
                        principalColumn: "TrainerId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_CoursePlanNotes",
                columns: table => new
                {
                    NoteId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PlanId = table.Column<int>(type: "int", nullable: false),
                    StageId = table.Column<int>(type: "int", nullable: true),
                    ItemId = table.Column<int>(type: "int", nullable: true),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Text = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsAuthority = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_CoursePlanNotes", x => x.NoteId);
                    table.ForeignKey(
                        name: "FK_NFD_CoursePlanNotes_NFD_CoursePlanItems_ItemId",
                        column: x => x.ItemId,
                        principalTable: "NFD_CoursePlanItems",
                        principalColumn: "ItemId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_CoursePlanNotes_NFD_CoursePlanStages_StageId",
                        column: x => x.StageId,
                        principalTable: "NFD_CoursePlanStages",
                        principalColumn: "StageId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_CoursePlanNotes_NFD_CoursePlans_PlanId",
                        column: x => x.PlanId,
                        principalTable: "NFD_CoursePlans",
                        principalColumn: "PlanId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NFD_CoursePlanNotes_NFD_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "NFD_Users",
                        principalColumn: "UserId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NFD_CoursePlanItems_StageId",
                table: "NFD_CoursePlanItems",
                column: "StageId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_CoursePlanItems_TrainerId",
                table: "NFD_CoursePlanItems",
                column: "TrainerId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_CoursePlanNotes_ItemId",
                table: "NFD_CoursePlanNotes",
                column: "ItemId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_CoursePlanNotes_PlanId",
                table: "NFD_CoursePlanNotes",
                column: "PlanId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_CoursePlanNotes_StageId",
                table: "NFD_CoursePlanNotes",
                column: "StageId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_CoursePlanNotes_UserId",
                table: "NFD_CoursePlanNotes",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_CoursePlans_CompanyId_ApprovalStatus",
                table: "NFD_CoursePlans",
                columns: new[] { "CompanyId", "ApprovalStatus" });

            migrationBuilder.CreateIndex(
                name: "IX_NFD_CoursePlans_CreatedByUserId",
                table: "NFD_CoursePlans",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_CoursePlans_ReviewedByUserId",
                table: "NFD_CoursePlans",
                column: "ReviewedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_CoursePlanStages_PlanId",
                table: "NFD_CoursePlanStages",
                column: "PlanId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_CoursePlanStages_TrainerId",
                table: "NFD_CoursePlanStages",
                column: "TrainerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NFD_CoursePlanNotes");

            migrationBuilder.DropTable(
                name: "NFD_CoursePlanItems");

            migrationBuilder.DropTable(
                name: "NFD_CoursePlanStages");

            migrationBuilder.DropTable(
                name: "NFD_CoursePlans");
        }
    }
}
