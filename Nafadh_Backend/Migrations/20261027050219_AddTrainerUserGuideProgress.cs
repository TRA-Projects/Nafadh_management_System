using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nafadh_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddTrainerUserGuideProgress : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_NFD_UserGuideProgress_TraineeId_GuideKey",
                table: "NFD_UserGuideProgress");

            migrationBuilder.AlterColumn<int>(
                name: "TraineeId",
                table: "NFD_UserGuideProgress",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<int>(
                name: "TrainerId",
                table: "NFD_UserGuideProgress",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_NFD_UserGuideProgress_TraineeId_GuideKey",
                table: "NFD_UserGuideProgress",
                columns: new[] { "TraineeId", "GuideKey" },
                unique: true,
                filter: "[TraineeId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_UserGuideProgress_TrainerId_GuideKey",
                table: "NFD_UserGuideProgress",
                columns: new[] { "TrainerId", "GuideKey" },
                unique: true,
                filter: "[TrainerId] IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "CK_UserGuideProgress_Owner",
                table: "NFD_UserGuideProgress",
                sql: "([TraineeId] IS NOT NULL AND [TrainerId] IS NULL) OR ([TraineeId] IS NULL AND [TrainerId] IS NOT NULL)");

            migrationBuilder.AddForeignKey(
                name: "FK_NFD_UserGuideProgress_NFD_Trainers_TrainerId",
                table: "NFD_UserGuideProgress",
                column: "TrainerId",
                principalTable: "NFD_Trainers",
                principalColumn: "TrainerId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_NFD_UserGuideProgress_NFD_Trainers_TrainerId",
                table: "NFD_UserGuideProgress");

            migrationBuilder.DropIndex(
                name: "IX_NFD_UserGuideProgress_TraineeId_GuideKey",
                table: "NFD_UserGuideProgress");

            migrationBuilder.DropIndex(
                name: "IX_NFD_UserGuideProgress_TrainerId_GuideKey",
                table: "NFD_UserGuideProgress");

            migrationBuilder.DropCheckConstraint(
                name: "CK_UserGuideProgress_Owner",
                table: "NFD_UserGuideProgress");

            migrationBuilder.DropColumn(
                name: "TrainerId",
                table: "NFD_UserGuideProgress");

            migrationBuilder.AlterColumn<int>(
                name: "TraineeId",
                table: "NFD_UserGuideProgress",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_NFD_UserGuideProgress_TraineeId_GuideKey",
                table: "NFD_UserGuideProgress",
                columns: new[] { "TraineeId", "GuideKey" },
                unique: true);
        }
    }
}
