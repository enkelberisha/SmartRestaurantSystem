using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Models;
using srs.Server.Models.Enums;

namespace srs.Server.Services;

public class CurrentUserService(AppDbContext context) : ICurrentUserService
{
    public async Task<CurrentUserContext> EnsureUserAsync(
        ClaimsPrincipal principal,
        CancellationToken cancellationToken = default)
    {
        var subject = principal.FindFirstValue("sub")
            ?? principal.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("Authenticated user is missing the 'sub' claim.");

        if (!Guid.TryParse(subject, out var supabaseUserId))
        {
            throw new InvalidOperationException("Authenticated user has an invalid Supabase user id.");
        }

        var email = principal.FindFirstValue("email")
            ?? principal.FindFirstValue(ClaimTypes.Email)
            ?? throw new InvalidOperationException("Authenticated user is missing the 'email' claim.");

        var user = await context.Users
            .FirstOrDefaultAsync(u => u.SupabaseUserId == supabaseUserId, cancellationToken);

        if (user is null)
        {
            user = new User
            {
                SupabaseUserId = supabaseUserId,
                Email = email,
                Role = UserRole.User
            };

            context.Users.Add(user);
            await context.SaveChangesAsync(cancellationToken);
        }
        else if (!string.Equals(user.Email, email, StringComparison.OrdinalIgnoreCase))
        {
            user.Email = email;
            await context.SaveChangesAsync(cancellationToken);
        }

        return new CurrentUserContext(
            user.Id,
            user.SupabaseUserId,
            user.Email,
            user.Role,
            user.TenantId
        );
    }

    public CurrentUserContext GetCurrentUser(ClaimsPrincipal principal)
    {
        var appUserIdValue = principal.FindFirstValue("app_user_id")
            ?? throw new InvalidOperationException("Authenticated user is missing the 'app_user_id' claim.");

        if (!int.TryParse(appUserIdValue, out var appUserId))
        {
            throw new InvalidOperationException("Authenticated user has an invalid app user id.");
        }

        var supabaseUserIdValue = principal.FindFirstValue("supabase_user_id")
            ?? principal.FindFirstValue("sub")
            ?? principal.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? throw new InvalidOperationException("Authenticated user is missing the Supabase user id claim.");

        if (!Guid.TryParse(supabaseUserIdValue, out var supabaseUserId))
        {
            throw new InvalidOperationException("Authenticated user has an invalid Supabase user id.");
        }

        var email = principal.FindFirstValue("email")
            ?? principal.FindFirstValue(ClaimTypes.Email)
            ?? throw new InvalidOperationException("Authenticated user is missing the 'email' claim.");

        var roleValue = principal.FindFirstValue(ClaimTypes.Role)
            ?? throw new InvalidOperationException("Authenticated user is missing the role claim.");

        if (!Enum.TryParse<UserRole>(roleValue, out var role))
        {
            throw new InvalidOperationException("Authenticated user has an invalid role claim.");
        }

        Guid? tenantId = null;
        var tenantIdValue = principal.FindFirstValue("tenant_id");
        if (tenantIdValue is not null)
        {
            if (!Guid.TryParse(tenantIdValue, out var parsedTenantId))
            {
                throw new InvalidOperationException("Authenticated user has an invalid tenant id claim.");
            }

            tenantId = parsedTenantId;
        }

        return new CurrentUserContext(
            appUserId,
            supabaseUserId,
            email,
            role,
            tenantId
        );
    }
}
