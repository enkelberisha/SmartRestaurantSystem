using srs.Server.Dtos.OrderItems;

namespace srs.Server.Services.OrderItems;

public interface IOrderItemService
{
    Task<List<OrderItemDto>> GetAllAsync(Guid tenantId);
    Task<List<OrderItemDto>> GetByRestaurantIdAsync(int restaurantId, Guid tenantId, CancellationToken cancellationToken = default);
    Task<OrderItemDto?> GetByIdAsync(int id, Guid tenantId);
    Task<OrderItemDto> CreateAsync(OrderItemRequestDto dto, Guid tenantId);
    Task<bool> UpdateAsync(int id, OrderItemRequestDto dto, Guid tenantId);
    Task<bool> DeleteAsync(int id, Guid tenantId);
}
