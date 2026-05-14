using srs.Server.Dtos.Tables;

namespace srs.Server.Services.Tables
{
    public interface ITableService
    {
        Task<TableResponseDto> CreateAsync(TableRequestDto dto, Guid tenantId, CancellationToken ct);
        Task<List<TableResponseDto>> GetAllAsync(Guid tenantId);
        Task<List<TableResponseDto>> GetByRestaurantIdAsync(int restaurantId, Guid tenantId, CancellationToken ct);
        Task<TableResponseDto?> GetByIdAsync(int id, Guid tenantId);
        Task<TableResponseDto?> UpdateAsync(int id, TableRequestDto dto, Guid tenantId, CancellationToken ct);
        Task<TableResponseDto?> UpdateServiceRequestAsync(int id, TableServiceRequestDto dto, Guid tenantId, CancellationToken ct);
        Task<bool> DeleteAsync(int id, Guid tenantId, CancellationToken ct);
    }
}

