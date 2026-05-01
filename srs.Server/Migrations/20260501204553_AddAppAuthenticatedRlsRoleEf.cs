using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace srs.Server.Migrations
{
    /// <inheritdoc />
    public partial class AddAppAuthenticatedRlsRoleEf : Migration
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
                """);

            migrationBuilder.Sql("""
                grant usage on schema public to app_authenticated;
                grant select, insert, update, delete on all tables in schema public to app_authenticated;
                grant usage, select on all sequences in schema public to app_authenticated;
                """);

            migrationBuilder.Sql("""
                drop policy if exists tenant_isolation on users;
                drop policy if exists users_tenant_select on users;
                drop policy if exists users_tenant_insert on users;
                drop policy if exists users_tenant_update on users;
                drop policy if exists users_tenant_delete on users;

                alter table users enable row level security;
                alter table users force row level security;

                create policy users_tenant_select on users
                for select
                using (
                    current_setting('app.current_user_role', true) = 'SuperAdmin'
                    or "TenantId" = nullif(current_setting('app.current_tenant_id', true), '')::uuid
                    or "SupabaseUserId" = nullif(current_setting('app.supabase_user_id', true), '')::uuid
                );

                create policy users_tenant_insert on users
                for insert
                with check (
                    current_setting('app.current_user_role', true) = 'SuperAdmin'
                    or (
                        current_setting('app.current_user_role', true) = 'Admin'
                        and "TenantId" = nullif(current_setting('app.current_tenant_id', true), '')::uuid
                    )
                    or "SupabaseUserId" = nullif(current_setting('app.supabase_user_id', true), '')::uuid
                );

                create policy users_tenant_update on users
                for update
                using (
                    current_setting('app.current_user_role', true) = 'SuperAdmin'
                    or (
                        current_setting('app.current_user_role', true) = 'Admin'
                        and "TenantId" = nullif(current_setting('app.current_tenant_id', true), '')::uuid
                    )
                    or "SupabaseUserId" = nullif(current_setting('app.supabase_user_id', true), '')::uuid
                )
                with check (
                    current_setting('app.current_user_role', true) = 'SuperAdmin'
                    or (
                        current_setting('app.current_user_role', true) = 'Admin'
                        and "TenantId" = nullif(current_setting('app.current_tenant_id', true), '')::uuid
                    )
                    or "SupabaseUserId" = nullif(current_setting('app.supabase_user_id', true), '')::uuid
                );

                create policy users_tenant_delete on users
                for delete
                using (
                    current_setting('app.current_user_role', true) = 'SuperAdmin'
                    or (
                        current_setting('app.current_user_role', true) = 'Admin'
                        and "TenantId" = nullif(current_setting('app.current_tenant_id', true), '')::uuid
                    )
                );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                drop policy if exists users_tenant_select on users;
                drop policy if exists users_tenant_insert on users;
                drop policy if exists users_tenant_update on users;
                drop policy if exists users_tenant_delete on users;

                create policy tenant_isolation on users
                using ("TenantId" = current_setting('app.current_tenant_id', true)::uuid);
                """);
        }
    }
}
