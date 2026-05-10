using srs.Server.Services.Auth;
using srs.Server.Dtos.Orders;

namespace srs.Server.Services.Orders;

public interface IOrderService
{
    Task<List<OrderDto>> GetAllAsync(Guid tenantId);
    Task<List<OrderDto>> GetByRestaurantIdAsync(int restaurantId, Guid tenantId, CancellationToken cancellationToken = default);
    Task<OrderDto?> GetByIdAsync(int id, Guid tenantId);
    Task<OrderDto> CreateAsync(CreateOrderDto dto, CurrentUserContext currentUser, CancellationToken cancellationToken = default);
    Task<bool> UpdateStatusAsync(int id, UpdateOrderStatusDto dto, Guid tenantId);
    Task<bool> DeleteAsync(int id, Guid tenantId);
}

