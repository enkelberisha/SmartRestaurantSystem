using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;

namespace srs.Server.Services.Auth;

public class AppUserClaimsTransformation(ICurrentUserService currentUserService) : IClaimsTransformation
{
    public async Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        if (principal.Identity?.IsAuthenticated != true)
        {
            return principal;
        }

        var identity = principal.Identities.FirstOrDefault(identity => identity.IsAuthenticated);
        if (identity is null)
        {
            return principal;
        }

        var appUser = await currentUserService.EnsureUserAsync(principal);

        ReplaceClaim(identity, "app_user_id", appUser.Id.ToString());
        ReplaceClaim(identity, "supabase_user_id", appUser.SupabaseUserId.ToString());
        ReplaceClaim(identity, ClaimTypes.Role, appUser.Role.ToString());

        if (appUser.TenantId.HasValue)
        {
            ReplaceClaim(identity, "tenant_id", appUser.TenantId.Value.ToString());
        }
        else
        {
            RemoveClaims(identity, "tenant_id");
        }

        return principal;
    }

    private static void ReplaceClaim(ClaimsIdentity identity, string claimType, string value)
    {
        RemoveClaims(identity, claimType);
        identity.AddClaim(new Claim(claimType, value));
    }

    private static void RemoveClaims(ClaimsIdentity identity, string claimType)
    {
        foreach (var claim in identity.FindAll(claimType).ToArray())
        {
            identity.RemoveClaim(claim);
        }
    }
}
