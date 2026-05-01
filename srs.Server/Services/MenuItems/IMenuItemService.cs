using srs.Server.Dtos.MenuItems;

namespace srs.Server.Services.MenuItems;

public interface IMenuItemService
{
    Task<List<MenuItemDto>> GetAllAsync(Guid tenantId);
    Task<MenuItemDto?> GetByIdAsync(int id, Guid tenantId);
    Task<MenuItemDto> CreateAsync(MenuItemRequestDto dto, Guid tenantId);
    Task<bool> UpdateAsync(int id, MenuItemRequestDto dto, Guid tenantId);
    Task<bool> DeleteAsync(int id, Guid tenantId);
}