using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nafadh_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddSessionSurveys : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NFD_SessionSurveys",
                columns: table => new
                {
                    SurveyId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SessionId = table.Column<int>(type: "int", nullable: false),
                    Question = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    IsPublished = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_SessionSurveys", x => x.SurveyId);
                    table.ForeignKey(
                        name: "FK_NFD_SessionSurveys_NFD_Sessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "NFD_Sessions",
                        principalColumn: "SessionId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_SessionSurveyResponses",
                columns: table => new
                {
                    ResponseId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SurveyId = table.Column<int>(type: "int", nullable: false),
                    TraineeId = table.Column<int>(type: "int", nullable: false),
                    Rating = table.Column<int>(type: "int", nullable: false),
                    Comment = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    SubmittedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_SessionSurveyResponses", x => x.ResponseId);
                    table.ForeignKey(
                        name: "FK_NFD_SessionSurveyResponses_NFD_SessionSurveys_SurveyId",
                        column: x => x.SurveyId,
                        principalTable: "NFD_SessionSurveys",
                        principalColumn: "SurveyId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NFD_SessionSurveyResponses_NFD_Trainees_TraineeId",
                        column: x => x.TraineeId,
                        principalTable: "NFD_Trainees",
                        principalColumn: "TraineeId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NFD_SessionSurveyResponses_SurveyId_TraineeId",
                table: "NFD_SessionSurveyResponses",
                columns: new[] { "SurveyId", "TraineeId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NFD_SessionSurveyResponses_TraineeId",
                table: "NFD_SessionSurveyResponses",
                column: "TraineeId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_SessionSurveys_SessionId",
                table: "NFD_SessionSurveys",
                column: "SessionId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NFD_SessionSurveyResponses");

            migrationBuilder.DropTable(
                name: "NFD_SessionSurveys");
        }
    }
}
