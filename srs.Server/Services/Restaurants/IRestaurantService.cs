using srs.Server.Dtos.Restaurants;
using srs.Server.Services;

namespace srs.Server.Services.Restaurants;

public interface IRestaurantService
{
    Task<RestaurantDto?> GetCurrentAsync(CurrentUserContext currentUser, CancellationToken cancellationToken = default);
    Task<List<RestaurantDto>> GetAllAsync(Guid tenantId);
    Task<RestaurantDto?> GetByIdAsync(int id, Guid tenantId);
    Task<RestaurantDto> CreateAsync(RestaurantRequestDto dto, CurrentUserContext currentUser, CancellationToken cancellationToken = default);
    Task<RestaurantDto?> UpdateAsync(int id, RestaurantRequestDto dto, Guid tenantId);
    Task<bool> DeleteAsync(int id, Guid tenantId);
}
