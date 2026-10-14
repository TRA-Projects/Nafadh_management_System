using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nafadh_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddTraineeAddressAndBankFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AccountHolderName",
                table: "NFD_Trainees",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AccountNumber",
                table: "NFD_Trainees",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BankBranch",
                table: "NFD_Trainees",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BankName",
                table: "NFD_Trainees",
                type: "nvarchar(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Governorate",
                table: "NFD_Trainees",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IBAN",
                table: "NFD_Trainees",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Village",
                table: "NFD_Trainees",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Wilaya",
                table: "NFD_Trainees",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AccountHolderName",
                table: "NFD_Trainees");

            migrationBuilder.DropColumn(
                name: "AccountNumber",
                table: "NFD_Trainees");

            migrationBuilder.DropColumn(
                name: "BankBranch",
                table: "NFD_Trainees");

            migrationBuilder.DropColumn(
                name: "BankName",
                table: "NFD_Trainees");

            migrationBuilder.DropColumn(
                name: "Governorate",
                table: "NFD_Trainees");

            migrationBuilder.DropColumn(
                name: "IBAN",
                table: "NFD_Trainees");

            migrationBuilder.DropColumn(
                name: "Village",
                table: "NFD_Trainees");

            migrationBuilder.DropColumn(
                name: "Wilaya",
                table: "NFD_Trainees");
        }
    }
}
