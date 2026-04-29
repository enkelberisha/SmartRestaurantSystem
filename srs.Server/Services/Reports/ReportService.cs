namespace srs.Server.Services.Reports
{
    using Microsoft.EntityFrameworkCore;
    using srs.Server.Data;
    using srs.Server.Models;
    using srs.Server.Dtos.Reports;

    public class ReportService : IReportService
    {
        private readonly AppDbContext _context;

        public ReportService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<ReportResponseDto>> GetAllAsync()
        {
            return await _context.Reports
                .Select(r => new ReportResponseDto
                {
                    Id = r.Id,
                    RestaurantId = r.RestaurantId,
                    Message = r.Message,
                    Type = r.Type,
                    CreatedAt = r.CreatedAt
                })
                .ToListAsync();
        }

        public async Task<ReportResponseDto> CreateAsync(CreateReportDto dto)
        {
            var entity = new Report
            {
                RestaurantId = dto.RestaurantId,
                Message = dto.Message,
                Type = dto.Type,
                CreatedAt = DateTime.UtcNow
            };

            _context.Reports.Add(entity);
            await _context.SaveChangesAsync();

            return new ReportResponseDto
            {
                Id = entity.Id,
                RestaurantId = entity.RestaurantId,
                Message = entity.Message,
                Type = entity.Type,
                CreatedAt = entity.CreatedAt
            };
        }
    }
}
