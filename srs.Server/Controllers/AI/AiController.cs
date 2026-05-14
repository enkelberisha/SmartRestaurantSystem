using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using srs.Server.Dtos.AI;
using srs.Server.Services.AI;
using srs.Server.Services.Auth;

namespace srs.Server.Controllers;

[ApiController]
[Route("api/ai")]
[Authorize]
public class AiController : ControllerBase
{
    private readonly IAiInsightsService _aiInsightsService;
    private readonly IAiManagerInsightsJobService _aiManagerInsightsJobService;
    private readonly IAiOwnerInsightsJobService _aiOwnerInsightsJobService;
    private readonly ICurrentUserService _currentUserService;

    public AiController(
        IAiInsightsService aiInsightsService,
        IAiManagerInsightsJobService aiManagerInsightsJobService,
        IAiOwnerInsightsJobService aiOwnerInsightsJobService,
        ICurrentUserService currentUserService)
    {
        _aiInsightsService = aiInsightsService;
        _aiManagerInsightsJobService = aiManagerInsightsJobService;
        _aiOwnerInsightsJobService = aiOwnerInsightsJobService;
        _currentUserService = currentUserService;
    }

    [Authorize(Roles = "Manager")]
    [HttpPost("manager-insights")]
    public async Task<IActionResult> GenerateManagerInsights(
        AiManagerInsightsRequestDto request,
        CancellationToken cancellationToken)
    {
        if (request.RestaurantId <= 0)
        {
            return BadRequest("Restaurant is required.");
        }

        var user = _currentUserService.GetCurrentUser(User);
        try
        {
            var insights = await _aiInsightsService.GenerateManagerInsightsAsync(request, user, cancellationToken);
            return Ok(insights);
        }
        catch (UnauthorizedAccessException accessError)
        {
            return StatusCode(StatusCodes.Status403Forbidden, accessError.Message);
        }
        catch (InvalidOperationException operationError)
        {
            return BadRequest(operationError.Message);
        }
    }

    [Authorize(Roles = "Manager")]
    [HttpPost("manager-insights/jobs")]
    public IActionResult StartManagerInsightsJob(AiManagerInsightsRequestDto request)
    {
        if (request.RestaurantId <= 0)
        {
            return BadRequest("Restaurant is required.");
        }

        var user = _currentUserService.GetCurrentUser(User);
        var job = _aiManagerInsightsJobService.StartManagerInsightsJob(request, user);
        return Accepted(job);
    }

    [Authorize(Roles = "Manager")]
    [HttpGet("manager-insights/jobs/{jobId:guid}")]
    public IActionResult GetManagerInsightsJob(Guid jobId)
    {
        var user = _currentUserService.GetCurrentUser(User);
        var job = _aiManagerInsightsJobService.GetManagerInsightsJob(jobId, user);

        return job is null ? NotFound("AI insights job was not found.") : Ok(job);
    }

    [Authorize(Roles = "Manager")]
    [HttpGet("manager-insights/latest")]
    public IActionResult GetLatestManagerInsightsJob([FromQuery] int restaurantId)
    {
        if (restaurantId <= 0)
        {
            return BadRequest("Restaurant is required.");
        }

        var user = _currentUserService.GetCurrentUser(User);
        var job = _aiManagerInsightsJobService.GetLatestManagerInsightsJob(
            new AiManagerInsightsRequestDto { RestaurantId = restaurantId },
            user);

        return job is null ? NoContent() : Ok(job);
    }

    [Authorize(Roles = "Owner,Admin,SuperAdmin")]
    [HttpPost("owner-insights")]
    public async Task<IActionResult> GenerateOwnerInsights(
        AiOwnerInsightsRequestDto request,
        CancellationToken cancellationToken)
    {
        var user = _currentUserService.GetCurrentUser(User);
        try
        {
            var insights = await _aiInsightsService.GenerateOwnerInsightsAsync(request, user, cancellationToken);
            return Ok(insights);
        }
        catch (UnauthorizedAccessException accessError)
        {
            return StatusCode(StatusCodes.Status403Forbidden, accessError.Message);
        }
        catch (InvalidOperationException operationError)
        {
            return BadRequest(operationError.Message);
        }
    }

    [Authorize(Roles = "Owner,Admin,SuperAdmin")]
    [HttpPost("owner-insights/jobs")]
    public IActionResult StartOwnerInsightsJob(AiOwnerInsightsRequestDto request)
    {
        var user = _currentUserService.GetCurrentUser(User);
        var job = _aiOwnerInsightsJobService.StartOwnerInsightsJob(request, user);
        return Accepted(job);
    }

    [Authorize(Roles = "Owner,Admin,SuperAdmin")]
    [HttpGet("owner-insights/jobs/{jobId:guid}")]
    public IActionResult GetOwnerInsightsJob(Guid jobId)
    {
        var user = _currentUserService.GetCurrentUser(User);
        var job = _aiOwnerInsightsJobService.GetOwnerInsightsJob(jobId, user);

        return job is null ? NotFound("AI insights job was not found.") : Ok(job);
    }

    [Authorize(Roles = "Owner,Admin,SuperAdmin")]
    [HttpGet("owner-insights/latest")]
    public IActionResult GetLatestOwnerInsightsJob([FromQuery] int? restaurantId)
    {
        var user = _currentUserService.GetCurrentUser(User);
        var job = _aiOwnerInsightsJobService.GetLatestOwnerInsightsJob(
            new AiOwnerInsightsRequestDto { RestaurantId = restaurantId },
            user);

        return job is null ? NoContent() : Ok(job);
    }
}
