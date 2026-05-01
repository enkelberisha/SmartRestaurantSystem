using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace srs.Server.Migrations
{
    /// <inheritdoc />
    public partial class ApplyTenantRlsPoliciesForAllTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                do $$
                begin
                    if not exists (select 1 from pg_roles where rolname = 'app_authenticated') then
                        create role app_authenticated;
                    end if;

                    execute format('grant app_authenticated to %I', current_user);
                end
                $$;

                grant usage on schema public to app_authenticated;
                grant select, insert, update, delete on all tables in schema public to app_authenticated;
                grant usage, select on all sequences in schema public to app_authenticated;
                """);

            migrationBuilder.Sql("""
                do $$
                declare
                    policy_record record;
                begin
                    for policy_record in
                        select schemaname, tablename, policyname
                        from pg_policies
                        where schemaname = 'public'
                          and tablename in (
                              'tenants', 'restaurants', 'users', 'audit_logs', 'orders', 'tables',
                              'inventory', 'inventory_items', 'menu_of_restaurant', 'menu_items',
                              'order_items', 'kitchen_queue', 'payments', 'purchase_orders',
                              'reservations', 'staff', 'shifts', 'suppliers', 'notifications',
                              'reviews', 'reports'
                          )
                    loop
                        execute format(
                            'drop policy if exists %I on %I.%I',
                            policy_record.policyname,
                            policy_record.schemaname,
                            policy_record.tablename
                        );
                    end loop;
                end
                $$;
                """);

            var tables = new[]
            {
                "tenants", "restaurants", "users", "audit_logs", "orders", "tables",
                "inventory", "inventory_items", "menu_of_restaurant", "menu_items",
                "order_items", "kitchen_queue", "payments", "purchase_orders",
                "reservations", "staff", "shifts", "suppliers", "notifications",
                "reviews", "reports"
            };

            foreach (var table in tables)
            {
                migrationBuilder.Sql($"""
                    alter table {table} enable row level security;
                    alter table {table} force row level security;
                    """);
            }

            CreatePolicy(migrationBuilder, "tenants", """
                current_setting('app.current_user_role', true) = 'SuperAdmin'
                or "Id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid
                """);

            CreatePolicy(migrationBuilder, "restaurants", DirectTenantExpression());

            CreatePolicy(migrationBuilder, "users", """
                current_setting('app.current_user_role', true) = 'SuperAdmin'
                or "TenantId" = nullif(current_setting('app.current_tenant_id', true), '')::uuid
                or "SupabaseUserId" = nullif(current_setting('app.supabase_user_id', true), '')::uuid
                """);

            CreatePolicy(migrationBuilder, "audit_logs", DirectTenantExpression());

            CreatePolicy(migrationBuilder, "tables", RestaurantScopedExpression("\"RestaurantId\""));
            CreatePolicy(migrationBuilder, "menu_of_restaurant", RestaurantScopedExpression("\"RestaurantId\""));
            CreatePolicy(migrationBuilder, "inventory", RestaurantScopedExpression("\"RestaurantId\""));
            CreatePolicy(migrationBuilder, "suppliers", RestaurantScopedExpression("\"RestaurantId\""));
            CreatePolicy(migrationBuilder, "purchase_orders", RestaurantScopedExpression("\"RestaurantId\""));
            CreatePolicy(migrationBuilder, "reports", RestaurantScopedExpression("\"RestaurantId\""));
            CreatePolicy(migrationBuilder, "reviews", RestaurantScopedExpression("\"RestaurantId\""));
            CreatePolicy(migrationBuilder, "staff", RestaurantScopedExpression("\"RestaurantId\""));

            CreatePolicy(migrationBuilder, "orders", TableScopedExpression("\"TableId\""));
            CreatePolicy(migrationBuilder, "reservations", TableScopedExpression("\"TableId\""));

            CreatePolicy(migrationBuilder, "menu_items", """
                current_setting('app.current_user_role', true) = 'SuperAdmin'
                or "MenuId" in (
                    select m."Id"
                    from menu_of_restaurant m
                    join restaurants r on r."Id" = m."RestaurantId"
                    where r."TenantId" = nullif(current_setting('app.current_tenant_id', true), '')::uuid
                )
                """);

            CreatePolicy(migrationBuilder, "inventory_items", """
                current_setting('app.current_user_role', true) = 'SuperAdmin'
                or "InventoryId" in (
                    select i."Id"
                    from inventory i
                    join restaurants r on r."Id" = i."RestaurantId"
                    where r."TenantId" = nullif(current_setting('app.current_tenant_id', true), '')::uuid
                )
                """);

            var orderScopedExpression = """
                current_setting('app.current_user_role', true) = 'SuperAdmin'
                or "OrderId" in (
                    select o."Id"
                    from orders o
                    join tables t on t."Id" = o."TableId"
                    join restaurants r on r."Id" = t."RestaurantId"
                    where r."TenantId" = nullif(current_setting('app.current_tenant_id', true), '')::uuid
                )
                """;

            CreatePolicy(migrationBuilder, "order_items", orderScopedExpression);
            CreatePolicy(migrationBuilder, "kitchen_queue", orderScopedExpression);
            CreatePolicy(migrationBuilder, "payments", orderScopedExpression);

            CreatePolicy(migrationBuilder, "shifts", """
                current_setting('app.current_user_role', true) = 'SuperAdmin'
                or "StaffId" in (
                    select s."Id"
                    from staff s
                    join restaurants r on r."Id" = s."RestaurantId"
                    where r."TenantId" = nullif(current_setting('app.current_tenant_id', true), '')::uuid
                )
                """);

            CreatePolicy(migrationBuilder, "notifications", """
                current_setting('app.current_user_role', true) = 'SuperAdmin'
                or "UserId" = nullif(current_setting('app.user_id', true), '')::integer
                or "UserId" in (
                    select u."Id"
                    from users u
                    where u."TenantId" = nullif(current_setting('app.current_tenant_id', true), '')::uuid
                )
                """);

        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                do $$
                declare
                    policy_record record;
                begin
                    for policy_record in
                        select schemaname, tablename, policyname
                        from pg_policies
                        where schemaname = 'public'
                          and policyname = 'app_tenant_rls'
                    loop
                        execute format(
                            'drop policy if exists %I on %I.%I',
                            policy_record.policyname,
                            policy_record.schemaname,
                            policy_record.tablename
                        );
                    end loop;
                end
                $$;
                """);

        }

        private static void CreatePolicy(MigrationBuilder migrationBuilder, string tableName, string expression)
        {
            migrationBuilder.Sql($"""
                create policy app_tenant_rls on {tableName}
                for all
                to app_authenticated
                using (
                    {expression}
                )
                with check (
                    {expression}
                );
                """);
        }

        private static string DirectTenantExpression()
        {
            return """
                current_setting('app.current_user_role', true) = 'SuperAdmin'
                or "TenantId" = nullif(current_setting('app.current_tenant_id', true), '')::uuid
                """;
        }

        private static string RestaurantScopedExpression(string restaurantIdColumn)
        {
            return $$"""
                current_setting('app.current_user_role', true) = 'SuperAdmin'
                or {{restaurantIdColumn}} in (
                    select r."Id"
                    from restaurants r
                    where r."TenantId" = nullif(current_setting('app.current_tenant_id', true), '')::uuid
                )
                """;
        }

        private static string TableScopedExpression(string tableIdColumn)
        {
            return $$"""
                current_setting('app.current_user_role', true) = 'SuperAdmin'
                or {{tableIdColumn}} in (
                    select t."Id"
                    from tables t
                    join restaurants r on r."Id" = t."RestaurantId"
                    where r."TenantId" = nullif(current_setting('app.current_tenant_id', true), '')::uuid
                )
                """;
        }
    }
}
