using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace srs.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddPurchaseOrderExportDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CreatedByEmail",
                table: "purchase_orders",
                type: "character varying(320)",
                maxLength: 320,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "CreatedByUserId",
                table: "purchase_orders",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "InventoryItemId",
                table: "purchase_orders",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ItemName",
                table: "purchase_orders",
                type: "character varying(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "Quantity",
                table: "purchase_orders",
                type: "numeric(10,2)",
                precision: 10,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "UnitPrice",
                table: "purchase_orders",
                type: "numeric(10,2)",
                precision: 10,
                scale: 2,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "idx_purchase_orders_created_by_user_id",
                table: "purchase_orders",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "idx_purchase_orders_inventory_item_id",
                table: "purchase_orders",
                column: "InventoryItemId");

            migrationBuilder.AddForeignKey(
                name: "FK_purchase_orders_inventory_items_InventoryItemId",
                table: "purchase_orders",
                column: "InventoryItemId",
                principalTable: "inventory_items",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_purchase_orders_users_CreatedByUserId",
                table: "purchase_orders",
                column: "CreatedByUserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_purchase_orders_inventory_items_InventoryItemId",
                table: "purchase_orders");

            migrationBuilder.DropForeignKey(
                name: "FK_purchase_orders_users_CreatedByUserId",
                table: "purchase_orders");

            migrationBuilder.DropIndex(
                name: "idx_purchase_orders_created_by_user_id",
                table: "purchase_orders");

            migrationBuilder.DropIndex(
                name: "idx_purchase_orders_inventory_item_id",
                table: "purchase_orders");

            migrationBuilder.DropColumn(
                name: "CreatedByEmail",
                table: "purchase_orders");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "purchase_orders");

            migrationBuilder.DropColumn(
                name: "InventoryItemId",
                table: "purchase_orders");

            migrationBuilder.DropColumn(
                name: "ItemName",
                table: "purchase_orders");

            migrationBuilder.DropColumn(
                name: "Quantity",
                table: "purchase_orders");

            migrationBuilder.DropColumn(
                name: "UnitPrice",
                table: "purchase_orders");
        }
    }
}
