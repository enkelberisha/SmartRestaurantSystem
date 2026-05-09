using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace srs.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddMenuItemCloudinaryImages : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ImagePublicId",
                table: "menu_items",
                type: "character varying(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "menu_items",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ImagePublicId",
                table: "menu_items");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "menu_items");
        }
    }
}
