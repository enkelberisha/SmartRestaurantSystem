using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using srs.Server.Dtos.Menu;
using srs.Server.Services.Auth;
using srs.Server.Services.Menu;

namespace srs.Server.Controllers;

[ApiController]
[Route("api/menu")]
[Authorize]
public class MenuController : ControllerBase
{
    private readonly IMenuService _menuService;
    private readonly ICurrentUserService _currentUserService;

    public MenuController(
        IMenuService menuService,
        ICurrentUserService currentUserService)
    {
        _menuService = menuService;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        var result = await _menuService.GetAllAsync(user.TenantId.Value);

        return Ok(result);
    }

    [HttpGet("restaurant/{restaurantId:int}")]
    public async Task<IActionResult> GetByRestaurantId(int restaurantId, CancellationToken cancellationToken)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        return Ok(await _menuService.GetByRestaurantIdAsync(
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

        var menu = await _menuService.GetByIdAsync(id, user.TenantId.Value);

        if (menu == null)
            return NotFound();

        return Ok(menu);
    }

    [HttpPost]
    [Authorize(Roles = "Owner,Admin,SuperAdmin")]
    public async Task<IActionResult> Create(MenuRequestDto dto)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        var menu = await _menuService.CreateAsync(dto, user.TenantId.Value);

        return CreatedAtAction(nameof(GetById), new { id = menu.Id }, menu);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Owner,Admin,SuperAdmin")]
    public async Task<IActionResult> Update(int id, MenuRequestDto dto)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        var updated = await _menuService.UpdateAsync(id, dto, user.TenantId.Value);

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

        var deleted = await _menuService.DeleteAsync(id, user.TenantId.Value);

        if (!deleted)
            return NotFound();

        return NoContent();
    }
}
