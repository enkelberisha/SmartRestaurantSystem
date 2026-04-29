using Microsoft.AspNetCore.Mvc;
using srs.Server.Dtos.Inventory;
using srs.Server.Services.Inventory;

namespace srs.Server.Controllers.Inventory
{
    [ApiController]
    [Route("api/inventory")]
    public class InventoryController : ControllerBase
    {
        private readonly IInventoryService _service;

        public InventoryController(IInventoryService service)
        {
            _service = service;
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateInventoryDto dto)
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
        public async Task<IActionResult> GetById(int id)
        {
            var inventory = await _service.GetByIdAsync(id);
            if (inventory == null) return NotFound();

            return Ok(inventory);
        }
    }
}
