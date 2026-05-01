using srs.Server.Dtos.Suppliers;

namespace srs.Server.Services.Suppliers;

public interface ISupplierService
{
    Task<List<SupplierDto>> GetAllAsync(Guid tenantId);
    Task<SupplierDto?> GetByIdAsync(int id, Guid tenantId);
    Task<SupplierDto> CreateAsync(SupplierRequestDto dto, Guid tenantId);
    Task<bool> UpdateAsync(int id, SupplierRequestDto dto, Guid tenantId);
    Task<bool> DeleteAsync(int id, Guid tenantId);
}