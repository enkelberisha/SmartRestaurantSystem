using srs.Server.Dtos.Tenants;

namespace srs.Server.Services.Tenants;

namespace srs.Server.Services.Tenants
{
public interface ITenantService
{
    Task<IReadOnlyList<TenantDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<TenantDto?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<TenantMemberDto>> GetMembersAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task<TenantDto> CreateAsync(TenantRequestDto dto, CancellationToken cancellationToken = default);
    Task<TenantDto?> UpdateAsync(Guid id, TenantRequestDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(Guid id, CancellationToken cancellationToken = default);
        Task<TenantResponseDto> CreateAsync(CreateTenantDto dto);
        Task<List<TenantResponseDto>> GetAllAsync();
        Task<TenantResponseDto?> GetByIdAsync(Guid id);
        Task<bool> UpdateAsync(Guid id, UpdateTenantDto dto);
    }
}
