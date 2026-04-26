using System.Security.Claims;
using srs.Server.Models.Enums;

namespace srs.Server.Services;

public class RoleAccessService(ICurrentUserService currentUserService) : IRoleAccessService
{
    public async Task<bool> CanAccessAsync(
        ClaimsPrincipal principal,
        IEnumerable<UserRole> allowedRoles,
        CancellationToken cancellationToken = default)
    {
        var roleClaim = principal.FindFirst(ClaimTypes.Role)?.Value;

        if (roleClaim is not null)
        {
            return allowedRoles.Select(r => r.ToString()).Contains(roleClaim);
        }

        var currentUser = await currentUserService.EnsureUserAsync(principal, cancellationToken);
        return allowedRoles.Contains(currentUser.Role);
    }
}
