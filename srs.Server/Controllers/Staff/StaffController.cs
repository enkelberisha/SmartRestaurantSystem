using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using srs.Server.Dtos.Staff;
using srs.Server.Services.Staff;

namespace srs.Server.Controllers.Staff
{
    [ApiController]
    [Route("api/staff")]
    [Authorize]
    public class StaffController : ControllerBase
    {
        private readonly IStaffService _staffService;

        public StaffController(IStaffService staffService)
        {
            _staffService = staffService;
        }

        [HttpPost]
        [Authorize(Roles = "Owner,Admin,Manager,SuperAdmin")]
        public async Task<IActionResult> Create(StaffRequestDto dto, CancellationToken ct)
        {
            var result = await _staffService.CreateAsync(dto, ct);
            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _staffService.GetAllAsync();
            return Ok(result);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _staffService.GetByIdAsync(id);

            if (result == null)
                return NotFound();

            return Ok(result);
        }

        [HttpDelete("{id:int}")]
        [Authorize(Roles = "Owner,Admin,Manager,SuperAdmin")]
        public async Task<IActionResult> Delete(int id)
        {
            var deleted = await _staffService.DeleteAsync(id);

            if (!deleted)
                return NotFound();

            return NoContent();
        }
    }
}