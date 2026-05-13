using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using srs.Server.Dtos.Tables;
using srs.Server.Services.Auth;
using srs.Server.Services.Tables;

namespace srs.Server.Controllers.Tables
{
    [ApiController]
    [Route("api/tables")]
    [Authorize]
    public class TablesController : ControllerBase
    {
        private readonly ITableService _tableService;
        private readonly ICurrentUserService _currentUserService;

        public TablesController(ITableService tableService, ICurrentUserService currentUserService)
        {
            _tableService = tableService;
            _currentUserService = currentUserService;
        }

        [HttpPost]
        [Authorize(Roles = "Owner,Admin,Manager,SuperAdmin")]
        public async Task<IActionResult> Create(TableRequestDto dto, CancellationToken ct)
        {
            try
            {
                var user = GetCurrentUser();
                if (user.TenantId == null)
                    return BadRequest("User has no tenant");

                var result = await _tableService.CreateAsync(dto, user.TenantId.Value, ct);
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

            var result = await _tableService.GetAllAsync(user.TenantId.Value);
            return Ok(result);
        }

        [HttpGet("restaurant/{restaurantId:int}")]
        public async Task<IActionResult> GetByRestaurantId(int restaurantId, CancellationToken ct)
        {
            var user = GetCurrentUser();
            if (user.TenantId == null)
                return BadRequest("User has no tenant");

            var result = await _tableService.GetByRestaurantIdAsync(restaurantId, user.TenantId.Value, ct);
            return Ok(result);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var user = GetCurrentUser();
            if (user.TenantId == null)
                return BadRequest("User has no tenant");

            var result = await _tableService.GetByIdAsync(id, user.TenantId.Value);

            if (result == null)
                return NotFound();

            return Ok(result);
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Owner,Admin,Manager,SuperAdmin")]
        public async Task<IActionResult> Update(int id, TableRequestDto dto, CancellationToken ct)
        {
            try
            {
                var user = GetCurrentUser();
                if (user.TenantId == null)
                    return BadRequest("User has no tenant");

                var result = await _tableService.UpdateAsync(id, dto, user.TenantId.Value, ct);

                if (result == null)
                    return NotFound();

                return Ok(result);
            }
            catch (Exception exception)
            {
                return BadRequest(new { message = exception.Message });
            }
        }

        [HttpPatch("{id:int}/service-request")]
        public async Task<IActionResult> UpdateServiceRequest(int id, TableServiceRequestDto dto, CancellationToken ct)
        {
            var user = GetCurrentUser();
            if (user.TenantId == null)
                return BadRequest("User has no tenant");

            var result = await _tableService.UpdateServiceRequestAsync(id, dto, user.TenantId.Value, ct);

            if (result == null)
                return NotFound();

            return Ok(result);
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Owner,Admin,Manager,SuperAdmin")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            var user = GetCurrentUser();
            if (user.TenantId == null)
                return BadRequest("User has no tenant");

            var deleted = await _tableService.DeleteAsync(id, user.TenantId.Value, ct);

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
