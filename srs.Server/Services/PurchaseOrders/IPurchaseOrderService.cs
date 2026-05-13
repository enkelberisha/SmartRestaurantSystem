using srs.Server.Dtos.PurchaseOrders;

using srs.Server.Services.Auth;

namespace srs.Server.Services.PurchaseOrders;

public interface IPurchaseOrderService
{
    Task<List<PurchaseOrderDto>> GetAllAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task<List<PurchaseOrderDto>> GetByRestaurantIdAsync(int restaurantId, Guid tenantId, CancellationToken cancellationToken = default);
    Task<List<PurchaseOrderDto>> GetBySupplierIdAsync(int supplierId, Guid tenantId, CancellationToken cancellationToken = default);
    Task<PurchaseOrderDto?> GetByIdAsync(int id, Guid tenantId);
    Task<PurchaseOrderDto> CreateAsync(CreatePurchaseOrderDto dto, Guid tenantId, CurrentUserContext currentUser);
    Task<bool> UpdateAsync(int id, UpdatePurchaseOrderDto dto, Guid tenantId);
    Task<bool> DeleteAsync(int id, Guid tenantId);
}
