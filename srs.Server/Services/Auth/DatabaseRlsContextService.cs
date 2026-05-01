using Microsoft.EntityFrameworkCore;
using srs.Server.Data;

namespace srs.Server.Services.Auth;

public class DatabaseRlsContextService(
    AppDbContext context,
    ICurrentUserService currentUserService) : IDatabaseRlsContextService
{
    private const string RlsRuntimeRole = "app_authenticated";
    private bool _isApplied;
    private bool _roleChanged;

    public async Task ApplyAsync(HttpContext httpContext, CancellationToken cancellationToken = default)
    {
        if (httpContext.User.Identity?.IsAuthenticated != true)
        {
            return;
        }

        var currentUser = await GetCurrentUserAsync(httpContext, cancellationToken);

        await context.Database.OpenConnectionAsync(cancellationToken);

        try
        {
            await context.Database.ExecuteSqlRawAsync("set row_security = on", cancellationToken);

            await SetConfigAsync("app.user_id", currentUser.Id.ToString(), cancellationToken);
            await SetConfigAsync("app.supabase_user_id", currentUser.SupabaseUserId.ToString(), cancellationToken);
            await SetConfigAsync("app.tenant_id", currentUser.TenantId?.ToString() ?? string.Empty, cancellationToken);
            await SetConfigAsync("app.current_tenant_id", currentUser.TenantId?.ToString() ?? string.Empty, cancellationToken);
            await SetConfigAsync("app.user_role", currentUser.Role.ToString(), cancellationToken);
            await SetConfigAsync("app.current_user_role", currentUser.Role.ToString(), cancellationToken);
            await SetConfigAsync("app.is_authenticated", "true", cancellationToken);

            if (await RoleExistsAsync(RlsRuntimeRole, cancellationToken))
            {
                await context.Database.ExecuteSqlRawAsync($"set role {RlsRuntimeRole}", cancellationToken);
                _roleChanged = true;
            }

            _isApplied = true;
        }
        catch
        {
            if (_roleChanged)
            {
                await context.Database.ExecuteSqlRawAsync("reset role", CancellationToken.None);
                _roleChanged = false;
            }

            await context.Database.CloseConnectionAsync();
            throw;
        }
    }

    public async Task ClearAsync(CancellationToken cancellationToken = default)
    {
        if (!_isApplied)
        {
            return;
        }

        try
        {
            if (_roleChanged)
            {
                await context.Database.ExecuteSqlRawAsync("reset role", cancellationToken);
                _roleChanged = false;
            }

            await SetConfigAsync("app.user_id", string.Empty, cancellationToken);
            await SetConfigAsync("app.supabase_user_id", string.Empty, cancellationToken);
            await SetConfigAsync("app.tenant_id", string.Empty, cancellationToken);
            await SetConfigAsync("app.current_tenant_id", string.Empty, cancellationToken);
            await SetConfigAsync("app.user_role", string.Empty, cancellationToken);
            await SetConfigAsync("app.current_user_role", string.Empty, cancellationToken);
            await SetConfigAsync("app.is_authenticated", "false", cancellationToken);
            await context.Database.ExecuteSqlRawAsync("reset row_security", cancellationToken);
        }
        finally
        {
            _isApplied = false;
            _roleChanged = false;
            await context.Database.CloseConnectionAsync();
        }
    }

    private async Task<CurrentUserContext> GetCurrentUserAsync(
        HttpContext httpContext,
        CancellationToken cancellationToken)
    {
        try
        {
            return currentUserService.GetCurrentUser(httpContext.User);
        }
        catch (InvalidOperationException)
        {
            return await currentUserService.EnsureUserAsync(httpContext.User, cancellationToken);
        }
    }

    private Task SetConfigAsync(string key, string value, CancellationToken cancellationToken)
    {
        return context.Database.ExecuteSqlRawAsync(
            "select set_config({0}, {1}, false)",
            [key, value],
            cancellationToken);
    }

    private async Task<bool> RoleExistsAsync(string roleName, CancellationToken cancellationToken)
    {
        return await context.Database
            .SqlQueryRaw<bool>(
                "select exists (select 1 from pg_roles where rolname = {0}) as \"Value\"",
                roleName)
            .FirstAsync(cancellationToken);
    }
}
