using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Services.Auth;

namespace srs.Server.Controllers.Auth;

[ApiController]
[Route("api/auth")]
public class AuthController(
    ICurrentUserService currentUserService,
    AppDbContext context) : ControllerBase
{
    [Authorize]
    [HttpPost("sync-user")]
    public async Task<IActionResult> SyncUser(CancellationToken cancellationToken)
    {
        var appUser = await currentUserService.EnsureUserAsync(User, cancellationToken);

        return Ok(new
        {
            appUserId = appUser.Id,
            supabaseUserId = appUser.SupabaseUserId,
            email = appUser.Email,
            role = appUser.Role.ToString(),
            tenantId = appUser.TenantId
        });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken cancellationToken)
    {
        CurrentUserContext appUser;

        try
        {
            appUser = currentUserService.GetCurrentUser(User);
        }
        catch (InvalidOperationException)
        {
            appUser = await currentUserService.EnsureUserAsync(User, cancellationToken);
        }

        return Ok(new
        {
            appUserId = appUser.Id,
            supabaseUserId = appUser.SupabaseUserId,
            email = appUser.Email,
            role = appUser.Role.ToString(),
            tenantId = appUser.TenantId
        });
    }

    [Authorize]
    [HttpGet("rls-context")]
    public async Task<IActionResult> RlsContext(CancellationToken cancellationToken)
    {
        var values = await context.Database
            .SqlQueryRaw<RlsContextValues>("""
                select
                    current_setting('app.current_tenant_id', true) as "CurrentTenantId",
                    current_setting('app.tenant_id', true) as "TenantId",
                    current_setting('app.current_user_role', true) as "CurrentUserRole",
                    current_setting('app.user_role', true) as "UserRole",
                    current_setting('app.is_authenticated', true) as "IsAuthenticated"
                """)
            .FirstAsync(cancellationToken);

        return Ok(values);
    }

    [Authorize]
    [HttpGet("rls-diagnostics")]
    public async Task<IActionResult> RlsDiagnostics(CancellationToken cancellationToken)
    {
        var values = await context.Database
            .SqlQueryRaw<RlsDiagnosticsValues>("""
                select
                    current_user as "DatabaseUser",
                    current_setting('row_security', true) as "RowSecuritySetting",
                    current_setting('app.current_tenant_id', true) as "CurrentTenantId",
                    current_setting('app.current_user_role', true) as "CurrentUserRole",
                    c.relrowsecurity as "UsersRlsEnabled",
                    c.relforcerowsecurity as "UsersRlsForced",
                    r.rolbypassrls as "DatabaseUserBypassesRls",
                    exists (
                        select 1
                        from pg_policies p
                        where p.schemaname = 'public'
                          and p.tablename = 'users'
                    ) as "UsersHasPolicies",
                    (
                        select count(*)::int
                        from pg_policies p
                        where p.schemaname = 'public'
                          and p.tablename = 'users'
                    ) as "UsersPolicyCount"
                from pg_class c
                join pg_namespace n on n.oid = c.relnamespace
                join pg_roles r on r.rolname = current_user
                where n.nspname = 'public'
                  and c.relname = 'users'
                """)
            .FirstAsync(cancellationToken);

        return Ok(values);
    }

    private sealed class RlsContextValues
    {
        public string? CurrentTenantId { get; set; }
        public string? TenantId { get; set; }
        public string? CurrentUserRole { get; set; }
        public string? UserRole { get; set; }
        public string? IsAuthenticated { get; set; }
    }

    private sealed class RlsDiagnosticsValues
    {
        public string? DatabaseUser { get; set; }
        public string? RowSecuritySetting { get; set; }
        public string? CurrentTenantId { get; set; }
        public string? CurrentUserRole { get; set; }
        public bool UsersRlsEnabled { get; set; }
        public bool UsersRlsForced { get; set; }
        public bool DatabaseUserBypassesRls { get; set; }
        public bool UsersHasPolicies { get; set; }
        public int UsersPolicyCount { get; set; }
    }
}
