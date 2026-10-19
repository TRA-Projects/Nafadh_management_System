using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nafadh_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddQuizProctoring : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "IdentityCheckStatus",
                table: "NFD_QuizAttempts",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "NeedsManualReview",
                table: "NFD_QuizAttempts",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateTable(
                name: "NFD_QuizProctoringEvents",
                columns: table => new
                {
                    EventId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AttemptId = table.Column<int>(type: "int", nullable: false),
                    EventType = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    Details = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    SnapshotFileName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_QuizProctoringEvents", x => x.EventId);
                    table.ForeignKey(
                        name: "FK_NFD_QuizProctoringEvents_NFD_QuizAttempts_AttemptId",
                        column: x => x.AttemptId,
                        principalTable: "NFD_QuizAttempts",
                        principalColumn: "AttemptId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NFD_QuizProctoringEvents_AttemptId",
                table: "NFD_QuizProctoringEvents",
                column: "AttemptId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NFD_QuizProctoringEvents");

            migrationBuilder.DropColumn(
                name: "IdentityCheckStatus",
                table: "NFD_QuizAttempts");

            migrationBuilder.DropColumn(
                name: "NeedsManualReview",
                table: "NFD_QuizAttempts");
        }
    }
}
