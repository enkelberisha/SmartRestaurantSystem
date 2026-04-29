namespace srs.Server.Services.Inventory
{
    using Microsoft.EntityFrameworkCore;
    using srs.Server.Data;
    using srs.Server.Models;
    using srs.Server.Dtos.Inventory;

    public class InventoryService : IInventoryService
    {
        private readonly AppDbContext _context;

        public InventoryService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<InventoryResponseDto> CreateAsync(CreateInventoryDto dto)
        {
            var entity = new Inventory
            {
                RestaurantId = dto.RestaurantId,
                CreatedAt = DateTime.UtcNow
            };

            _context.Inventories.Add(entity);
            await _context.SaveChangesAsync();

            return new InventoryResponseDto
            {
                Id = entity.Id,
                RestaurantId = entity.RestaurantId,
                CreatedAt = entity.CreatedAt
            };
        }

        public async Task<List<InventoryResponseDto>> GetAllAsync()
        {
            return await _context.Inventories
                .Select(i => new InventoryResponseDto
                {
                    Id = i.Id,
                    RestaurantId = i.RestaurantId,
                    CreatedAt = i.CreatedAt
                })
                .ToListAsync();
        }

        public async Task<InventoryResponseDto?> GetByIdAsync(int id)
        {
            return await _context.Inventories
                .Where(i => i.Id == id)
                .Select(i => new InventoryResponseDto
                {
                    Id = i.Id,
                    RestaurantId = i.RestaurantId,
                    CreatedAt = i.CreatedAt
                })
                .FirstOrDefaultAsync();
        }
    }
}
