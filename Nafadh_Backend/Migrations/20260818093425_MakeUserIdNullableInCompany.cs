using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nafadh_Backend.Migrations
{
    /// <inheritdoc />
    public partial class MakeUserIdNullableInCompany : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_NFD_Companies_UserId",
                table: "NFD_Companies");

            migrationBuilder.AlterColumn<int>(
                name: "UserId",
                table: "NFD_Companies",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Companies_UserId",
                table: "NFD_Companies",
                column: "UserId",
                unique: true,
                filter: "[UserId] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_NFD_Companies_UserId",
                table: "NFD_Companies");

            migrationBuilder.AlterColumn<int>(
                name: "UserId",
                table: "NFD_Companies",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Companies_UserId",
                table: "NFD_Companies",
                column: "UserId",
                unique: true);
        }
    }
}
