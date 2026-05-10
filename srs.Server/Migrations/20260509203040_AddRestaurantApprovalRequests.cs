using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace srs.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddRestaurantApprovalRequests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ContactEmail",
                table: "restaurants",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ContactPhone",
                table: "restaurants",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CuisineType",
                table: "restaurants",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "LogoUrl",
                table: "restaurants",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "restaurant_approval_requests",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    RequestedByUserId = table.Column<int>(type: "integer", nullable: false),
                    RestaurantId = table.Column<int>(type: "integer", nullable: true),
                    Type = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Status = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    Summary = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: false),
                    ProtectedPayload = table.Column<string>(type: "text", nullable: false),
                    AdminPasswordConfirmation = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: true),
                    RejectionReason = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    ReviewedByUserId = table.Column<int>(type: "integer", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ReviewedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_restaurant_approval_requests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_restaurant_approval_requests_restaurants_RestaurantId",
                        column: x => x.RestaurantId,
                        principalTable: "restaurants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_restaurant_approval_requests_tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_restaurant_approval_requests_users_RequestedByUserId",
                        column: x => x.RequestedByUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_restaurant_approval_requests_users_ReviewedByUserId",
                        column: x => x.ReviewedByUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_restaurant_approval_requests_RequestedByUserId",
                table: "restaurant_approval_requests",
                column: "RequestedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_restaurant_approval_requests_RestaurantId",
                table: "restaurant_approval_requests",
                column: "RestaurantId");

            migrationBuilder.CreateIndex(
                name: "IX_restaurant_approval_requests_ReviewedByUserId",
                table: "restaurant_approval_requests",
                column: "ReviewedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_restaurant_approval_requests_TenantId",
                table: "restaurant_approval_requests",
                column: "TenantId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "restaurant_approval_requests");

            migrationBuilder.DropColumn(
                name: "ContactEmail",
                table: "restaurants");

            migrationBuilder.DropColumn(
                name: "ContactPhone",
                table: "restaurants");

            migrationBuilder.DropColumn(
                name: "CuisineType",
                table: "restaurants");

            migrationBuilder.DropColumn(
                name: "LogoUrl",
                table: "restaurants");
        }
    }
}
