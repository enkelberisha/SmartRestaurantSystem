using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using srs.Server.Dtos.DiningSessions;
using srs.Server.Services.Auth;
using srs.Server.Services.DiningSessions;

namespace srs.Server.Controllers.DiningSessions;

[ApiController]
[Route("api/dining-sessions")]
[Authorize(Roles = "Host,Owner,Manager,Admin,SuperAdmin")]
public class DiningSessionsController(
    IDiningSessionService diningSessionService,
    ICurrentUserService currentUserService) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create(CreateDiningSessionDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var session = await diningSessionService.CreateAsync(dto, GetCurrentUser(), cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = session.Id }, session);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpGet("active")]
    public async Task<IActionResult> GetActive([FromQuery] int? restaurantId, CancellationToken cancellationToken)
    {
        return Ok(await diningSessionService.GetActiveAsync(restaurantId, GetCurrentUser(), cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        var session = await diningSessionService.GetAsync(id, GetCurrentUser(), cancellationToken);

        if (session is null)
        {
            return NotFound();
        }

        return Ok(session);
    }

    [HttpPatch("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateDiningSessionDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var session = await diningSessionService.UpdateAsync(id, dto, GetCurrentUser(), cancellationToken);

            if (session is null)
            {
                return NotFound();
            }

            return Ok(session);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpPost("{id:int}/close")]
    public async Task<IActionResult> Close(int id, CancellationToken cancellationToken)
    {
        var session = await diningSessionService.CloseAsync(id, GetCurrentUser(), cancellationToken);

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
