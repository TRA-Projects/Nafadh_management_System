using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nafadh_Backend.Migrations
{
    [DbContext(typeof(Nafadhcontext))]
    [Migration("20261110091000_AddTrainerExcuseReviewAudit")]
    public partial class AddTrainerExcuseReviewAudit : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(name: "ExcuseReviewedByUserId", table: "NFD_TrainerAttendances", type: "int", nullable: true);
            migrationBuilder.AddColumn<System.DateTime>(name: "ExcuseReviewedAtUtc", table: "NFD_TrainerAttendances", type: "datetime2", nullable: true);
        }
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(name: "ExcuseReviewedByUserId", table: "NFD_TrainerAttendances");
            migrationBuilder.DropColumn(name: "ExcuseReviewedAtUtc", table: "NFD_TrainerAttendances");
        }
    }
}
