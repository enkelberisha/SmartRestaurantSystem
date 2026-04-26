using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace srs.Server.Migrations
{
    /// <inheritdoc />
    public partial class UseSupabaseUsers : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PasswordHash",
                table: "users");

            migrationBuilder.DropColumn(
                name: "PasswordSalt",
                table: "users");

            migrationBuilder.AddColumn<Guid>(
                name: "SupabaseUserId",
                table: "users",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "users_supabase_id_key",
                table: "users",
                column: "SupabaseUserId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "users_supabase_id_key",
                table: "users");

            migrationBuilder.DropColumn(
                name: "SupabaseUserId",
                table: "users");

            migrationBuilder.AddColumn<string>(
                name: "PasswordHash",
                table: "users",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "PasswordSalt",
                table: "users",
                type: "text",
                nullable: false,
                defaultValue: "");
        }
    }
}
