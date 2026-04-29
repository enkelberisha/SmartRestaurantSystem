using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using srs.Server.Dtos.Restaurants;
using srs.Server.Models.Enums;
using srs.Server.Services;
using srs.Server.Services.Restaurants;

namespace srs.Server.Controllers;

[ApiController]
[Route("api/restaurants")]
[Authorize]
public class RestaurantsController : ControllerBase
{
    private readonly IRestaurantService _restaurantService;
    private readonly ICurrentUserService _currentUserService;
    private readonly IRoleAccessService _roleAccessService;

    public RestaurantsController(
        IRestaurantService restaurantService,
        ICurrentUserService currentUserService,
        IRoleAccessService roleAccessService)
    {
        _restaurantService = restaurantService;
        _currentUserService = currentUserService;
        _roleAccessService = roleAccessService;
    }

    [HttpGet("current")]
    public async Task<IActionResult> GetCurrent(CancellationToken cancellationToken)
    {
        var user = await GetCurrentUserAsync(cancellationToken);
        var restaurant = await _restaurantService.GetCurrentAsync(user, cancellationToken);

        if (restaurant == null)
            return NotFound();

        return Ok(restaurant);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("User has no tenant");

        var result = await _restaurantService.GetAllAsync(user.TenantId.Value);

        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("User has no tenant");

        var restaurant = await _restaurantService.GetByIdAsync(id, user.TenantId.Value);

        if (restaurant == null)
            return NotFound();

        return Ok(restaurant);
    }

    [HttpPost]
    [Authorize(Roles = "Owner,Admin,SuperAdmin")]
    public async Task<IActionResult> Create(RestaurantRequestDto dto, CancellationToken cancellationToken)
    {
        var hasAccess = await _roleAccessService.CanAccessAsync(
            User,
            [UserRole.Owner, UserRole.Admin, UserRole.SuperAdmin],
            cancellationToken);

        if (!hasAccess)
            return Forbid();

        var user = await GetCurrentUserAsync(cancellationToken);
        var restaurant = await _restaurantService.CreateAsync(dto, user, cancellationToken);

        return CreatedAtAction(nameof(GetCurrent), new { }, restaurant);
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Owner,Admin,SuperAdmin")]
    public async Task<IActionResult> Update(int id, RestaurantRequestDto dto)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("User has no tenant");

        var updated = await _restaurantService.UpdateAsync(id, dto, user.TenantId.Value);

        if (updated == null)
            return NotFound();

        return Ok(updated);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Owner,Admin,SuperAdmin")]
    public async Task<IActionResult> Delete(int id)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("User has no tenant");

        var deleted = await _restaurantService.DeleteAsync(id, user.TenantId.Value);

        if (!deleted)
            return NotFound();

        return NoContent();
    }

    private async Task<CurrentUserContext> GetCurrentUserAsync(CancellationToken cancellationToken)
    {
        try
        {
            return _currentUserService.GetCurrentUser(User);
        }
        catch (InvalidOperationException)
        {
            return await _currentUserService.EnsureUserAsync(User, cancellationToken);
        }
    }
}
