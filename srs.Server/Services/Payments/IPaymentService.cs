using srs.Server.Dtos.Payments;

namespace srs.Server.Services.Payments;

public interface IPaymentService
{
    Task<List<PaymentDto>> GetAllAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task<List<PaymentDto>> GetByOrderIdAsync(int orderId, Guid tenantId, CancellationToken cancellationToken = default);
    Task<PaymentDto?> GetByIdAsync(int id, Guid tenantId);
    Task<PaymentDto> CreateAsync(CreatePaymentDto dto, Guid tenantId);
    Task<bool> UpdateStatusAsync(int id, UpdatePaymentStatusDto dto, Guid tenantId);
    Task<bool> DeleteAsync(int id, Guid tenantId);
}
