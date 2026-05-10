using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace srs.Server.Migrations
{
    public partial class RepairPendingUserActivationSchema : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE users
                ADD COLUMN IF NOT EXISTS "IsActivated" boolean NOT NULL DEFAULT FALSE;
                """);

            migrationBuilder.Sql("""
                ALTER TABLE users DROP CONSTRAINT IF EXISTS "CK_users_role";
                ALTER TABLE users ADD CONSTRAINT "CK_users_role"
                CHECK ("Role" IN ('Pending','Owner','Manager','Admin','SuperAdmin','PosDevice','TableDevice','KitchenDevice','HostDevice'));
                """);

            migrationBuilder.Sql("""
                UPDATE users
                SET "IsActivated" = CASE
                    WHEN "Role" = 'SuperAdmin' THEN TRUE
                    WHEN "Role" IN ('Owner', 'Admin') AND "TenantId" IS NOT NULL THEN TRUE
                    WHEN "Role" IN ('Manager', 'PosDevice', 'TableDevice', 'KitchenDevice', 'HostDevice')
                        AND "TenantId" IS NOT NULL
                        AND "RestaurantId" IS NOT NULL THEN TRUE
                    ELSE FALSE
                END;
                """);

            migrationBuilder.Sql("""
                UPDATE users
                SET "RestaurantId" = NULL
                WHERE "Role" = 'Owner';
                """);

            migrationBuilder.Sql("""
                UPDATE users u
                SET "RestaurantId" = r."Id"
                FROM restaurants r
                WHERE u."Id" = r."ManagerId"
                  AND u."Role" = 'Manager';
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE users DROP CONSTRAINT IF EXISTS "CK_users_role";
                ALTER TABLE users ADD CONSTRAINT "CK_users_role"
                CHECK ("Role" IN ('Pending','Owner','Manager','Admin','SuperAdmin','PosDevice','TableDevice','KitchenDevice','HostDevice'));
                """);
            // Keep IsActivated in place on down to avoid damaging live auth state during repair rollback.
        }
    }
}
