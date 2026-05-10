using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace srs.Server.Migrations
{
    /// <inheritdoc />
    public partial class RefactorStaffDeviceAuthModel : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_staff_users_UserId",
                table: "staff");

            migrationBuilder.DropCheckConstraint(
                name: "CK_users_role",
                table: "users");

            migrationBuilder.DropIndex(
                name: "uq_staff_user_restaurant",
                table: "staff");

            migrationBuilder.AddColumn<int>(
                name: "RestaurantId",
                table: "users",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "staff",
                type: "timestamp with time zone",
                nullable: false,
                defaultValueSql: "CURRENT_TIMESTAMP");

            migrationBuilder.AddColumn<string>(
                name: "CredentialHash",
                table: "staff",
                type: "character varying(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FullName",
                table: "staff",
                type: "character varying(150)",
                maxLength: 150,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "staff",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<Guid>(
                name: "TenantId",
                table: "staff",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.RenameColumn(
                name: "Position",
                table: "staff",
                newName: "CredentialType");

            migrationBuilder.AddColumn<int>(
                name: "PosUserId",
                table: "orders",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "WaiterStaffId",
                table: "orders",
                type: "integer",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "pos_waiter_sessions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PosUserId = table.Column<int>(type: "integer", nullable: false),
                    StaffId = table.Column<int>(type: "integer", nullable: false),
                    TenantId = table.Column<Guid>(type: "uuid", nullable: false),
                    RestaurantId = table.Column<int>(type: "integer", nullable: false),
                    OpenedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    ClosedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pos_waiter_sessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_pos_waiter_sessions_restaurants_RestaurantId",
                        column: x => x.RestaurantId,
                        principalTable: "restaurants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_pos_waiter_sessions_staff_StaffId",
                        column: x => x.StaffId,
                        principalTable: "staff",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_pos_waiter_sessions_tenants_TenantId",
                        column: x => x.TenantId,
                        principalTable: "tenants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_pos_waiter_sessions_users_PosUserId",
                        column: x => x.PosUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.Sql("""
                UPDATE users AS u
                SET "RestaurantId" = s."RestaurantId"
                FROM staff AS s
                WHERE s."UserId" = u."Id"
                  AND u."RestaurantId" IS NULL;
                """);

            migrationBuilder.Sql("""
                UPDATE users
                SET "Role" = 'TableDevice'
                WHERE "Role" = 'Table';
                """);

            migrationBuilder.Sql("""
                UPDATE users
                SET "Role" = 'HostDevice'
                WHERE "Role" = 'Host';
                """);

            migrationBuilder.Sql("""
                UPDATE users
                SET "Role" = 'PosDevice'
                WHERE "Role" = 'User';
                """);

            migrationBuilder.Sql("""
                UPDATE staff AS s
                SET "TenantId" = r."TenantId",
                    "FullName" = COALESCE((SELECT u."Email" FROM users AS u WHERE u."Id" = s."UserId"), 'Legacy Waiter #' || s."Id"::text),
                    "CredentialHash" = md5('LEGACY-WAITER-' || s."Id"::text),
                    "CredentialType" = 'ManualId',
                    "IsActive" = FALSE
                FROM restaurants AS r
                WHERE r."Id" = s."RestaurantId";
                """);

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "staff");

            migrationBuilder.CreateIndex(
                name: "idx_users_restaurant_id",
                table: "users",
                column: "RestaurantId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_users_role",
                table: "users",
                sql: "\"Role\" IN ('Owner','Manager','Admin','SuperAdmin','PosDevice','TableDevice','KitchenDevice','HostDevice')");

            migrationBuilder.CreateIndex(
                name: "idx_staff_tenant_id",
                table: "staff",
                column: "TenantId");

            migrationBuilder.CreateIndex(
                name: "uq_staff_restaurant_credential",
                table: "staff",
                columns: new[] { "RestaurantId", "CredentialHash" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "idx_orders_pos_user_id",
                table: "orders",
                column: "PosUserId");

            migrationBuilder.CreateIndex(
                name: "idx_orders_waiter_staff_id",
                table: "orders",
                column: "WaiterStaffId");

            migrationBuilder.CreateIndex(
                name: "idx_pos_waiter_sessions_pos_user_id",
                table: "pos_waiter_sessions",
                column: "PosUserId");

            migrationBuilder.CreateIndex(
                name: "idx_pos_waiter_sessions_restaurant_id",
                table: "pos_waiter_sessions",
                column: "RestaurantId");

            migrationBuilder.CreateIndex(
                name: "idx_pos_waiter_sessions_staff_id",
                table: "pos_waiter_sessions",
                column: "StaffId");

            migrationBuilder.CreateIndex(
                name: "idx_pos_waiter_sessions_tenant_id",
                table: "pos_waiter_sessions",
                column: "TenantId");

            migrationBuilder.AddForeignKey(
                name: "FK_orders_staff_WaiterStaffId",
                table: "orders",
                column: "WaiterStaffId",
                principalTable: "staff",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_orders_users_PosUserId",
                table: "orders",
                column: "PosUserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_staff_tenants_TenantId",
                table: "staff",
                column: "TenantId",
                principalTable: "tenants",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_users_restaurants_RestaurantId",
                table: "users",
                column: "RestaurantId",
                principalTable: "restaurants",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_orders_staff_WaiterStaffId",
                table: "orders");

            migrationBuilder.DropForeignKey(
                name: "FK_orders_users_PosUserId",
                table: "orders");

            migrationBuilder.DropForeignKey(
                name: "FK_staff_tenants_TenantId",
                table: "staff");

            migrationBuilder.DropForeignKey(
                name: "FK_users_restaurants_RestaurantId",
                table: "users");

            migrationBuilder.DropTable(
                name: "pos_waiter_sessions");

            migrationBuilder.DropIndex(
                name: "idx_users_restaurant_id",
                table: "users");

            migrationBuilder.DropCheckConstraint(
                name: "CK_users_role",
                table: "users");

            migrationBuilder.DropIndex(
                name: "idx_staff_tenant_id",
                table: "staff");

            migrationBuilder.DropIndex(
                name: "uq_staff_restaurant_credential",
                table: "staff");

            migrationBuilder.DropIndex(
                name: "idx_orders_pos_user_id",
                table: "orders");

            migrationBuilder.DropIndex(
                name: "idx_orders_waiter_staff_id",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "RestaurantId",
                table: "users");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "staff");

            migrationBuilder.DropColumn(
                name: "CredentialHash",
                table: "staff");

            migrationBuilder.DropColumn(
                name: "FullName",
                table: "staff");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "staff");

            migrationBuilder.DropColumn(
                name: "TenantId",
                table: "staff");

            migrationBuilder.DropColumn(
                name: "PosUserId",
                table: "orders");

            migrationBuilder.DropColumn(
                name: "WaiterStaffId",
                table: "orders");

            migrationBuilder.RenameColumn(
                name: "CredentialType",
                table: "staff",
                newName: "Position");

            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "staff",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddCheckConstraint(
                name: "CK_users_role",
                table: "users",
                sql: "\"Role\" IN ('Owner','Manager','Host','User','Table','SuperAdmin','Admin')");

            migrationBuilder.CreateIndex(
                name: "uq_staff_user_restaurant",
                table: "staff",
                columns: new[] { "UserId", "RestaurantId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_staff_users_UserId",
                table: "staff",
                column: "UserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
