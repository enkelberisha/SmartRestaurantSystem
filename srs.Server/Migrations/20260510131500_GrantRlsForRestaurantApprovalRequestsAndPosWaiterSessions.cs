using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using srs.Server.Data;

#nullable disable

namespace srs.Server.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260510131500_GrantRlsForRestaurantApprovalRequestsAndPosWaiterSessions")]
    public class GrantRlsForRestaurantApprovalRequestsAndPosWaiterSessions : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                grant select, insert, update, delete on restaurant_approval_requests to app_authenticated;
                grant usage, select on sequence "restaurant_approval_requests_Id_seq" to app_authenticated;

                grant select, insert, update, delete on pos_waiter_sessions to app_authenticated;
                grant usage, select on sequence "pos_waiter_sessions_Id_seq" to app_authenticated;

                alter default privileges in schema public grant select, insert, update, delete on tables to app_authenticated;
                alter default privileges in schema public grant usage, select on sequences to app_authenticated;

                alter table restaurant_approval_requests enable row level security;
                alter table restaurant_approval_requests force row level security;
                drop policy if exists app_tenant_rls on restaurant_approval_requests;
                create policy app_tenant_rls on restaurant_approval_requests
                for all
                to app_authenticated
                using (
                    current_setting('app.current_user_role', true) = 'SuperAdmin'
                    or "TenantId" = nullif(current_setting('app.current_tenant_id', true), '')::uuid
                )
                with check (
                    current_setting('app.current_user_role', true) = 'SuperAdmin'
                    or "TenantId" = nullif(current_setting('app.current_tenant_id', true), '')::uuid
                );

                alter table pos_waiter_sessions enable row level security;
                alter table pos_waiter_sessions force row level security;
                drop policy if exists app_tenant_rls on pos_waiter_sessions;
                create policy app_tenant_rls on pos_waiter_sessions
                for all
                to app_authenticated
                using (
                    current_setting('app.current_user_role', true) = 'SuperAdmin'
                    or "TenantId" = nullif(current_setting('app.current_tenant_id', true), '')::uuid
                )
                with check (
                    current_setting('app.current_user_role', true) = 'SuperAdmin'
                    or "TenantId" = nullif(current_setting('app.current_tenant_id', true), '')::uuid
                );
                """);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                drop policy if exists app_tenant_rls on restaurant_approval_requests;
                drop policy if exists app_tenant_rls on pos_waiter_sessions;

                alter table restaurant_approval_requests disable row level security;
                alter table pos_waiter_sessions disable row level security;

                revoke select, insert, update, delete on restaurant_approval_requests from app_authenticated;
                revoke usage, select on sequence "restaurant_approval_requests_Id_seq" from app_authenticated;

                revoke select, insert, update, delete on pos_waiter_sessions from app_authenticated;
                revoke usage, select on sequence "pos_waiter_sessions_Id_seq" from app_authenticated;
                """);
        }
    }
}
