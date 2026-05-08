using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace srs.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddTableSessions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "table_sessions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    RestaurantId = table.Column<int>(type: "integer", nullable: false),
                    TableId = table.Column<int>(type: "integer", nullable: false),
                    OpenedByUserId = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ClosedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    LastSeenAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_table_sessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_table_sessions_restaurants_RestaurantId",
                        column: x => x.RestaurantId,
                        principalTable: "restaurants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_table_sessions_tables_TableId",
                        column: x => x.TableId,
                        principalTable: "tables",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_table_sessions_tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_table_sessions_users_OpenedByUserId",
                        column: x => x.OpenedByUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "idx_table_sessions_restaurant_id",
                table: "table_sessions",
                column: "RestaurantId");

            migrationBuilder.CreateIndex(
                name: "idx_table_sessions_table_id",
                table: "table_sessions",
                column: "TableId");

            migrationBuilder.CreateIndex(
                name: "idx_table_sessions_table_status",
                table: "table_sessions",
                columns: new[] { "TableId", "Status" });

            migrationBuilder.CreateIndex(
                name: "idx_table_sessions_tenant_id",
                table: "table_sessions",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_table_sessions_OpenedByUserId",
                table: "table_sessions",
                column: "OpenedByUserId");

            migrationBuilder.Sql("""
                grant select, insert, update, delete on table_sessions to app_authenticated;

                alter table table_sessions enable row level security;
                alter table table_sessions force row level security;

                create policy app_tenant_rls on table_sessions
                for all
                to app_authenticated
                using (
                    current_setting('app.current_user_role', true) = 'SuperAdmin'
                    or "TenantId" = nullif(current_setting('app.current_tenant_id', true), '')::uuid
                )
                with check (
                    current_setting('app.current_user_role', true) = 'SuperAdmin'
                    or "TenantId" = nullif(current_setting('app.current_tenant_id', true), '')::uuid
                );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                drop policy if exists app_tenant_rls on table_sessions;
                """);

            migrationBuilder.DropTable(
                name: "table_sessions");
        }
    }
}
