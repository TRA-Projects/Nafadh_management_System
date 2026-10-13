using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nafadh_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddTraineeSkills : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Skills",
                table: "NFD_Trainees");

            migrationBuilder.CreateTable(
                name: "NFD_TraineeSkills",
                columns: table => new
                {
                    TraineeSkillId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    TraineeId = table.Column<int>(type: "int", nullable: false),
                    SkillName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SerialNumber = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CertificateUrl = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_TraineeSkills", x => x.TraineeSkillId);
                    table.ForeignKey(
                        name: "FK_NFD_TraineeSkills_NFD_Trainees_TraineeId",
                        column: x => x.TraineeId,
                        principalTable: "NFD_Trainees",
                        principalColumn: "TraineeId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NFD_TraineeSkills_TraineeId",
                table: "NFD_TraineeSkills",
                column: "TraineeId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NFD_TraineeSkills");

            migrationBuilder.AddColumn<string>(
                name: "Skills",
                table: "NFD_Trainees",
                type: "nvarchar(max)",
                nullable: true);
        }
    }
}
