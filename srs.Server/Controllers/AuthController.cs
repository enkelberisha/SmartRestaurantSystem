using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using srs.Server.Services;

[ApiController]
[Route("api/auth")]
public class AuthController(ICurrentUserService currentUserService) : ControllerBase
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
}
