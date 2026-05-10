using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace srs.Server.Migrations
{
    public partial class RefactorAuditLogsEventBased : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_audit_logs_tenants_TenantId",
                table: "audit_logs");

            migrationBuilder.RenameColumn(
                name: "DeletedAt",
                table: "audit_logs",
                newName: "CreatedAt");

            migrationBuilder.RenameColumn(
                name: "DeletedData",
                table: "audit_logs",
                newName: "Detail");

            migrationBuilder.AddColumn<string>(
                name: "Action",
                table: "audit_logs",
                type: "character varying(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "Delete");

            migrationBuilder.AddColumn<string>(
                name: "ActorEmail",
                table: "audit_logs",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ActorRole",
                table: "audit_logs",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ActorUserId",
                table: "audit_logs",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Target",
                table: "audit_logs",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.Sql("""
                update audit_logs
                set "Action" = 'Delete',
                    "Target" = case
                        when "RecordId" > 0 then "TableName" || ':' || "RecordId"::text
                        else "TableName"
                    end,
                    "CreatedAt" = coalesce("CreatedAt", now())
                """);

            migrationBuilder.AlterColumn<DateTime>(
                name: "CreatedAt",
                table: "audit_logs",
                type: "timestamp with time zone",
                nullable: false,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "idx_audit_logs_action",
                table: "audit_logs",
                column: "Action");

            migrationBuilder.AddForeignKey(
                name: "FK_audit_logs_tenants_TenantId",
                table: "audit_logs",
                column: "TenantId",
                principalTable: "tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_audit_logs_tenants_TenantId",
                table: "audit_logs");

            migrationBuilder.DropIndex(
                name: "idx_audit_logs_action",
                table: "audit_logs");

            migrationBuilder.DropColumn(
                name: "Action",
                table: "audit_logs");

            migrationBuilder.DropColumn(
                name: "ActorEmail",
                table: "audit_logs");

            migrationBuilder.DropColumn(
                name: "ActorRole",
                table: "audit_logs");

            migrationBuilder.DropColumn(
                name: "ActorUserId",
                table: "audit_logs");

            migrationBuilder.DropColumn(
                name: "Target",
                table: "audit_logs");

            migrationBuilder.RenameColumn(
                name: "CreatedAt",
                table: "audit_logs",
                newName: "DeletedAt");

            migrationBuilder.RenameColumn(
                name: "Detail",
                table: "audit_logs",
                newName: "DeletedData");

            migrationBuilder.AlterColumn<DateTime>(
                name: "DeletedAt",
                table: "audit_logs",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone");

            migrationBuilder.AddForeignKey(
                name: "FK_audit_logs_tenants_TenantId",
                table: "audit_logs",
                column: "TenantId",
                principalTable: "tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
