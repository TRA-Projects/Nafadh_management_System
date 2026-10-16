using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nafadh_Backend.Migrations
{
    /// <inheritdoc />
    public partial class FixPendingModelChanges : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "NFD_QuestionBank",
                columns: table => new
                {
                    QuestionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    QuestionText = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    QuestionType = table.Column<int>(type: "int", nullable: false),
                    Difficulty = table.Column<int>(type: "int", nullable: false),
                    Points = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TrainerId = table.Column<int>(type: "int", nullable: false),
                    Explanation = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_QuestionBank", x => x.QuestionId);
                    table.ForeignKey(
                        name: "FK_NFD_QuestionBank_NFD_Trainers_TrainerId",
                        column: x => x.TrainerId,
                        principalTable: "NFD_Trainers",
                        principalColumn: "TrainerId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_Quizzes",
                columns: table => new
                {
                    QuizId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    BatchId = table.Column<int>(type: "int", nullable: false),
                    TrainerId = table.Column<int>(type: "int", nullable: false),
                    StartDateTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    EndDateTime = table.Column<DateTime>(type: "datetime2", nullable: false),
                    DurationMinutes = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    RandomizeQuestions = table.Column<bool>(type: "bit", nullable: false),
                    MaxAttempts = table.Column<int>(type: "int", nullable: false),
                    CameraRequired = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_Quizzes", x => x.QuizId);
                    table.ForeignKey(
                        name: "FK_NFD_Quizzes_NFD_Batches_BatchId",
                        column: x => x.BatchId,
                        principalTable: "NFD_Batches",
                        principalColumn: "BatchId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_Quizzes_NFD_Trainers_TrainerId",
                        column: x => x.TrainerId,
                        principalTable: "NFD_Trainers",
                        principalColumn: "TrainerId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_QuestionOptions",
                columns: table => new
                {
                    OptionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    QuestionId = table.Column<int>(type: "int", nullable: false),
                    OptionText = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    OptionCode = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false),
                    IsCorrect = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_QuestionOptions", x => x.OptionId);
                    table.ForeignKey(
                        name: "FK_NFD_QuestionOptions_NFD_QuestionBank_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "NFD_QuestionBank",
                        principalColumn: "QuestionId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NFD_QuizAttempts",
                columns: table => new
                {
                    AttemptId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    QuizId = table.Column<int>(type: "int", nullable: false),
                    TraineeId = table.Column<int>(type: "int", nullable: false),
                    AttemptNumber = table.Column<int>(type: "int", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    SubmittedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    Score = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Percentage = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_QuizAttempts", x => x.AttemptId);
                    table.ForeignKey(
                        name: "FK_NFD_QuizAttempts_NFD_Quizzes_QuizId",
                        column: x => x.QuizId,
                        principalTable: "NFD_Quizzes",
                        principalColumn: "QuizId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NFD_QuizAttempts_NFD_Trainees_TraineeId",
                        column: x => x.TraineeId,
                        principalTable: "NFD_Trainees",
                        principalColumn: "TraineeId",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "NFD_QuizQuestions",
                columns: table => new
                {
                    QuizQuestionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    QuizId = table.Column<int>(type: "int", nullable: false),
                    QuestionId = table.Column<int>(type: "int", nullable: false),
                    QuestionOrder = table.Column<int>(type: "int", nullable: false),
                    Points = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_QuizQuestions", x => x.QuizQuestionId);
                    table.ForeignKey(
                        name: "FK_NFD_QuizQuestions_NFD_QuestionBank_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "NFD_QuestionBank",
                        principalColumn: "QuestionId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_QuizQuestions_NFD_Quizzes_QuizId",
                        column: x => x.QuizId,
                        principalTable: "NFD_Quizzes",
                        principalColumn: "QuizId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NFD_AttemptQuestions",
                columns: table => new
                {
                    AttemptQuestionId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AttemptId = table.Column<int>(type: "int", nullable: false),
                    QuestionId = table.Column<int>(type: "int", nullable: false),
                    QuestionOrder = table.Column<int>(type: "int", nullable: false),
                    Points = table.Column<decimal>(type: "decimal(18,2)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_AttemptQuestions", x => x.AttemptQuestionId);
                    table.ForeignKey(
                        name: "FK_NFD_AttemptQuestions_NFD_QuestionBank_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "NFD_QuestionBank",
                        principalColumn: "QuestionId",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_NFD_AttemptQuestions_NFD_QuizAttempts_AttemptId",
                        column: x => x.AttemptId,
                        principalTable: "NFD_QuizAttempts",
                        principalColumn: "AttemptId",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "NFD_QuizAnswers",
                columns: table => new
                {
                    AnswerId = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AttemptQuestionId = table.Column<int>(type: "int", nullable: false),
                    SelectedOptionId = table.Column<int>(type: "int", nullable: true),
                    TextAnswer = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    IsCorrect = table.Column<bool>(type: "bit", nullable: true),
                    AwardedPoints = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    IsMarkedForReview = table.Column<bool>(type: "bit", nullable: false),
                    AnsweredAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_NFD_QuizAnswers", x => x.AnswerId);
                    table.ForeignKey(
                        name: "FK_NFD_QuizAnswers_NFD_AttemptQuestions_AttemptQuestionId",
                        column: x => x.AttemptQuestionId,
                        principalTable: "NFD_AttemptQuestions",
                        principalColumn: "AttemptQuestionId",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_NFD_QuizAnswers_NFD_QuestionOptions_SelectedOptionId",
                        column: x => x.SelectedOptionId,
                        principalTable: "NFD_QuestionOptions",
                        principalColumn: "OptionId");
                });

            migrationBuilder.CreateIndex(
                name: "IX_NFD_AttemptQuestions_AttemptId",
                table: "NFD_AttemptQuestions",
                column: "AttemptId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_AttemptQuestions_QuestionId",
                table: "NFD_AttemptQuestions",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_QuestionBank_TrainerId",
                table: "NFD_QuestionBank",
                column: "TrainerId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_QuestionOptions_QuestionId",
                table: "NFD_QuestionOptions",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_QuizAnswers_AttemptQuestionId",
                table: "NFD_QuizAnswers",
                column: "AttemptQuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_QuizAnswers_SelectedOptionId",
                table: "NFD_QuizAnswers",
                column: "SelectedOptionId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_QuizAttempts_QuizId",
                table: "NFD_QuizAttempts",
                column: "QuizId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_QuizAttempts_TraineeId",
                table: "NFD_QuizAttempts",
                column: "TraineeId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_QuizQuestions_QuestionId",
                table: "NFD_QuizQuestions",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_QuizQuestions_QuizId",
                table: "NFD_QuizQuestions",
                column: "QuizId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Quizzes_BatchId",
                table: "NFD_Quizzes",
                column: "BatchId");

            migrationBuilder.CreateIndex(
                name: "IX_NFD_Quizzes_TrainerId",
                table: "NFD_Quizzes",
                column: "TrainerId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "NFD_QuizAnswers");

            migrationBuilder.DropTable(
                name: "NFD_QuizQuestions");

            migrationBuilder.DropTable(
                name: "NFD_AttemptQuestions");

            migrationBuilder.DropTable(
                name: "NFD_QuestionOptions");

            migrationBuilder.DropTable(
                name: "NFD_QuizAttempts");

            migrationBuilder.DropTable(
                name: "NFD_QuestionBank");

            migrationBuilder.DropTable(
                name: "NFD_Quizzes");

        }
    }
}
