using srs.Server.Dtos.MenuItems;

namespace srs.Server.Services.MenuItems;

public interface IMenuItemService
{
    Task<List<MenuItemDto>> GetAllAsync(Guid tenantId, MenuItemQueryDto? query = null);
    Task<List<MenuItemDto>> GetByRestaurantIdAsync(int restaurantId, Guid tenantId, MenuItemQueryDto? query = null, CancellationToken cancellationToken = default);
    Task<List<MenuItemFilterDto>> GetFiltersAsync(Guid tenantId, int? restaurantId = null, CancellationToken cancellationToken = default);
    Task<MenuItemFilterDto> CreateFilterAsync(MenuItemFilterRequestDto dto, Guid tenantId, CancellationToken cancellationToken = default);
    Task<bool> DeleteFilterAsync(int id, Guid tenantId, CancellationToken cancellationToken = default);
    Task<MenuItemDto?> GetByIdAsync(int id, Guid tenantId);
    Task<MenuItemDto> CreateAsync(MenuItemRequestDto dto, Guid tenantId);
    Task<bool> UpdateAsync(int id, MenuItemRequestDto dto, Guid tenantId);
    Task<bool> DeleteAsync(int id, Guid tenantId);
}

