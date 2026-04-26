using System.Security.Claims;
using srs.Server.Models.Enums;

namespace srs.Server.Services;

public interface IRoleAccessService
{
    Task<bool> CanAccessAsync(
        ClaimsPrincipal principal,
        IEnumerable<UserRole> allowedRoles,
        CancellationToken cancellationToken = default);
}
