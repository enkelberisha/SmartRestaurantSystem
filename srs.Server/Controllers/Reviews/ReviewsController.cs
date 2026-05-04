using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using srs.Server.Dtos.Reviews;
using srs.Server.Services.Auth;
using srs.Server.Services.Reviews;

namespace srs.Server.Controllers;

[ApiController]
[Route("api/reviews")]
public class ReviewsController : ControllerBase
{
    private readonly IReviewService _service;
    private readonly ICurrentUserService _currentUserService;

    public ReviewsController(
        IReviewService service,
        ICurrentUserService currentUserService)
    {
        _service = service;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    [Authorize(Roles = "Owner,Manager,Admin,SuperAdmin")]
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
        return Ok(await _service.GetByRestaurantIdAsync(restaurantId, cancellationToken));
    }

    [HttpGet("{id:int}")]
    public async Task<IActionResult> GetById(int id)
    {
        var review = await _service.GetByIdAsync(id);

        if (review == null)
            return NotFound();

        return Ok(review);
    }

    [HttpPost]
    [Authorize]
    public async Task<IActionResult> Create(CreateReviewDto dto)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        try
        {
            var review = await _service.CreateAsync(dto, user.Id, user.TenantId.Value);
            return CreatedAtAction(nameof(GetById), new { id = review.Id }, review);
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

    [HttpPut("{id:int}")]
    [Authorize]
    public async Task<IActionResult> Update(int id, UpdateReviewDto dto)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        var updated = await _service.UpdateAsync(id, dto, user.Id, user.TenantId.Value);

        if (!updated)
            return NotFound();

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize]
    public async Task<IActionResult> Delete(int id)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        // admins can delete any review; regular users can only delete their own
        var isAdmin = user.Role is Models.Enums.UserRole.Owner
            or Models.Enums.UserRole.Admin
            or Models.Enums.UserRole.SuperAdmin;

        var deleted = await _service.DeleteAsync(id, isAdmin ? null : user.Id, user.TenantId.Value);

        if (!deleted)
            return NotFound();

        return NoContent();
    }
}
