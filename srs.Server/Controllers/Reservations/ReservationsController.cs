using Microsoft.AspNetCore.Mvc;
using srs.Server.Dtos.Reservations;
using srs.Server.Services.Reservations;

namespace srs.Server.Controllers.Reservations;

[ApiController]
[Route("api/reservations")]
public class ReservationsController(IReservationService reservationService) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create(ReservationRequestDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var result = await reservationService.CreateAsync(dto, cancellationToken);
            return Ok(result);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(new { message = exception.Message });
        }
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var result = await reservationService.GetAllAsync(cancellationToken);
        return Ok(result);
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id, CancellationToken cancellationToken)
    {
        var result = await reservationService.GetByIdAsync(id, cancellationToken);
        return result is null ? NotFound() : Ok(result);
    }

    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, ReservationRequestDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var result = await reservationService.UpdateAsync(id, dto, cancellationToken);
            return result is null ? NotFound() : Ok(result);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(new { message = exception.Message });
        }
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var deleted = await reservationService.DeleteAsync(id, cancellationToken);
        return deleted ? NoContent() : NotFound();
    }
}
