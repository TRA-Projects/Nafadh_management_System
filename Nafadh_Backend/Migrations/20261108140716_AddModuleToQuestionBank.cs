using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nafadh_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddModuleToQuestionBank : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "ModuleId",
                table: "NFD_QuestionBank",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_NFD_QuestionBank_ModuleId",
                table: "NFD_QuestionBank",
                column: "ModuleId");

            migrationBuilder.AddForeignKey(
                name: "FK_NFD_QuestionBank_NFD_Modules_ModuleId",
                table: "NFD_QuestionBank",
                column: "ModuleId",
                principalTable: "NFD_Modules",
                principalColumn: "ModuleId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_NFD_QuestionBank_NFD_Modules_ModuleId",
                table: "NFD_QuestionBank");

            migrationBuilder.DropIndex(
                name: "IX_NFD_QuestionBank_ModuleId",
                table: "NFD_QuestionBank");

            migrationBuilder.DropColumn(
                name: "ModuleId",
                table: "NFD_QuestionBank");
        }
    }
}
