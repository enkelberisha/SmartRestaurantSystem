using srs.Server.Dtos.Tenants;

namespace srs.Server.Services.Tenants
{
    public interface ITenantService
    {
        Task<TenantResponseDto> CreateAsync(CreateTenantDto dto);
        Task<List<TenantResponseDto>> GetAllAsync();
        Task<TenantResponseDto?> GetByIdAsync(Guid id);
        Task<bool> UpdateAsync(Guid id, UpdateTenantDto dto);
    }
}
