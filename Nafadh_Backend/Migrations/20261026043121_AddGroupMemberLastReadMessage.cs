using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nafadh_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddGroupMemberLastReadMessage : Migration
    {
        /// <inheritdoc />

        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
        IF COL_LENGTH('dbo.NFD_ConversationGroupMembers', 'LastReadMessageId') IS NULL
        BEGIN
            ALTER TABLE dbo.NFD_ConversationGroupMembers
            ADD LastReadMessageId INT NULL;
        END
    ");
        }


        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "LastReadMessageId",
                table: "NFD_ConversationGroupMembers");
        }
    }
}
