using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using srs.Server.Dtos.Orders;
using srs.Server.Services.Auth;
using srs.Server.Services.Orders;

namespace srs.Server.Controllers;

[ApiController]
[Route("api/orders")]
[Authorize]
public class OrdersController : ControllerBase
{
    private readonly IOrderService _service;
    private readonly ICurrentUserService _currentUserService;

    public OrdersController(
        IOrderService service,
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

        var order = await _service.GetByIdAsync(id, user.TenantId.Value);

        if (order == null)
            return NotFound();

        return Ok(order);
    }

    [HttpPost]
    [Authorize(Roles = "Owner,Manager,Admin,SuperAdmin,PosDevice")]
    public async Task<IActionResult> Create(CreateOrderDto dto, CancellationToken cancellationToken)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        var order = await _service.CreateAsync(dto, user, cancellationToken);

        return CreatedAtAction(nameof(GetById), new { id = order.Id }, order);
    }

    [HttpPut("{id}/status")]
    [Authorize(Roles = "Owner,Manager,Admin,SuperAdmin,KitchenDevice")]
    public async Task<IActionResult> UpdateStatus(int id, UpdateOrderStatusDto dto)
    {
        try
        {
            var user = _currentUserService.GetCurrentUser(User);

            if (user.TenantId == null)
                return BadRequest("No tenant");

            var updated = await _service.UpdateStatusAsync(id, dto, user);

            if (!updated)
                return NotFound();

            return NoContent();
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(exception.Message);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(exception.Message);
        }
        catch (Exception exception)
        {
            return BadRequest(exception.Message);
        }
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
