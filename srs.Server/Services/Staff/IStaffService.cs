using srs.Server.Dtos.Staff;

namespace srs.Server.Services.Staff
{
    public interface IStaffService
    {
        Task<StaffResponseDto> CreateAsync(StaffRequestDto dto, Guid tenantId, CancellationToken ct);
        Task<List<StaffResponseDto>> GetAllAsync(Guid tenantId);
        Task<List<StaffResponseDto>> GetByRestaurantIdAsync(int restaurantId, Guid tenantId, CancellationToken ct);
        Task<StaffResponseDto?> GetByIdAsync(int id, Guid tenantId);
        Task<StaffResponseDto?> UpdateAsync(int id, StaffRequestDto dto, Guid tenantId, CancellationToken ct);
        Task<bool> DeleteAsync(int id, Guid tenantId, CancellationToken ct);
    }
}

