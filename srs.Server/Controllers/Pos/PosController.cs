using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Dtos.Pos;
using srs.Server.Models;
using srs.Server.Models.Enums;
using srs.Server.Services.Auth;
using srs.Server.Services.Staff;

namespace srs.Server.Controllers.Pos;

[ApiController]
[Route("api/pos")]
[Authorize(Roles = "PosDevice")]
public class PosController(
    AppDbContext context,
    ICurrentUserService currentUserService) : ControllerBase
{
    [HttpPost("waiter-login")]
    public async Task<IActionResult> WaiterLogin(PosWaiterLoginRequestDto dto, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(dto.CredentialValue))
        {
            return BadRequest(new { message = "Credential value is required." });
        }

        var currentUser = currentUserService.GetCurrentUser(User);

        if (currentUser.Role != UserRole.PosDevice)
        {
            return Forbid();
        }

        if (!currentUser.TenantId.HasValue || !currentUser.RestaurantId.HasValue)
        {
            return BadRequest(new { message = "POS device account is missing tenant or restaurant context." });
        }

        var credentialHash = StaffService.HashCredential(dto.CredentialValue);
        var staff = await context.Staff
            .FirstOrDefaultAsync(
                current =>
                    current.TenantId == currentUser.TenantId.Value &&
                    current.RestaurantId == currentUser.RestaurantId.Value &&
                    current.IsActive &&
                    current.CredentialHash == credentialHash,
                cancellationToken);

        if (staff is null)
        {
            return Unauthorized(new { message = "Waiter credential was not recognized." });
        }

        var openSessions = await context.PosWaiterSessions
            .Where(session =>
                session.PosUserId == currentUser.Id &&
                session.ClosedAt == null)
            .ToListAsync(cancellationToken);

        foreach (var openSession in openSessions)
        {
            openSession.ClosedAt = DateTime.UtcNow;
        }

        var sessionEntity = new PosWaiterSession
        {
            PosUserId = currentUser.Id,
            StaffId = staff.Id,
            TenantId = currentUser.TenantId.Value,
            RestaurantId = currentUser.RestaurantId.Value
        };

        context.PosWaiterSessions.Add(sessionEntity);
        await context.SaveChangesAsync(cancellationToken);

        return Ok(new PosWaiterSessionResponseDto
        {
            StaffId = staff.Id,
            FullName = staff.FullName,
            RestaurantId = sessionEntity.RestaurantId,
            TenantId = sessionEntity.TenantId,
            SessionId = sessionEntity.Id,
            OpenedAt = sessionEntity.OpenedAt
        });
    }
}
