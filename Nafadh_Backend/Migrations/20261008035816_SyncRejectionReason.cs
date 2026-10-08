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
            // 1. إضافة عمود RejectionReason فقط إذا لم يكن موجوداً
            migrationBuilder.Sql("""
                IF COL_LENGTH('NFD_Companies', 'RejectionReason') IS NULL
                BEGIN
                    ALTER TABLE [NFD_Companies]
                    ADD [RejectionReason] nvarchar(max) NULL;
                END
                """);

            // 2. إنشاء جدول NFD_RemediationRequests فقط إذا لم يكن موجوداً
            migrationBuilder.Sql("""
                IF OBJECT_ID(N'[NFD_RemediationRequests]', N'U') IS NULL
                BEGIN
                    CREATE TABLE [NFD_RemediationRequests] (
                        [RequestId] int NOT NULL IDENTITY,
                        [WarningId] int NOT NULL,
                        [CompanyId] int NOT NULL,
                        [RequestedAction] nvarchar(500) NOT NULL,
                        [SubmissionDate] datetime2 NOT NULL,
                        [Status] int NOT NULL,
                        [ReviewNotes] nvarchar(1000) NULL,
                        [ReviewedByUserId] int NULL,
                        [ReviewedDate] datetime2 NULL,
                        CONSTRAINT [PK_NFD_RemediationRequests] PRIMARY KEY ([RequestId]),
                        CONSTRAINT [FK_NFD_RemediationRequests_NFD_Companies_CompanyId] FOREIGN KEY ([CompanyId]) REFERENCES [NFD_Companies] ([CompanyId]) ON DELETE NO ACTION,
                        CONSTRAINT [FK_NFD_RemediationRequests_NFD_Warnings_WarningId] FOREIGN KEY ([WarningId]) REFERENCES [NFD_Warnings] ([WarningId]) ON DELETE NO ACTION
                    );
                END
                """);

            // 3. إنشاء الفهارس (Indexes) فقط إذا لم تكن موجودة
            migrationBuilder.Sql("""
                IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_NFD_RemediationRequests_CompanyId' AND object_id = OBJECT_ID(N'[NFD_RemediationRequests]'))
                BEGIN
                    CREATE INDEX [IX_NFD_RemediationRequests_CompanyId] ON [NFD_RemediationRequests] ([CompanyId]);
                END

                IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = N'IX_NFD_RemediationRequests_WarningId' AND object_id = OBJECT_ID(N'[NFD_RemediationRequests]'))
                BEGIN
                    CREATE INDEX [IX_NFD_RemediationRequests_WarningId] ON [NFD_RemediationRequests] ([WarningId]);
                END
                """);
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