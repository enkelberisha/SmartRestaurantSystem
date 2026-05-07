using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using srs.Server.Dtos.Shifts;
using srs.Server.Services.Auth;
using srs.Server.Services.Shifts;

namespace srs.Server.Controllers;

[ApiController]
[Route("api/shifts")]
[Authorize]
public class ShiftsController : ControllerBase
{
    private readonly IShiftService _service;
    private readonly ICurrentUserService _currentUserService;

    public ShiftsController(
        IShiftService service,
        ICurrentUserService currentUserService)
    {
        _service = service;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        return Ok(await _service.GetAllAsync(user.TenantId.Value, cancellationToken));
    }

    [HttpGet("staff/{staffId:int}")]
    public async Task<IActionResult> GetByStaffId(int staffId, CancellationToken cancellationToken)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        return Ok(await _service.GetByStaffIdAsync(staffId, user.TenantId.Value, cancellationToken));
    }

    [HttpGet("restaurant/{restaurantId:int}")]
    public async Task<IActionResult> GetByRestaurantId(int restaurantId, CancellationToken cancellationToken)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        return Ok(await _service.GetByRestaurantIdAsync(restaurantId, user.TenantId.Value, cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        var shift = await _service.GetByIdAsync(id, user.TenantId.Value);

        if (shift == null)
            return NotFound();

        return Ok(shift);
    }

    [HttpPost]
    [Authorize(Roles = "Owner,Manager,Admin,SuperAdmin")]
    public async Task<IActionResult> Create(CreateShiftDto dto)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        try
        {
            var shift = await _service.CreateAsync(dto, user.TenantId.Value);
            return CreatedAtAction(nameof(GetById), new { id = shift.Id }, shift);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Owner,Manager,Admin,SuperAdmin")]
    public async Task<IActionResult> Update(int id, UpdateShiftDto dto)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        try
        {
            var updated = await _service.UpdateAsync(id, dto, user.TenantId.Value);

            if (!updated)
                return NotFound();

            return NoContent();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("{id:int}")]
    [Authorize(Roles = "Owner,Manager,Admin,SuperAdmin")]
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
