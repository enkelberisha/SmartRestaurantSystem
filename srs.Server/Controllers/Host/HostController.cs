using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Models.Enums;
using srs.Server.Services.Auth;

namespace srs.Server.Controllers.Host;

[ApiController]
[Route("api/host")]
[Authorize(Roles = "HostDevice,Manager,Admin,Owner,SuperAdmin")]
public class HostController(AppDbContext db, ICurrentUserService currentUserService) : ControllerBase
{
    private static readonly UserRole[] NotifiableRoles =
    [
        UserRole.Manager,
        UserRole.Admin,
        UserRole.Owner
    ];

    /// <summary>
    /// Returns the users in the same tenant that a host can send notifications to (managers, admins, owners).
    /// </summary>
    [HttpGet("restaurant/{restaurantId:int}/notifiable")]
    public async Task<IActionResult> GetNotifiableUsers(int restaurantId, CancellationToken cancellationToken)
    {
        var user = currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest(new { message = "No tenant assigned to this account." });

        var users = await db.Users
            .Where(u =>
                u.TenantId == user.TenantId &&
                NotifiableRoles.Contains(u.Role) &&
                (u.RestaurantId == null || u.RestaurantId == restaurantId))
            .Select(u => new { u.Id, Name = u.Email })
            .ToListAsync(cancellationToken);

        return Ok(users);
    }
}
