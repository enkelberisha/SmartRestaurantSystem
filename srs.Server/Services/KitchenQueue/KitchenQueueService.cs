namespace srs.Server.Services.KitchenQueue
{
    using Microsoft.EntityFrameworkCore;
    using srs.Server.Data;
    using srs.Server.Dtos.KitchenQueue;

    public class KitchenQueueService : IKitchenQueueService
    {
        private readonly AppDbContext _context;

        public KitchenQueueService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<List<KitchenQueueResponseDto>> GetAllAsync()
        {
            return await _context.KitchenQueues
                .Select(k => new KitchenQueueResponseDto
                {
                    Id = k.Id,
                    OrderId = k.OrderId,
                    UpdatedAt = k.UpdatedAt
                })
                .ToListAsync();
        }

        public async Task<KitchenQueueResponseDto?> GetByIdAsync(int id)
        {
            return await _context.KitchenQueues
                .Where(k => k.Id == id)
                .Select(k => new KitchenQueueResponseDto
                {
                    Id = k.Id,
                    OrderId = k.OrderId,
                    UpdatedAt = k.UpdatedAt
                })
                .FirstOrDefaultAsync();
        }

        public async Task<bool> UpdateAsync(int id, UpdateKitchenQueueDto dto)
        {
            var entity = await _context.KitchenQueues.FindAsync(id);
            if (entity == null) return false;

            entity.UpdatedAt = dto.UpdatedAt;

            await _context.SaveChangesAsync();
            return true;
        }
    }
}
