using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using srs.Server.Dtos.Staff;
using srs.Server.Services.Auth;
using srs.Server.Services.Staff;

namespace srs.Server.Controllers.Staff
{
    [ApiController]
    [Route("api/staff")]
    [Authorize]
    public class StaffController : ControllerBase
    {
        private readonly IStaffService _staffService;
        private readonly ICurrentUserService _currentUserService;

        public StaffController(IStaffService staffService, ICurrentUserService currentUserService)
        {
            _staffService = staffService;
            _currentUserService = currentUserService;
        }

        [HttpPost]
        [Authorize(Roles = "Owner,Admin,Manager,SuperAdmin")]
        public async Task<IActionResult> Create(StaffRequestDto dto, CancellationToken ct)
        {
            try
            {
                var user = GetCurrentUser();
                if (user.TenantId == null)
                    return BadRequest("User has no tenant");

                var result = await _staffService.CreateAsync(dto, user.TenantId.Value, ct);
                return Ok(result);
            }
            catch (Exception exception)
            {
                return BadRequest(new { message = exception.Message });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var user = GetCurrentUser();
            if (user.TenantId == null)
                return BadRequest("User has no tenant");

            var result = await _staffService.GetAllAsync(user.TenantId.Value);
            return Ok(result);
        }

        [HttpGet("restaurant/{restaurantId:int}")]
        public async Task<IActionResult> GetByRestaurantId(int restaurantId, CancellationToken ct)
        {
            var user = GetCurrentUser();
            if (user.TenantId == null)
                return BadRequest("User has no tenant");

            var result = await _staffService.GetByRestaurantIdAsync(restaurantId, user.TenantId.Value, ct);
            return Ok(result);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var user = GetCurrentUser();
            if (user.TenantId == null)
                return BadRequest("User has no tenant");

            var result = await _staffService.GetByIdAsync(id, user.TenantId.Value);

            if (result == null)
                return NotFound();

            return Ok(result);
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Owner,Admin,Manager,SuperAdmin")]
        public async Task<IActionResult> Update(int id, StaffRequestDto dto, CancellationToken ct)
        {
            try
            {
                var user = GetCurrentUser();
                if (user.TenantId == null)
                    return BadRequest("User has no tenant");

                var result = await _staffService.UpdateAsync(id, dto, user.TenantId.Value, ct);

                if (result == null)
                    return NotFound();

                return Ok(result);
            }
            catch (Exception exception)
            {
                return BadRequest(new { message = exception.Message });
            }
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Owner,Admin,Manager,SuperAdmin")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            var user = GetCurrentUser();
            if (user.TenantId == null)
                return BadRequest("User has no tenant");

            var deleted = await _staffService.DeleteAsync(id, user.TenantId.Value, ct);

            if (!deleted)
                return NotFound();

            return NoContent();
        }

        private CurrentUserContext GetCurrentUser()
        {
            return _currentUserService.GetCurrentUser(User);
        }
    }
}
