using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace srs.Server.Migrations
{
    /// <inheritdoc />
    public partial class EnableRowLevelSecurity : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ─── Enable RLS ───────────────────────────────────────────────────────
            var tables = new[]
            {
        "restaurants", "users", "audit_logs", "orders", "tables",
        "inventory", "inventory_items", "menu_of_restaurant", "menu_items",
        "order_items", "kitchen_queue", "payments", "purchase_orders",
        "reservations", "staff", "shifts", "suppliers", "notifications",
        "reviews", "reports"
    };

            foreach (var table in tables)
            {
                migrationBuilder.Sql($"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;");
                migrationBuilder.Sql($"ALTER TABLE {table} FORCE ROW LEVEL SECURITY;");
            }

            // ─── Policies: direct tenant_id columns ───────────────────────────────
            migrationBuilder.Sql("""
        CREATE POLICY tenant_isolation ON restaurants
        USING ("TenantId" = current_setting('app.current_tenant_id', true)::uuid);
    """);

            migrationBuilder.Sql("""
        CREATE POLICY tenant_isolation ON users
        USING ("TenantId" = current_setting('app.current_tenant_id', true)::uuid);
    """);

            migrationBuilder.Sql("""
        CREATE POLICY tenant_isolation ON audit_logs
        USING ("TenantId" = current_setting('app.current_tenant_id', true)::uuid);
    """);

            // ─── Policies: restaurant-scoped tables ───────────────────────────────
            migrationBuilder.Sql("""
        CREATE POLICY tenant_isolation ON tables
        USING (
            "RestaurantId" IN (
                SELECT "Id" FROM restaurants
                WHERE "TenantId" = current_setting('app.current_tenant_id', true)::uuid
            )
        );
    """);

            migrationBuilder.Sql("""
        CREATE POLICY tenant_isolation ON menu_of_restaurant
        USING (
            "RestaurantId" IN (
                SELECT "Id" FROM restaurants
                WHERE "TenantId" = current_setting('app.current_tenant_id', true)::uuid
            )
        );
    """);

            migrationBuilder.Sql("""
        CREATE POLICY tenant_isolation ON inventory
        USING (
            "RestaurantId" IN (
                SELECT "Id" FROM restaurants
                WHERE "TenantId" = current_setting('app.current_tenant_id', true)::uuid
            )
        );
    """);

            migrationBuilder.Sql("""
        CREATE POLICY tenant_isolation ON suppliers
        USING (
            "RestaurantId" IN (
                SELECT "Id" FROM restaurants
                WHERE "TenantId" = current_setting('app.current_tenant_id', true)::uuid
            )
        );
    """);

            migrationBuilder.Sql("""
        CREATE POLICY tenant_isolation ON purchase_orders
        USING (
            "RestaurantId" IN (
                SELECT "Id" FROM restaurants
                WHERE "TenantId" = current_setting('app.current_tenant_id', true)::uuid
            )
        );
    """);

            migrationBuilder.Sql("""
        CREATE POLICY tenant_isolation ON reports
        USING (
            "RestaurantId" IN (
                SELECT "Id" FROM restaurants
                WHERE "TenantId" = current_setting('app.current_tenant_id', true)::uuid
            )
        );
    """);

            migrationBuilder.Sql("""
        CREATE POLICY tenant_isolation ON reviews
        USING (
            "RestaurantId" IN (
                SELECT "Id" FROM restaurants
                WHERE "TenantId" = current_setting('app.current_tenant_id', true)::uuid
            )
        );
    """);

            migrationBuilder.Sql("""
        CREATE POLICY tenant_isolation ON staff
        USING (
            "RestaurantId" IN (
                SELECT "Id" FROM restaurants
                WHERE "TenantId" = current_setting('app.current_tenant_id', true)::uuid
            )
        );
    """);

            migrationBuilder.Sql("""
        CREATE POLICY tenant_isolation ON orders
        USING (
            "TableId" IN (
                SELECT t."Id" FROM tables t
                JOIN restaurants r ON r."Id" = t."RestaurantId"
                WHERE r."TenantId" = current_setting('app.current_tenant_id', true)::uuid
            )
        );
    """);

            migrationBuilder.Sql("""
        CREATE POLICY tenant_isolation ON reservations
        USING (
            "TableId" IN (
                SELECT t."Id" FROM tables t
                JOIN restaurants r ON r."Id" = t."RestaurantId"
                WHERE r."TenantId" = current_setting('app.current_tenant_id', true)::uuid
            )
        );
    """);

            migrationBuilder.Sql("""
        CREATE POLICY tenant_isolation ON menu_items
        USING (
            "MenuId" IN (
                SELECT m."Id" FROM menu_of_restaurant m
                JOIN restaurants r ON r."Id" = m."RestaurantId"
                WHERE r."TenantId" = current_setting('app.current_tenant_id', true)::uuid
            )
        );
    """);

            migrationBuilder.Sql("""
        CREATE POLICY tenant_isolation ON inventory_items
        USING (
            "InventoryId" IN (
                SELECT i."Id" FROM inventory i
                JOIN restaurants r ON r."Id" = i."RestaurantId"
                WHERE r."TenantId" = current_setting('app.current_tenant_id', true)::uuid
            )
        );
    """);

            migrationBuilder.Sql("""
        CREATE POLICY tenant_isolation ON order_items
        USING (
            "OrderId" IN (
                SELECT o."Id" FROM orders o
                JOIN tables t ON t."Id" = o."TableId"
                JOIN restaurants r ON r."Id" = t."RestaurantId"
                WHERE r."TenantId" = current_setting('app.current_tenant_id', true)::uuid
            )
        );
    """);

            migrationBuilder.Sql("""
        CREATE POLICY tenant_isolation ON kitchen_queue
        USING (
            "OrderId" IN (
                SELECT o."Id" FROM orders o
                JOIN tables t ON t."Id" = o."TableId"
                JOIN restaurants r ON r."Id" = t."RestaurantId"
                WHERE r."TenantId" = current_setting('app.current_tenant_id', true)::uuid
            )
        );
    """);

            migrationBuilder.Sql("""
        CREATE POLICY tenant_isolation ON payments
        USING (
            "OrderId" IN (
                SELECT o."Id" FROM orders o
                JOIN tables t ON t."Id" = o."TableId"
                JOIN restaurants r ON r."Id" = t."RestaurantId"
                WHERE r."TenantId" = current_setting('app.current_tenant_id', true)::uuid
            )
        );
    """);

            migrationBuilder.Sql("""
        CREATE POLICY tenant_isolation ON shifts
        USING (
            "StaffId" IN (
                SELECT s."Id" FROM staff s
                JOIN restaurants r ON r."Id" = s."RestaurantId"
                WHERE r."TenantId" = current_setting('app.current_tenant_id', true)::uuid
            )
        );
    """);

            migrationBuilder.Sql("""
        CREATE POLICY tenant_isolation ON notifications
        USING (
            "UserId" IN (
                SELECT "Id" FROM users
                WHERE "TenantId" = current_setting('app.current_tenant_id', true)::uuid
            )
        );
    """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            var tables = new[]
            {
        "restaurants", "users", "audit_logs", "orders", "tables",
        "inventory", "inventory_items", "menu_of_restaurant", "menu_items",
        "order_items", "kitchen_queue", "payments", "purchase_orders",
        "reservations", "staff", "shifts", "suppliers", "notifications",
        "reviews", "reports"
    };

            foreach (var table in tables)
            {
                migrationBuilder.Sql($"DROP POLICY IF EXISTS tenant_isolation ON {table};");
                migrationBuilder.Sql($"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY;");
            }
        }
    }
}
