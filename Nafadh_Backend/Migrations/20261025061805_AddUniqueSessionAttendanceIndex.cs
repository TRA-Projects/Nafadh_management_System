using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nafadh_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddUniqueSessionAttendanceIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_NFD_SessionAttendances_SessionId",
                table: "NFD_SessionAttendances");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_SessionAttendances_SessionId_TraineeId",
                table: "NFD_SessionAttendances",
                columns: new[] { "SessionId", "TraineeId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_NFD_SessionAttendances_SessionId_TraineeId",
                table: "NFD_SessionAttendances");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_SessionAttendances_SessionId",
                table: "NFD_SessionAttendances",
                column: "SessionId");
        }
    }
}
