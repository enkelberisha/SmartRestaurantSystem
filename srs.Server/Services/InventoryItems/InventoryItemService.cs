namespace srs.Server.Services.InventoryItems
{
    using Microsoft.EntityFrameworkCore;
    using srs.Server.Data;
    using srs.Server.Dtos.Inventory;
    using srs.Server.Dtos.InventoryItems;
    using srs.Server.Models;

    public class InventoryItemService : IInventoryItemService
    {
        private readonly AppDbContext _context;

        public InventoryItemService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<InventoryItemResponseDto> CreateAsync(CreateInventoryItemDto dto)
        {
            var entity = new InventoryItem
            {
                InventoryId = dto.InventoryId,
                ItemName = dto.ItemName,
                Quantity = dto.Quantity,
                UnitPrice = dto.UnitPrice,
                SupplierId = dto.SupplierId,
                CreatedAt = DateTime.UtcNow
            };

            _context.InventoryItems.Add(entity);
            await _context.SaveChangesAsync();

            return Map(entity);
        }

        public async Task<List<InventoryItemResponseDto>> GetAllAsync()
        {
            return await _context.InventoryItems
                .Select(i => new InventoryItemResponseDto
                {
                    Id = i.Id,
                    InventoryId = i.InventoryId,
                    ItemName = i.ItemName,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    SupplierId = i.SupplierId,
                    CreatedAt = i.CreatedAt
                })
                .ToListAsync();
        }

        public async Task<InventoryItemResponseDto?> GetByIdAsync(int id)
        {
            return await _context.InventoryItems
                .Where(i => i.Id == id)
                .Select(i => new InventoryItemResponseDto
                {
                    Id = i.Id,
                    InventoryId = i.InventoryId,
                    ItemName = i.ItemName,
                    Quantity = i.Quantity,
                    UnitPrice = i.UnitPrice,
                    SupplierId = i.SupplierId,
                    CreatedAt = i.CreatedAt
                })
                .FirstOrDefaultAsync();
        }

        public async Task<bool> UpdateAsync(int id, UpdateInventoryItemDto dto)
        {
            var entity = await _context.InventoryItems.FindAsync(id);
            if (entity == null) return false;

            entity.ItemName = dto.ItemName;
            entity.Quantity = dto.Quantity;
            entity.UnitPrice = dto.UnitPrice;
            entity.SupplierId = dto.SupplierId;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DeleteAsync(int id)
        {
            var entity = await _context.InventoryItems.FindAsync(id);
            if (entity == null) return false;

            _context.InventoryItems.Remove(entity);
            await _context.SaveChangesAsync();
            return true;
        }

        private static InventoryItemResponseDto Map(InventoryItem i) => new()
        {
            Id = i.Id,
            InventoryId = i.InventoryId,
            ItemName = i.ItemName,
            Quantity = i.Quantity,
            UnitPrice = i.UnitPrice,
            SupplierId = i.SupplierId,
            CreatedAt = i.CreatedAt
        };
    }
}
