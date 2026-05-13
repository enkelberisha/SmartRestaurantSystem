using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using srs.Server.Dtos.TableSessions;
using srs.Server.Services.Auth;
using srs.Server.Services.TableSessions;

namespace srs.Server.Controllers.TableSessions;

[ApiController]
[Route("api/table-sessions")]
[Authorize(Roles = "TableDevice,Owner,Manager,Admin,SuperAdmin")]
public class TableSessionsController(
    ITableSessionService tableSessionService,
    ICurrentUserService currentUserService) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create(CreateTableSessionDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var session = await tableSessionService.CreateAsync(dto, GetCurrentUser(), cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = session.Id }, session);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken cancellationToken)
    {
        var session = await tableSessionService.GetAsync(id, GetCurrentUser(), cancellationToken);

        if (session is null)
        {
            return NotFound();
        }

        return Ok(session);
    }

    [HttpGet("{id:guid}/orders")]
    public async Task<IActionResult> GetOrders(Guid id, CancellationToken cancellationToken)
    {
        var orders = await tableSessionService.GetOrdersAsync(id, GetCurrentUser(), cancellationToken);
        return Ok(orders);
    }

    [HttpPost("{id:guid}/orders")]
    public async Task<IActionResult> CreateOrder(Guid id, CreateTableSessionOrderDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var order = await tableSessionService.CreateOrderAsync(id, dto, GetCurrentUser(), cancellationToken);
            return Ok(order);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpPatch("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateTableSessionDto dto, CancellationToken cancellationToken)
    {
        if (!string.Equals(dto.Status, "Closed", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Only closing a table session is currently supported." });
        }

        var session = await tableSessionService.CloseAsync(id, GetCurrentUser(), cancellationToken);

        if (session is null)
        {
            return NotFound();
        }

        return Ok(session);
    }

    private CurrentUserContext GetCurrentUser()
    {
        return currentUserService.GetCurrentUser(User);
    }
}
