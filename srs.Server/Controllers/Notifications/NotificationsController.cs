using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using srs.Server.Dtos.Notifications;
using srs.Server.Services.Auth;
using srs.Server.Services.Notifications;

namespace srs.Server.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationsController : ControllerBase
{
    private readonly INotificationService _service;
    private readonly ICurrentUserService _currentUserService;

    public NotificationsController(
        INotificationService service,
        ICurrentUserService currentUserService)
    {
        _service = service;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    public async Task<IActionResult> GetMine(CancellationToken cancellationToken)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        return Ok(await _service.GetByUserIdAsync(user.Id, user.TenantId.Value, cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        var notification = await _service.GetByIdAsync(id, user.Id, user.TenantId.Value);

        if (notification == null)
            return NotFound();

        return Ok(notification);
    }

    [HttpPost]
    [Authorize(Roles = "Owner,Manager,Admin,SuperAdmin")]
    public async Task<IActionResult> Create(CreateNotificationDto dto)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        try
        {
            var notification = await _service.CreateAsync(dto, user.TenantId.Value);
            return CreatedAtAction(nameof(GetById), new { id = notification.Id }, notification);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("{id:int}/read")]
    public async Task<IActionResult> MarkAsRead(int id)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        var updated = await _service.MarkAsReadAsync(id, user.Id, user.TenantId.Value);

        if (!updated)
            return NotFound();

        return NoContent();
    }

    [HttpPut("read-all")]
    public async Task<IActionResult> MarkAllAsRead()
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        var count = await _service.MarkAllAsReadAsync(user.Id, user.TenantId.Value);

        return Ok(new { marked = count });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        var deleted = await _service.DeleteAsync(id, user.Id, user.TenantId.Value);

        if (!deleted)
            return NotFound();

        return NoContent();
    }
}
