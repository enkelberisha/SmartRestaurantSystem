using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;

namespace srs.Server.Services;

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

        if (identity.HasClaim(claim => claim.Type == ClaimTypes.Role) &&
            identity.HasClaim(claim => claim.Type == "app_user_id"))
        {
            return principal;
        }

        var appUser = await currentUserService.EnsureUserAsync(principal);

        identity.AddClaim(new Claim("app_user_id", appUser.Id.ToString()));
        identity.AddClaim(new Claim("supabase_user_id", appUser.SupabaseUserId.ToString()));
        identity.AddClaim(new Claim(ClaimTypes.Role, appUser.Role.ToString()));

        if (appUser.TenantId.HasValue &&
            !identity.HasClaim(claim => claim.Type == "tenant_id"))
        {
            identity.AddClaim(new Claim("tenant_id", appUser.TenantId.Value.ToString()));
        }

        return principal;
    }
}
