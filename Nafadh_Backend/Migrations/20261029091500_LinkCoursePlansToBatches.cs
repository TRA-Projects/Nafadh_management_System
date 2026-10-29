using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nafadh_Backend.Migrations
{
    [DbContext(typeof(Nafadhcontext))]
    [Migration("20261029091500_LinkCoursePlansToBatches")]
    public partial class LinkCoursePlansToBatches : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "BatchId", table: "NFD_CoursePlans", type: "int", nullable: true);

            // Legacy records: assign ONLY when the plan and batch identify each
            // other uniquely by program+company AND their time windows match.
            // No arbitrary FIRST/TOP choice and no deletion of existing data.
            migrationBuilder.Sql(@"
                UPDATE p SET BatchId = b.BatchId
                FROM dbo.NFD_CoursePlans p
                INNER JOIN dbo.NFD_Batches b
                    ON b.ProgramId = p.ProgramId AND b.CompanyId = p.CompanyId
                WHERE p.BatchId IS NULL
                    AND CONVERT(date, p.StartDate) = CONVERT(date, b.StartDate)
                    AND CONVERT(date, p.EndDate) = CONVERT(date, b.EndDate)
                    AND (SELECT COUNT(*) FROM dbo.NFD_CoursePlans cp
                         WHERE cp.ProgramId = p.ProgramId AND cp.CompanyId = p.CompanyId) = 1
                    AND (SELECT COUNT(*) FROM dbo.NFD_Batches bb
                         WHERE bb.ProgramId = p.ProgramId AND bb.CompanyId = p.CompanyId
                           AND CONVERT(date, bb.StartDate) = CONVERT(date, p.StartDate)
                           AND CONVERT(date, bb.EndDate) = CONVERT(date, p.EndDate)) = 1;
            ");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_CoursePlans_BatchId", table: "NFD_CoursePlans",
                column: "BatchId", unique: true, filter: "[BatchId] IS NOT NULL");
            migrationBuilder.AddForeignKey(
                name: "FK_NFD_CoursePlans_NFD_Batches_BatchId",
                table: "NFD_CoursePlans", column: "BatchId",
                principalTable: "NFD_Batches", principalColumn: "BatchId",
                onDelete: ReferentialAction.Restrict);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_NFD_CoursePlans_NFD_Batches_BatchId", table: "NFD_CoursePlans");
            migrationBuilder.DropIndex(name: "IX_NFD_CoursePlans_BatchId", table: "NFD_CoursePlans");
            migrationBuilder.DropColumn(name: "BatchId", table: "NFD_CoursePlans");
        }
    }
}
