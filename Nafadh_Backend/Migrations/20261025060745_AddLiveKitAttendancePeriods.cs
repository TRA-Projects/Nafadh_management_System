using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nafadh_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddLiveKitAttendancePeriods : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NFD_SessionAttendancePeriods",
                columns: table => new
                {
                    PeriodId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SessionId = table.Column<int>(type: "int", nullable: false),
                    TraineeId = table.Column<int>(type: "int", nullable: false),
                    ParticipantSid = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    JoinedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LeftAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DurationSeconds = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_SessionAttendancePeriods", x => x.PeriodId);
                    table.ForeignKey(
                        name: "FK_NFD_SessionAttendancePeriods_NFD_Sessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "NFD_Sessions",
                        principalColumn: "SessionId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_SessionAttendancePeriods_NFD_Trainees_TraineeId",
                        column: x => x.TraineeId,
                        principalTable: "NFD_Trainees",
                        principalColumn: "TraineeId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NFD_SessionAttendancePeriods_ParticipantSid",
                table: "NFD_SessionAttendancePeriods",
                column: "ParticipantSid",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NFD_SessionAttendancePeriods_SessionId_TraineeId",
                table: "NFD_SessionAttendancePeriods",
                columns: new[] { "SessionId", "TraineeId" });

            migrationBuilder.CreateIndex(
                name: "IX_NFD_SessionAttendancePeriods_TraineeId",
                table: "NFD_SessionAttendancePeriods",
                column: "TraineeId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NFD_SessionAttendancePeriods");
        }
    }
}
