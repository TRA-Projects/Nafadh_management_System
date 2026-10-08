using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nafadh_Backend.Migrations
{
    /// <inheritdoc />
    public partial class SyncRejectionReason : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add RejectionReason only if it does not already exist
            migrationBuilder.Sql("""
        IF COL_LENGTH('NFD_Companies', 'RejectionReason') IS NULL
        BEGIN
            ALTER TABLE [NFD_Companies]
            ADD [RejectionReason] nvarchar(max) NULL;
        END
        """);

            migrationBuilder.CreateTable(
                name: "NFD_RemediationRequests",
                columns: table => new
                {
                    RequestId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),

                    WarningId = table.Column<int>(type: "int", nullable: false),

                    CompanyId = table.Column<int>(type: "int", nullable: false),

                    RequestedAction = table.Column<string>(
                        type: "nvarchar(500)",
                        maxLength: 500,
                        nullable: false),

                    SubmissionDate = table.Column<DateTime>(
                        type: "datetime2",
                        nullable: false),

                    Status = table.Column<int>(
                        type: "int",
                        nullable: false),

                    ReviewNotes = table.Column<string>(
                        type: "nvarchar(1000)",
                        maxLength: 1000,
                        nullable: true),

                    ReviewedByUserId = table.Column<int>(
                        type: "int",
                        nullable: true),

                    ReviewedDate = table.Column<DateTime>(
                        type: "datetime2",
                        nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey(
                        "PK_NFD_RemediationRequests",
                        x => x.RequestId);

                    table.ForeignKey(
                        name: "FK_NFD_RemediationRequests_NFD_Companies_CompanyId",
                        column: x => x.CompanyId,
                        principalTable: "NFD_Companies",
                        principalColumn: "CompanyId",
                        onDelete: ReferentialAction.Restrict);

                    table.ForeignKey(
                        name: "FK_NFD_RemediationRequests_NFD_Warnings_WarningId",
                        column: x => x.WarningId,
                        principalTable: "NFD_Warnings",
                        principalColumn: "WarningId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NFD_RemediationRequests_CompanyId",
                table: "NFD_RemediationRequests",
                column: "CompanyId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_RemediationRequests_WarningId",
                table: "NFD_RemediationRequests",
                column: "WarningId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NFD_RemediationRequests");

            migrationBuilder.Sql("""
        IF COL_LENGTH('NFD_Companies', 'RejectionReason') IS NOT NULL
        BEGIN
            ALTER TABLE [NFD_Companies]
            DROP COLUMN [RejectionReason];
        END
        """);
        }
    }
}
