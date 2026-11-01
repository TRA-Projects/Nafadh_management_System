using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nafadh_Backend.Migrations
{
    /// <inheritdoc />
    public partial class AddTrainerLivePolls : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NFD_LivePolls",
                columns: table => new
                {
                    PollId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SessionId = table.Column<int>(type: "int", nullable: false),
                    Question = table.Column<string>(type: "nvarchar(300)", maxLength: 300, nullable: false),
                    IsOpen = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ClosedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_LivePolls", x => x.PollId);
                    table.ForeignKey(
                        name: "FK_NFD_LivePolls_NFD_Sessions_SessionId",
                        column: x => x.SessionId,
                        principalTable: "NFD_Sessions",
                        principalColumn: "SessionId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_LivePollOptions",
                columns: table => new
                {
                    OptionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PollId = table.Column<int>(type: "int", nullable: false),
                    OptionText = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_LivePollOptions", x => x.OptionId);
                    table.ForeignKey(
                        name: "FK_NFD_LivePollOptions_NFD_LivePolls_PollId",
                        column: x => x.PollId,
                        principalTable: "NFD_LivePolls",
                        principalColumn: "PollId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NFD_LivePollVotes",
                columns: table => new
                {
                    VoteId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    PollId = table.Column<int>(type: "int", nullable: false),
                    OptionId = table.Column<int>(type: "int", nullable: false),
                    TraineeId = table.Column<int>(type: "int", nullable: false),
                    SubmittedAtUtc = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_LivePollVotes", x => x.VoteId);
                    table.ForeignKey(
                        name: "FK_NFD_LivePollVotes_NFD_LivePollOptions_OptionId",
                        column: x => x.OptionId,
                        principalTable: "NFD_LivePollOptions",
                        principalColumn: "OptionId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_LivePollVotes_NFD_LivePolls_PollId",
                        column: x => x.PollId,
                        principalTable: "NFD_LivePolls",
                        principalColumn: "PollId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NFD_LivePollVotes_NFD_Trainees_TraineeId",
                        column: x => x.TraineeId,
                        principalTable: "NFD_Trainees",
                        principalColumn: "TraineeId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_NFD_LivePollOptions_PollId",
                table: "NFD_LivePollOptions",
                column: "PollId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_LivePolls_SessionId",
                table: "NFD_LivePolls",
                column: "SessionId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_LivePollVotes_OptionId",
                table: "NFD_LivePollVotes",
                column: "OptionId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_LivePollVotes_PollId_TraineeId",
                table: "NFD_LivePollVotes",
                columns: new[] { "PollId", "TraineeId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_NFD_LivePollVotes_TraineeId",
                table: "NFD_LivePollVotes",
                column: "TraineeId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NFD_LivePollVotes");

            migrationBuilder.DropTable(
                name: "NFD_LivePollOptions");

            migrationBuilder.DropTable(
                name: "NFD_LivePolls");
        }
    }
}
