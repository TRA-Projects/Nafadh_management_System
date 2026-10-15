using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nafadh_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddQuizAttemptViolations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsTerminatedByViolation",
                table: "NFD_QuizAttempts",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "ViolationCount",
                table: "NFD_QuizAttempts",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsTerminatedByViolation",
                table: "NFD_QuizAttempts");

            migrationBuilder.DropColumn(
                name: "ViolationCount",
                table: "NFD_QuizAttempts");
        }
    }
}
