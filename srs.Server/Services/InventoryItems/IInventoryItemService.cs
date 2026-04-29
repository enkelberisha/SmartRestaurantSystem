using srs.Server.Dtos.InventoryItems;

namespace srs.Server.Services.InventoryItems
{
    public interface IInventoryItemService
    {
        Task<InventoryItemResponseDto> CreateAsync(CreateInventoryItemDto dto);
        Task<List<InventoryItemResponseDto>> GetAllAsync();
        Task<InventoryItemResponseDto?> GetByIdAsync(int id);
        Task<bool> UpdateAsync(int id, UpdateInventoryItemDto dto);
        Task<bool> DeleteAsync(int id);
    }
}
