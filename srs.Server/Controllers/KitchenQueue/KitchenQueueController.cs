using Microsoft.AspNetCore.Mvc;
using srs.Server.Dtos.KitchenQueue;
using srs.Server.Services.KitchenQueue;

namespace srs.Server.Controllers.KitchenQueue
{
    [ApiController]
    [Route("api/kitchen-queue")]
    public class KitchenQueueController : ControllerBase
    {
        private readonly IKitchenQueueService _service;

        public KitchenQueueController(IKitchenQueueService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _service.GetAllAsync());
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var item = await _service.GetByIdAsync(id);
            if (item == null) return NotFound();

            return Ok(item);
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, UpdateKitchenQueueDto dto)
        {
            var updated = await _service.UpdateAsync(id, dto);
            if (!updated) return NotFound();

            return NoContent();
        }
    }
}
