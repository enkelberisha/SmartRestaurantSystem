using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace srs.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddRestaurantScopedMenuFilters : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "RestaurantId",
                table: "menu_item_filters",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "idx_menu_item_filters_restaurant_id",
                table: "menu_item_filters",
                column: "RestaurantId");

            migrationBuilder.AddForeignKey(
                name: "FK_menu_item_filters_restaurants_RestaurantId",
                table: "menu_item_filters",
                column: "RestaurantId",
                principalTable: "restaurants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_menu_item_filters_restaurants_RestaurantId",
                table: "menu_item_filters");

            migrationBuilder.DropIndex(
                name: "idx_menu_item_filters_restaurant_id",
                table: "menu_item_filters");

            migrationBuilder.DropColumn(
                name: "RestaurantId",
                table: "menu_item_filters");
        }
    }
}
