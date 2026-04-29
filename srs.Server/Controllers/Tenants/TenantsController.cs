using Microsoft.AspNetCore.Mvc;
using srs.Server.Dtos.Tenants;
using srs.Server.Services.Tenants;

namespace srs.Server.Controllers.Tenants
{
    [ApiController]
    [Route("api/tenants")]
    public class TenantsController : ControllerBase
    {
        private readonly ITenantService _service;

        public TenantsController(ITenantService service)
        {
            _service = service;
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateTenantDto dto)
        {
            var result = await _service.CreateAsync(dto);
            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _service.GetAllAsync());
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var tenant = await _service.GetByIdAsync(id);
            if (tenant == null) return NotFound();

            return Ok(tenant);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(Guid id, UpdateTenantDto dto)
        {
            var updated = await _service.UpdateAsync(id, dto);
            if (!updated) return NotFound();

            return NoContent();
        }
    }
}
