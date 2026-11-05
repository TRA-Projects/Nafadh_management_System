using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Nafadh_Backend.Migrations
{
    /// <inheritdoc />
    public partial class SyncExistingUnifiedTables : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // الجداول الموحدة موجودة مسبقاً في قاعدة البيانات
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
        }
    }
}
