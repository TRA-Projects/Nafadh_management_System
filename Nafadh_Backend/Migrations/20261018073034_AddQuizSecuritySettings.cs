using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nafadh_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddQuizSecuritySettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AllowBackNavigation",
                table: "NFD_Quizzes",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<int>(
                name: "ExitLimitAction",
                table: "NFD_Quizzes",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "MaxExitAttempts",
                table: "NFD_Quizzes",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "PreventCopyPaste",
                table: "NFD_Quizzes",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "RandomizeOptions",
                table: "NFD_Quizzes",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ShowCorrectAnswers",
                table: "NFD_Quizzes",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ShowOneQuestionAtTime",
                table: "NFD_Quizzes",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ShowResultImmediately",
                table: "NFD_Quizzes",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "ShowScoreToTrainee",
                table: "NFD_Quizzes",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AllowBackNavigation",
                table: "NFD_Quizzes");

            migrationBuilder.DropColumn(
                name: "ExitLimitAction",
                table: "NFD_Quizzes");

            migrationBuilder.DropColumn(
                name: "MaxExitAttempts",
                table: "NFD_Quizzes");

            migrationBuilder.DropColumn(
                name: "PreventCopyPaste",
                table: "NFD_Quizzes");

            migrationBuilder.DropColumn(
                name: "RandomizeOptions",
                table: "NFD_Quizzes");

            migrationBuilder.DropColumn(
                name: "ShowCorrectAnswers",
                table: "NFD_Quizzes");

            migrationBuilder.DropColumn(
                name: "ShowOneQuestionAtTime",
                table: "NFD_Quizzes");

            migrationBuilder.DropColumn(
                name: "ShowResultImmediately",
                table: "NFD_Quizzes");

            migrationBuilder.DropColumn(
                name: "ShowScoreToTrainee",
                table: "NFD_Quizzes");
        }
    }
}
