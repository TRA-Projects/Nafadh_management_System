using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nafadh_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddAdminBatchEvaluationSettingsAndProjectScores : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "AtRiskMinAttendance",
                table: "NFD_Batches",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "AttendanceWeight",
                table: "NFD_Batches",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ExcellentMinAttendance",
                table: "NFD_Batches",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ExcellentMinScore",
                table: "NFD_Batches",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "GoodMinScore",
                table: "NFD_Batches",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "ProjectsWeight",
                table: "NFD_Batches",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "QuizzesWeight",
                table: "NFD_Batches",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "TasksWeight",
                table: "NFD_Batches",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "VeryGoodMinAttendance",
                table: "NFD_Batches",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "VeryGoodMinScore",
                table: "NFD_Batches",
                type: "decimal(5,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateTable(
                name: "NFD_AdminProjectScores",
                columns: table => new
                {
                    AdminProjectScoreId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Score = table.Column<decimal>(type: "decimal(5,2)", nullable: false),
                    Notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EnrollmentId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_AdminProjectScores", x => x.AdminProjectScoreId);
                    table.ForeignKey(
                        name: "FK_NFD_AdminProjectScores_NFD_Enrollments_EnrollmentId",
                        column: x => x.EnrollmentId,
                        principalTable: "NFD_Enrollments",
                        principalColumn: "EnrollmentId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NFD_AdminProjectScores_EnrollmentId",
                table: "NFD_AdminProjectScores",
                column: "EnrollmentId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NFD_AdminProjectScores");

            migrationBuilder.DropColumn(
                name: "AtRiskMinAttendance",
                table: "NFD_Batches");

            migrationBuilder.DropColumn(
                name: "AttendanceWeight",
                table: "NFD_Batches");

            migrationBuilder.DropColumn(
                name: "ExcellentMinAttendance",
                table: "NFD_Batches");

            migrationBuilder.DropColumn(
                name: "ExcellentMinScore",
                table: "NFD_Batches");

            migrationBuilder.DropColumn(
                name: "GoodMinScore",
                table: "NFD_Batches");

            migrationBuilder.DropColumn(
                name: "ProjectsWeight",
                table: "NFD_Batches");

            migrationBuilder.DropColumn(
                name: "QuizzesWeight",
                table: "NFD_Batches");

            migrationBuilder.DropColumn(
                name: "TasksWeight",
                table: "NFD_Batches");

            migrationBuilder.DropColumn(
                name: "VeryGoodMinAttendance",
                table: "NFD_Batches");

            migrationBuilder.DropColumn(
                name: "VeryGoodMinScore",
                table: "NFD_Batches");
        }
    }
}
