using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Models;
using srs.Server.Models.Enums;

namespace srs.Server.Services.Auth;

public class CurrentUserService(AppDbContext context, ILogger<CurrentUserService> logger) : ICurrentUserService
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
                Role = UserRole.Pending,
                TenantId = null,
                RestaurantId = null,
                IsActivated = false
            };

            context.Users.Add(user);
            await NotifySuperAdminsIfNeededAsync(
                $"Activation required: {email} signed in and a pending application profile was created automatically.",
                cancellationToken);
            await context.SaveChangesAsync(cancellationToken);

            logger.LogInformation(
                "Created pending local user profile for authenticated account {Email} ({SupabaseUserId}).",
                email,
                supabaseUserId);

            throw new AccountActivationPendingException(
                "Your account has not been activated yet. A pending profile was created and the super admin has been notified.");
        }
        else if (!string.Equals(user.Email, email, StringComparison.OrdinalIgnoreCase))
        {
            user.Email = email;
            await context.SaveChangesAsync(cancellationToken);
        }

        if (!IsActivated(user))
        {
            await NotifySuperAdminsIfNeededAsync(
                $"Activation required: {user.Email} tried to sign in but the account is not fully activated yet.",
                cancellationToken);

            throw new AccountActivationPendingException(
                "Your account exists, but it has not been activated yet. Please wait for a super admin to assign your access.");
        }

        return new CurrentUserContext(
            user.Id,
            user.SupabaseUserId,
            user.Email,
            user.Role,
            user.TenantId,
            user.RestaurantId
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

        int? restaurantId = null;
        var restaurantIdValue = principal.FindFirstValue("restaurant_id");
        if (restaurantIdValue is not null)
        {
            if (!int.TryParse(restaurantIdValue, out var parsedRestaurantId))
            {
                throw new InvalidOperationException("Authenticated user has an invalid restaurant id claim.");
            }

            restaurantId = parsedRestaurantId;
        }

        return new CurrentUserContext(
            appUserId,
            supabaseUserId,
            email,
            role,
            tenantId,
            restaurantId
        );
    }

    private static bool IsActivated(User user)
    {
        if (!user.IsActivated)
        {
            return false;
        }

        if (user.Role == UserRole.Pending)
        {
            return false;
        }

        if (user.Role == UserRole.SuperAdmin)
        {
            return true;
        }

        if (!user.TenantId.HasValue)
        {
            return false;
        }

        return user.Role switch
        {
            UserRole.Manager => user.RestaurantId.HasValue,
            UserRole.PosDevice or UserRole.TableDevice or UserRole.KitchenDevice or UserRole.HostDevice
                => user.RestaurantId.HasValue,
            _ => true
        };
    }

    private async Task NotifySuperAdminsIfNeededAsync(string message, CancellationToken cancellationToken)
    {
        var superAdminIds = await context.Users
            .Where(user => user.Role == UserRole.SuperAdmin)
            .Select(user => user.Id)
            .ToListAsync(cancellationToken);

        if (superAdminIds.Count == 0)
        {
            logger.LogWarning("No super admin accounts are available to receive activation notification: {Message}", message);
            return;
        }

        var threshold = DateTime.UtcNow.AddMinutes(-30);

        foreach (var superAdminId in superAdminIds)
        {
            var alreadySent = await context.Notifications.AnyAsync(notification =>
                notification.UserId == superAdminId &&
                notification.Message == message &&
                notification.CreatedAt >= threshold,
                cancellationToken);

            if (alreadySent)
            {
                continue;
            }

            context.Notifications.Add(new Notification
            {
                UserId = superAdminId,
                Message = message
            });
        }
    }
}
