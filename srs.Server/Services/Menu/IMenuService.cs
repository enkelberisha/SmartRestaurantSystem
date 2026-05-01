using srs.Server.Dtos.Menu;

namespace srs.Server.Services.Menu;

public interface IMenuService
{
    Task<List<MenuDto>> GetAllAsync(Guid tenantId);
    Task<MenuDto?> GetByIdAsync(int id, Guid tenantId);
    Task<MenuDto> CreateAsync(MenuRequestDto dto, Guid tenantId);
    Task<bool> UpdateAsync(int id, MenuRequestDto dto, Guid tenantId);
    Task<bool> DeleteAsync(int id, Guid tenantId);
}