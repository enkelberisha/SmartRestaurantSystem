using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using srs.Server.Dtos.MenuItems;
using srs.Server.Services.Auth;
using srs.Server.Services.Cloudinary;
using srs.Server.Services.MenuItems;

namespace srs.Server.Controllers;

[ApiController]
[Route("api/menu-items")]
[Authorize]
public class MenuItemsController : ControllerBase
{
    private readonly IMenuItemService _service;
    private readonly ICurrentUserService _currentUserService;
    private readonly ICloudinaryService _cloudinaryService;

    public MenuItemsController(
        IMenuItemService service,
        ICurrentUserService currentUserService,
        ICloudinaryService cloudinaryService)
    {
        _service = service;
        _currentUserService = currentUserService;
        _cloudinaryService = cloudinaryService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] MenuItemQueryDto query)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        return Ok(await _service.GetAllAsync(user.TenantId.Value, query));
    }

    [HttpGet("restaurant/{restaurantId:int}")]
    public async Task<IActionResult> GetByRestaurantId(
        int restaurantId,
        [FromQuery] MenuItemQueryDto query,
        CancellationToken cancellationToken)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        return Ok(await _service.GetByRestaurantIdAsync(
            restaurantId,
            user.TenantId.Value,
            query,
            cancellationToken));
    }

    [HttpGet("filters")]
    public async Task<IActionResult> GetFilters([FromQuery] int? restaurantId, CancellationToken cancellationToken)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        return Ok(await _service.GetFiltersAsync(user.TenantId.Value, restaurantId, cancellationToken));
    }

    [HttpPost("filters")]
    [Authorize(Roles = "Owner,Admin,SuperAdmin")]
    public async Task<IActionResult> CreateFilter(MenuItemFilterRequestDto dto, CancellationToken cancellationToken)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        var filter = await _service.CreateFilterAsync(dto, user.TenantId.Value, cancellationToken);

        return CreatedAtAction(nameof(GetFilters), new { id = filter.Id }, filter);
    }

    [HttpDelete("filters/{id:int}")]
    [Authorize(Roles = "Owner,Admin,SuperAdmin")]
    public async Task<IActionResult> DeleteFilter(int id, CancellationToken cancellationToken)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        var deleted = await _service.DeleteFilterAsync(id, user.TenantId.Value, cancellationToken);

        if (!deleted)
            return NotFound();

        return NoContent();
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        var item = await _service.GetByIdAsync(id, user.TenantId.Value);

        if (item == null)
            return NotFound();

        return Ok(item);
    }

    [HttpPost]
    [Authorize(Roles = "Owner,Admin,SuperAdmin")]
    public async Task<IActionResult> Create(MenuItemRequestDto dto)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        var item = await _service.CreateAsync(dto, user.TenantId.Value);

        return CreatedAtAction(nameof(GetById), new { id = item.Id }, item);
    }

    [HttpPost("upload-image")]
    [Authorize(Roles = "Owner,Admin,SuperAdmin")]
    [RequestFormLimits(MultipartBodyLengthLimit = 10_000_000)]
    public async Task<IActionResult> UploadImage(IFormFile? file, CancellationToken cancellationToken)
    {
        if (file == null || file.Length == 0)
            return BadRequest("Please choose an image to upload.");

        if (!file.ContentType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            return BadRequest("Only image files are allowed.");

        try
        {
            await using var stream = file.OpenReadStream();
            var uploadedImage = await _cloudinaryService.UploadImageAsync(
                stream,
                file.FileName,
                file.ContentType,
                cancellationToken);

            return Ok(new MenuItemImageUploadDto
            {
                ImageUrl = uploadedImage.SecureUrl,
                ImagePublicId = uploadedImage.PublicId
            });
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Owner,Admin,SuperAdmin")]
    public async Task<IActionResult> Update(int id, MenuItemRequestDto dto, CancellationToken cancellationToken)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        var updated = await _service.UpdateAsync(id, dto, user.TenantId.Value, cancellationToken);

        if (!updated)
            return NotFound();

        return NoContent();
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Owner,Admin,SuperAdmin")]
    public async Task<IActionResult> Delete(int id, CancellationToken cancellationToken)
    {
        var user = _currentUserService.GetCurrentUser(User);

        if (user.TenantId == null)
            return BadRequest("No tenant");

        var deleted = await _service.DeleteAsync(id, user.TenantId.Value, cancellationToken);

        if (!deleted)
            return NotFound();

        return NoContent();
    }
}
