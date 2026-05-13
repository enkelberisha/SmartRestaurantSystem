using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using srs.Server.Dtos.Payments;
using srs.Server.Services.Auth;
using srs.Server.Services.Payments;

namespace srs.Server.Controllers;

[ApiController]
[Route("api/payments")]
[Authorize]
public class PaymentsController : ControllerBase
{
    private readonly IPaymentService _service;
    private readonly ICurrentUserService _currentUserService;

    public PaymentsController(
        IPaymentService service,
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

    [HttpGet("order/{orderId:int}")]
    public async Task<IActionResult> GetByOrderId(int orderId, CancellationToken cancellationToken)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        return Ok(await _service.GetByOrderIdAsync(orderId, user.TenantId.Value, cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        var payment = await _service.GetByIdAsync(id, user.TenantId.Value);

        if (payment == null)
            return NotFound();

        return Ok(payment);
    }

    [HttpPost]
    [Authorize(Roles = "Owner,Manager,Admin,SuperAdmin,TableDevice,PosDevice")]
    public async Task<IActionResult> Create(CreatePaymentDto dto)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        try
        {
            var payment = await _service.CreateAsync(dto, user.TenantId.Value);
            return CreatedAtAction(nameof(GetById), new { id = payment.Id }, payment);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("{id:int}/status")]
    [Authorize(Roles = "Owner,Manager,Admin,SuperAdmin,TableDevice,PosDevice")]
    public async Task<IActionResult> UpdateStatus(int id, UpdatePaymentStatusDto dto)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        try
        {
            var updated = await _service.UpdateStatusAsync(id, dto, user.TenantId.Value);

            if (!updated)
                return NotFound();

            return NoContent();
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
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
