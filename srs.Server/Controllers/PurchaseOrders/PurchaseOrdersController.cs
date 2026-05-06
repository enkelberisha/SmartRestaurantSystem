using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using srs.Server.Dtos.PurchaseOrders;
using srs.Server.Services.Auth;
using srs.Server.Services.PurchaseOrders;

namespace srs.Server.Controllers;

[ApiController]
[Route("api/purchase-orders")]
[Authorize]
public class PurchaseOrdersController : ControllerBase
{
    private readonly IPurchaseOrderService _service;
    private readonly ICurrentUserService _currentUserService;

    public PurchaseOrdersController(
        IPurchaseOrderService service,
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

    [HttpGet("restaurant/{restaurantId:int}")]
    public async Task<IActionResult> GetByRestaurantId(int restaurantId, CancellationToken cancellationToken)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        return Ok(await _service.GetByRestaurantIdAsync(restaurantId, user.TenantId.Value, cancellationToken));
    }

    [HttpGet("supplier/{supplierId:int}")]
    public async Task<IActionResult> GetBySupplierId(int supplierId, CancellationToken cancellationToken)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        return Ok(await _service.GetBySupplierIdAsync(supplierId, user.TenantId.Value, cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        var purchaseOrder = await _service.GetByIdAsync(id, user.TenantId.Value);

        if (purchaseOrder == null)
            return NotFound();

        return Ok(purchaseOrder);
    }

    [HttpPost]
    [Authorize(Roles = "Owner,Manager,Admin,SuperAdmin")]
    public async Task<IActionResult> Create(CreatePurchaseOrderDto dto)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        try
        {
            var purchaseOrder = await _service.CreateAsync(dto, user.TenantId.Value);
            return CreatedAtAction(nameof(GetById), new { id = purchaseOrder.Id }, purchaseOrder);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("{id:int}")]
    [Authorize(Roles = "Owner,Manager,Admin,SuperAdmin")]
    public async Task<IActionResult> Update(int id, UpdatePurchaseOrderDto dto)
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
