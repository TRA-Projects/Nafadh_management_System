using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nafadh_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddQuizPassingPercentage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "PassingPercentage",
                table: "NFD_Quizzes",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 50m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PassingPercentage",
                table: "NFD_Quizzes");
        }
    }
}
