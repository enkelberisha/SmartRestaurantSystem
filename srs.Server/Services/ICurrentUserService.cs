using System.Security.Claims;

namespace srs.Server.Services;

public interface ICurrentUserService
{
    Task<CurrentUserContext> EnsureUserAsync(ClaimsPrincipal principal, CancellationToken cancellationToken = default);
    CurrentUserContext GetCurrentUser(ClaimsPrincipal principal);
}
