using srs.Server.Dtos.Inventory;

namespace srs.Server.Services.Inventory
{
    public interface IInventoryService
    {
        Task<InventoryResponseDto> CreateAsync(CreateInventoryDto dto);
        Task<List<InventoryResponseDto>> GetAllAsync();
        Task<InventoryResponseDto?> GetByIdAsync(int id);
    }
}
