using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using srs.Server.Dtos.Superadmin;
using srs.Server.Services.Superadmin;

namespace srs.Server.Controllers;

[ApiController]
[Route("api/superadmin/users")]
[Authorize(Roles = "SuperAdmin")]
public class SuperadminUsersController(ISuperadminUserService superadminUserService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var users = await superadminUserService.GetAllAsync(cancellationToken);
        return Ok(users);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateSuperadminUserRequestDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var user = await superadminUserService.CreateAsync(dto, cancellationToken);
            return Ok(user);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpPut("{id:int}/role")]
    public async Task<IActionResult> UpdateRole(int id, UpdateSuperadminUserRoleRequestDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var user = await superadminUserService.UpdateRoleAsync(id, dto, cancellationToken);
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
        var deleted = await superadminUserService.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
