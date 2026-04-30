using srs.Server.Dtos.Tables;

namespace srs.Server.Services.Tables
{
    public interface ITableService
    {
        Task<TableResponseDto> CreateAsync(TableRequestDto dto, CancellationToken ct);
        Task<List<TableResponseDto>> GetAllAsync();
        Task<TableResponseDto?> GetByIdAsync(int id);
        Task<TableResponseDto?> UpdateAsync(int id, TableRequestDto dto, CancellationToken ct);
    }
}
