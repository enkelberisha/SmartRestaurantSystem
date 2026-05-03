using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using srs.Server.Dtos.MenuItems;
using srs.Server.Services.Auth;
using srs.Server.Services.MenuItems;

namespace srs.Server.Controllers;

[ApiController]
[Route("api/menu-items")]
[Authorize]
public class MenuItemsController : ControllerBase
{
    private readonly IMenuItemService _service;
    private readonly ICurrentUserService _currentUserService;

    public MenuItemsController(
        IMenuItemService service,
        ICurrentUserService currentUserService)
    {
        _service = service;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        return Ok(await _service.GetAllAsync(user.TenantId.Value));
    }

    [HttpGet("restaurant/{restaurantId:int}")]
    public async Task<IActionResult> GetByRestaurantId(int restaurantId, CancellationToken cancellationToken)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        return Ok(await _service.GetByRestaurantIdAsync(
            restaurantId,
            user.TenantId.Value,
            cancellationToken));
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        var item = await _service.GetByIdAsync(id, user.TenantId.Value);

        if (item == null)
            return NotFound();

        return Ok(item);
    }

    [HttpPost]
    [Authorize(Roles = "Owner,Admin,SuperAdmin")]
    public async Task<IActionResult> Create(MenuItemRequestDto dto)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        var item = await _service.CreateAsync(dto, user.TenantId.Value);

        return CreatedAtAction(nameof(GetById), new { id = item.Id }, item);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Owner,Admin,SuperAdmin")]
    public async Task<IActionResult> Update(int id, MenuItemRequestDto dto)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        var updated = await _service.UpdateAsync(id, dto, user.TenantId.Value);

        if (!updated)
            return NotFound();

        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Owner,Admin,SuperAdmin")]
    public async Task<IActionResult> Delete(int id)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        var deleted = await _service.DeleteAsync(id, user.TenantId.Value);

        if (!deleted)
            return NotFound();

        return NoContent();
    }
}
