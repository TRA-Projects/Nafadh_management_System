using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nafadh_Backend.Migrations
{
    [DbContext(typeof(Nafadhcontext))]
    [Migration("20261110090000_AddCompanyTrainerOwnership")]
    public partial class AddCompanyTrainerOwnership : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(name: "CompanyId", table: "NFD_Trainers", type: "int", nullable: true);
            migrationBuilder.CreateIndex(name: "IX_NFD_Trainers_CompanyId", table: "NFD_Trainers", column: "CompanyId");
            migrationBuilder.AddForeignKey(name: "FK_NFD_Trainers_NFD_Companies_CompanyId", table: "NFD_Trainers", column: "CompanyId", principalTable: "NFD_Companies", principalColumn: "CompanyId", onDelete: ReferentialAction.Restrict);
            // Intentionally do not assign existing trainers automatically: enrollments may span many companies.
            // Existing trainers must be classified by the data owner before an ownership backfill.
        }
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(name: "FK_NFD_Trainers_NFD_Companies_CompanyId", table: "NFD_Trainers");
            migrationBuilder.DropIndex(name: "IX_NFD_Trainers_CompanyId", table: "NFD_Trainers");
            migrationBuilder.DropColumn(name: "CompanyId", table: "NFD_Trainers");
        }
    }
}
