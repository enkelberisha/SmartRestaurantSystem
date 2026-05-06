using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using srs.Server.Services.Auth;
using srs.Server.Services.OwnerAnalytics;

namespace srs.Server.Controllers.OwnerAnalytics;

[ApiController]
[Route("api/owner/analytics")]
[Authorize(Roles = "Owner,Admin,SuperAdmin")]
public class OwnerAnalyticsController(
    IOwnerAnalyticsService ownerAnalyticsService,
    ICurrentUserService currentUserService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(
        [FromQuery] int? restaurantId,
        CancellationToken cancellationToken)
    {
        var user = currentUserService.GetCurrentUser(User);

        if (user.TenantId is null)
        {
            return BadRequest("No tenant");
        }

        return Ok(await ownerAnalyticsService.GetAsync(
            user.TenantId.Value,
            restaurantId,
            cancellationToken));
    }
}
