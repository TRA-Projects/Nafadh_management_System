using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nafadh_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddCompanyToBatch : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CompanyId",
                table: "NFD_Batches",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Batches_CompanyId",
                table: "NFD_Batches",
                column: "CompanyId");

            migrationBuilder.AddForeignKey(
                name: "FK_NFD_Batches_NFD_Companies_CompanyId",
                table: "NFD_Batches",
                column: "CompanyId",
                principalTable: "NFD_Companies",
                principalColumn: "CompanyId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_NFD_Batches_NFD_Companies_CompanyId",
                table: "NFD_Batches");

            migrationBuilder.DropIndex(
                name: "IX_NFD_Batches_CompanyId",
                table: "NFD_Batches");

            migrationBuilder.DropColumn(
                name: "CompanyId",
                table: "NFD_Batches");
        }
    }
}
