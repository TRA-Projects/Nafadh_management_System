using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nafadh_Backend.Migrations
{
    public partial class FixPendingModelChanges : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Quiz tables already created by AddQuizModuleFoundation.
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // No changes to revert.
        }
    }
}