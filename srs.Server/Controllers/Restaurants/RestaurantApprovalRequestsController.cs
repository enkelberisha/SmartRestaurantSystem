using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using srs.Server.Dtos.Restaurants;
using srs.Server.Services.Auth;
using srs.Server.Services.Restaurants;

namespace srs.Server.Controllers.Restaurants;

[ApiController]
[Route("api/restaurant-approval-requests")]
[Authorize]
public class RestaurantApprovalRequestsController(
    IRestaurantApprovalRequestService approvalRequestService,
    ICurrentUserService currentUserService) : ControllerBase
{
    [HttpPost("create")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> SubmitCreate(CreateRestaurantApprovalRequestDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            var request = await approvalRequestService.SubmitCreateAsync(dto, currentUser, cancellationToken);
            return Ok(request);
        }
        catch (Exception exception) when (exception is ArgumentException or InvalidOperationException)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpPost("delete")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> SubmitDelete(DeleteRestaurantApprovalRequestDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            var request = await approvalRequestService.SubmitDeleteAsync(dto, currentUser, cancellationToken);
            return Ok(request);
        }
        catch (Exception exception) when (exception is ArgumentException or InvalidOperationException)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpGet]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> GetAll(CancellationToken cancellationToken)
    {
        var requests = await approvalRequestService.GetAllAsync(cancellationToken);
        return Ok(requests);
    }

    [HttpGet("mine")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetMine(CancellationToken cancellationToken)
    {
        var currentUser = await GetCurrentUserAsync(cancellationToken);
        var requests = await approvalRequestService.GetMineAsync(currentUser, cancellationToken);
        return Ok(requests);
    }

    [HttpPut("{id:int}/create")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateCreate(int id, CreateRestaurantApprovalRequestDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            var request = await approvalRequestService.UpdateCreateAsync(id, dto, currentUser, cancellationToken);
            return request is null ? NotFound() : Ok(request);
        }
        catch (Exception exception) when (exception is ArgumentException or InvalidOperationException)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpPost("{id:int}/resubmit")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Resubmit(int id, CancellationToken cancellationToken)
    {
        try
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            var request = await approvalRequestService.ResubmitAsync(id, currentUser, cancellationToken);
            return request is null ? NotFound() : Ok(request);
        }
        catch (Exception exception) when (exception is ArgumentException or InvalidOperationException)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpPost("{id:int}/approve")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Approve(int id, CancellationToken cancellationToken)
    {
        try
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            var request = await approvalRequestService.ApproveAsync(id, currentUser, cancellationToken);
            return request is null ? NotFound() : Ok(request);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpPost("{id:int}/reject")]
    [Authorize(Roles = "SuperAdmin")]
    public async Task<IActionResult> Reject(int id, RejectRestaurantApprovalRequestDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var currentUser = await GetCurrentUserAsync(cancellationToken);
            var request = await approvalRequestService.RejectAsync(id, dto.Reason, currentUser, cancellationToken);
            return request is null ? NotFound() : Ok(request);
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
