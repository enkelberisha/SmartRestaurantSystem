using Microsoft.AspNetCore.Mvc;
using srs.Server.Dtos.Reports;
using srs.Server.Services.Reports;

namespace srs.Server.Controllers.Reports
{
    [ApiController]
    [Route("api/reports")]
    public class ReportsController : ControllerBase
    {
        private readonly IReportService _service;

        public ReportsController(IReportService service)
        {
            _service = service;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            return Ok(await _service.GetAllAsync());
        }

        [HttpPost]
        public async Task<IActionResult> Create(CreateReportDto dto)
        {
            var result = await _service.CreateAsync(dto);
            return Ok(result);
        }
    }
}
