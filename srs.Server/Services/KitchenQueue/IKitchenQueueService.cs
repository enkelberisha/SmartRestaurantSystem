using srs.Server.Dtos.KitchenQueue;

namespace srs.Server.Services.KitchenQueue
{
    public interface IKitchenQueueService
    {
        Task<List<KitchenQueueResponseDto>> GetAllAsync();
        Task<KitchenQueueResponseDto?> GetByIdAsync(int id);
        Task<bool> UpdateAsync(int id, UpdateKitchenQueueDto dto);
    }
}
