using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nafadh_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddProjectBatchLinks : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NFD_ProjectBatches",
                columns: table => new
                {
                    ProjectBatchId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ProjectId = table.Column<int>(type: "int", nullable: false),
                    BatchId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_ProjectBatches", x => x.ProjectBatchId);
                    table.ForeignKey(
                        name: "FK_NFD_ProjectBatches_NFD_Batches_BatchId",
                        column: x => x.BatchId,
                        principalTable: "NFD_Batches",
                        principalColumn: "BatchId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_ProjectBatches_NFD_Projects_ProjectId",
                        column: x => x.ProjectId,
                        principalTable: "NFD_Projects",
                        principalColumn: "ProjectId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NFD_ProjectBatches_BatchId",
                table: "NFD_ProjectBatches",
                column: "BatchId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_ProjectBatches_ProjectId_BatchId",
                table: "NFD_ProjectBatches",
                columns: new[] { "ProjectId", "BatchId" },
                unique: true);


            // Backfill project-to-batch links using existing
            // project members and their trainee enrollments.
            // Only link batches belonging to the same program
            // as the project.
            migrationBuilder.Sql(@"
                INSERT INTO dbo.NFD_ProjectBatches
                    (ProjectId, BatchId)
                SELECT DISTINCT
                    p.ProjectId,
                    e.BatchId
                FROM dbo.NFD_ProjectMembers AS pm
                INNER JOIN dbo.NFD_Projects AS p
                    ON p.ProjectId = pm.ProjectId
                INNER JOIN dbo.NFD_Enrollments AS e
                    ON e.TraineeId = pm.TraineeId
                INNER JOIN dbo.NFD_Batches AS b
                    ON b.BatchId = e.BatchId
                   AND b.ProgramId = p.ProgramId
                WHERE NOT EXISTS
                (
                    SELECT 1
                    FROM dbo.NFD_ProjectBatches AS pb
                    WHERE pb.ProjectId = p.ProjectId
                      AND pb.BatchId = e.BatchId
                );
            ");

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NFD_ProjectBatches");
        }
    }
}
