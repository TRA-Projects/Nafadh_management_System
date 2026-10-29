using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nafadh_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddTraineeReportFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AttendanceNotes",
                table: "NFD_Trainees",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "AttendanceRate",
                table: "NFD_Trainees",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BehavioralNotes",
                table: "NFD_Trainees",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "BehavioralScore",
                table: "NFD_Trainees",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ProjectNotes",
                table: "NFD_Trainees",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ProjectScore",
                table: "NFD_Trainees",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TechnicalNotes",
                table: "NFD_Trainees",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "TechnicalScore",
                table: "NFD_Trainees",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TrainerNotes",
                table: "NFD_Trainees",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "TrainerRecommendation",
                table: "NFD_Trainees",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AttendanceNotes",
                table: "NFD_Trainees");

            migrationBuilder.DropColumn(
                name: "AttendanceRate",
                table: "NFD_Trainees");

            migrationBuilder.DropColumn(
                name: "BehavioralNotes",
                table: "NFD_Trainees");

            migrationBuilder.DropColumn(
                name: "BehavioralScore",
                table: "NFD_Trainees");

            migrationBuilder.DropColumn(
                name: "ProjectNotes",
                table: "NFD_Trainees");

            migrationBuilder.DropColumn(
                name: "ProjectScore",
                table: "NFD_Trainees");

            migrationBuilder.DropColumn(
                name: "TechnicalNotes",
                table: "NFD_Trainees");

            migrationBuilder.DropColumn(
                name: "TechnicalScore",
                table: "NFD_Trainees");

            migrationBuilder.DropColumn(
                name: "TrainerNotes",
                table: "NFD_Trainees");

            migrationBuilder.DropColumn(
                name: "TrainerRecommendation",
                table: "NFD_Trainees");
        }
    }
}
