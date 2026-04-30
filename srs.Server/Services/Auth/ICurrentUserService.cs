using System.Security.Claims;

namespace srs.Server.Services.Auth;

public interface ICurrentUserService
{
    Task<CurrentUserContext> EnsureUserAsync(ClaimsPrincipal principal, CancellationToken cancellationToken = default);
    CurrentUserContext GetCurrentUser(ClaimsPrincipal principal);
}
