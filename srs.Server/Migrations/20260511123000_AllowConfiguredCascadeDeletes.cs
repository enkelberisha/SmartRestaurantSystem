using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace srs.Server.Migrations
{
    /// <inheritdoc />
    public partial class AllowConfiguredCascadeDeletes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_dining_sessions_users_OpenedByUserId",
                table: "dining_sessions");

            migrationBuilder.DropForeignKey(
                name: "FK_order_items_menu_items_MenuItemId",
                table: "order_items");

            migrationBuilder.DropForeignKey(
                name: "FK_purchase_orders_suppliers_SupplierId",
                table: "purchase_orders");

            migrationBuilder.DropForeignKey(
                name: "FK_restaurant_approval_requests_users_RequestedByUserId",
                table: "restaurant_approval_requests");

            migrationBuilder.DropForeignKey(
                name: "FK_table_sessions_users_OpenedByUserId",
                table: "table_sessions");

            migrationBuilder.AddForeignKey(
                name: "FK_dining_sessions_users_OpenedByUserId",
                table: "dining_sessions",
                column: "OpenedByUserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_order_items_menu_items_MenuItemId",
                table: "order_items",
                column: "MenuItemId",
                principalTable: "menu_items",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_purchase_orders_suppliers_SupplierId",
                table: "purchase_orders",
                column: "SupplierId",
                principalTable: "suppliers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_restaurant_approval_requests_users_RequestedByUserId",
                table: "restaurant_approval_requests",
                column: "RequestedByUserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_table_sessions_users_OpenedByUserId",
                table: "table_sessions",
                column: "OpenedByUserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_dining_sessions_users_OpenedByUserId",
                table: "dining_sessions");

            migrationBuilder.DropForeignKey(
                name: "FK_order_items_menu_items_MenuItemId",
                table: "order_items");

            migrationBuilder.DropForeignKey(
                name: "FK_purchase_orders_suppliers_SupplierId",
                table: "purchase_orders");

            migrationBuilder.DropForeignKey(
                name: "FK_restaurant_approval_requests_users_RequestedByUserId",
                table: "restaurant_approval_requests");

            migrationBuilder.DropForeignKey(
                name: "FK_table_sessions_users_OpenedByUserId",
                table: "table_sessions");

            migrationBuilder.AddForeignKey(
                name: "FK_dining_sessions_users_OpenedByUserId",
                table: "dining_sessions",
                column: "OpenedByUserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_order_items_menu_items_MenuItemId",
                table: "order_items",
                column: "MenuItemId",
                principalTable: "menu_items",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_purchase_orders_suppliers_SupplierId",
                table: "purchase_orders",
                column: "SupplierId",
                principalTable: "suppliers",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_restaurant_approval_requests_users_RequestedByUserId",
                table: "restaurant_approval_requests",
                column: "RequestedByUserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_table_sessions_users_OpenedByUserId",
                table: "table_sessions",
                column: "OpenedByUserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
