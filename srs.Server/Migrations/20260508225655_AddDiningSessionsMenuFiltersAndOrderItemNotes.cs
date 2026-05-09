using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace srs.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddDiningSessionsMenuFiltersAndOrderItemNotes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "CK_users_role",
                table: "users");

            migrationBuilder.AddColumn<int>(
                name: "DiningSessionId",
                table: "orders",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "order_items",
                type: "character varying(300)",
                maxLength: 300,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "dining_sessions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    RestaurantId = table.Column<int>(type: "integer", nullable: false),
                    TableId = table.Column<int>(type: "integer", nullable: false),
                    OpenedByUserId = table.Column<int>(type: "integer", nullable: false),
                    PartySize = table.Column<int>(type: "integer", nullable: false),
                    Status = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    SeatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ClosedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_dining_sessions", x => x.Id);
                    table.CheckConstraint("CK_dining_sessions_party_size", "\"PartySize\" > 0");
                    table.ForeignKey(
                        name: "FK_dining_sessions_restaurants_RestaurantId",
                        column: x => x.RestaurantId,
                        principalTable: "restaurants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_dining_sessions_tables_TableId",
                        column: x => x.TableId,
                        principalTable: "tables",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_dining_sessions_tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_dining_sessions_users_OpenedByUserId",
                        column: x => x.OpenedByUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "menu_item_filters",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Slug = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_menu_item_filters", x => x.Id);
                    table.ForeignKey(
                        name: "FK_menu_item_filters_tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "menu_item_filter_assignments",
                columns: table => new
                {
                    MenuItemId = table.Column<int>(type: "integer", nullable: false),
                    MenuItemFilterId = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_menu_item_filter_assignments", x => new { x.MenuItemId, x.MenuItemFilterId });
                    table.ForeignKey(
                        name: "FK_menu_item_filter_assignments_menu_item_filters_MenuItemFilt~",
                        column: x => x.MenuItemFilterId,
                        principalTable: "menu_item_filters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_menu_item_filter_assignments_menu_items_MenuItemId",
                        column: x => x.MenuItemId,
                        principalTable: "menu_items",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.AddCheckConstraint(
                name: "CK_users_role",
                table: "users",
                sql: "\"Role\" IN ('Owner','Manager','Host','User','Table','SuperAdmin','Admin')");

            migrationBuilder.CreateIndex(
                name: "idx_orders_dining_session_id",
                table: "orders",
                column: "DiningSessionId");

            migrationBuilder.CreateIndex(
                name: "idx_dining_sessions_restaurant_id",
                table: "dining_sessions",
                column: "RestaurantId");

            migrationBuilder.CreateIndex(
                name: "idx_dining_sessions_table_id",
                table: "dining_sessions",
                column: "TableId");

            migrationBuilder.CreateIndex(
                name: "idx_dining_sessions_table_status",
                table: "dining_sessions",
                columns: new[] { "TableId", "Status" });

            migrationBuilder.CreateIndex(
                name: "idx_dining_sessions_tenant_id",
                table: "dining_sessions",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "IX_dining_sessions_OpenedByUserId",
                table: "dining_sessions",
                column: "OpenedByUserId");

            migrationBuilder.CreateIndex(
                name: "idx_menu_item_filter_assignments_filter_id",
                table: "menu_item_filter_assignments",
                column: "MenuItemFilterId");

            migrationBuilder.CreateIndex(
                name: "idx_menu_item_filters_tenant_id",
                table: "menu_item_filters",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "uq_menu_item_filters_tenant_slug",
                table: "menu_item_filters",
                columns: new[] { "TenantId", "Slug" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_orders_dining_sessions_DiningSessionId",
                table: "orders",
                column: "DiningSessionId",
                principalTable: "dining_sessions",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.Sql("""
                grant select, insert, update, delete on dining_sessions to app_authenticated;
                grant usage, select on sequence "dining_sessions_Id_seq" to app_authenticated;

                grant select, insert, update, delete on menu_item_filters to app_authenticated;
                grant usage, select on sequence "menu_item_filters_Id_seq" to app_authenticated;

                grant select, insert, update, delete on menu_item_filter_assignments to app_authenticated;

                alter table dining_sessions enable row level security;
                alter table dining_sessions force row level security;

                create policy app_tenant_rls on dining_sessions
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

                alter table menu_item_filters enable row level security;
                alter table menu_item_filters force row level security;

                create policy app_tenant_rls on menu_item_filters
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

                alter table menu_item_filter_assignments enable row level security;
                alter table menu_item_filter_assignments force row level security;

                create policy app_tenant_rls on menu_item_filter_assignments
                for all
                to app_authenticated
                using (
                    current_setting('app.current_user_role', true) = 'SuperAdmin'
                    or exists (
                        select 1
                        from menu_items mi
                        join menu_of_restaurant m on m."Id" = mi."MenuId"
                        join restaurants r on r."Id" = m."RestaurantId"
                        where mi."Id" = "MenuItemId"
                        and r."TenantId" = nullif(current_setting('app.current_tenant_id', true), '')::uuid
                    )
                )
                with check (
                    current_setting('app.current_user_role', true) = 'SuperAdmin'
                    or exists (
                        select 1
                        from menu_items mi
                        join menu_of_restaurant m on m."Id" = mi."MenuId"
                        join restaurants r on r."Id" = m."RestaurantId"
                        join menu_item_filters mif on mif."Id" = "MenuItemFilterId"
                        where mi."Id" = "MenuItemId"
                        and r."TenantId" = nullif(current_setting('app.current_tenant_id', true), '')::uuid
                        and mif."TenantId" = r."TenantId"
                    )
                );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                drop policy if exists app_tenant_rls on menu_item_filter_assignments;
                drop policy if exists app_tenant_rls on menu_item_filters;
                drop policy if exists app_tenant_rls on dining_sessions;
                """);

            migrationBuilder.DropForeignKey(
                name: "FK_orders_dining_sessions_DiningSessionId",
                table: "orders");

            migrationBuilder.DropTable(
                name: "dining_sessions");

            migrationBuilder.DropTable(
                name: "menu_item_filter_assignments");

            migrationBuilder.DropTable(
                name: "menu_item_filters");

            migrationBuilder.DropCheckConstraint(
                name: "CK_users_role",
                table: "users");

            migrationBuilder.DropIndex(
                name: "idx_orders_dining_session_id",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "DiningSessionId",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "Notes",
                table: "order_items");

            migrationBuilder.AddCheckConstraint(
                name: "CK_users_role",
                table: "users",
                sql: "\"Role\" IN ('Owner','Manager','User','Table','SuperAdmin','Admin')");
        }
    }
}
