using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using srs.Server.Dtos.Tables;
using srs.Server.Services.Tables;

namespace srs.Server.Controllers.Tables
{
    [ApiController]
    [Route("api/tables")]
    [Authorize]
    public class TablesController : ControllerBase
    {
        private readonly ITableService _tableService;

        public TablesController(ITableService tableService)
        {
            _tableService = tableService;
        }

        [HttpPost]
        [Authorize(Roles = "Owner,Admin,Manager,SuperAdmin")]
        public async Task<IActionResult> Create(TableRequestDto dto, CancellationToken ct)
        {
            var result = await _tableService.CreateAsync(dto, ct);
            return Ok(result);
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var result = await _tableService.GetAllAsync();
            return Ok(result);
        }

        [HttpGet("{id:int}")]
        public async Task<IActionResult> GetById(int id)
        {
            var result = await _tableService.GetByIdAsync(id);

            if (result == null)
                return NotFound();

            return Ok(result);
        }

        [HttpPut("{id:int}")]
        [Authorize(Roles = "Owner,Admin,Manager,SuperAdmin")]
        public async Task<IActionResult> Update(int id, TableRequestDto dto, CancellationToken ct)
        {
            var result = await _tableService.UpdateAsync(id, dto, ct);

            if (result == null)
                return NotFound();

            return Ok(result);
        }
    }
}