using srs.Server.Dtos.Restaurants;

namespace srs.Server.Services.Restaurants;

public interface IRestaurantService
{
    Task<List<RestaurantDto>> GetAllAsync(Guid tenantId);
    Task<RestaurantDto?> GetByIdAsync(int id, Guid tenantId);
    Task<RestaurantDto> CreateAsync(RestaurantRequestDto dto, Guid tenantId);
    Task<bool> UpdateAsync(int id, RestaurantRequestDto dto, Guid tenantId);
    Task<bool> DeleteAsync(int id, Guid tenantId);
}