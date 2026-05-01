using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using srs.Server.Dtos.Users;
using srs.Server.Services.Auth;
using srs.Server.Services.Users;

namespace srs.Server.Controllers.Users;

[ApiController]
[Route("api/users")]
[Authorize(Roles = "Admin,SuperAdmin")]
public class UsersController(
    IUserService userService,
    ICurrentUserService currentUserService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var currentUser = await GetCurrentUserAsync(cancellationToken);
        var users = await userService.GetAllAsync(currentUser, cancellationToken);
        return Ok(users);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        var currentUser = await GetCurrentUserAsync(cancellationToken);
        var user = await userService.GetByIdAsync(id, currentUser, cancellationToken);
        return user is null ? NotFound() : Ok(user);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateUserRequestDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            var user = await userService.CreateAsync(dto, currentUser, cancellationToken);
            return CreatedAtAction(nameof(GetById), new { id = user.Id }, user);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
        catch (InvalidOperationException exception)
        {
            if (exception.Message.Contains("already exists", StringComparison.OrdinalIgnoreCase))
            {
                return Conflict(new { message = exception.Message });
            }

            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, UpdateUserRequestDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            var user = await userService.UpdateAsync(id, dto, currentUser, cancellationToken);
            return user is null ? NotFound() : Ok(user);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        try
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            var deleted = await userService.DeleteAsync(id, currentUser, cancellationToken);
            return deleted ? NoContent() : NotFound();
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    private async Task<CurrentUserContext> GetCurrentUserAsync(CancellationToken cancellationToken)
    {
        try
        {
            return currentUserService.GetCurrentUser(User);
        }
        catch (InvalidOperationException)
        {
            return await currentUserService.EnsureUserAsync(User, cancellationToken);
        }
    }
}
