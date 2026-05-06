using srs.Server.Dtos.Shifts;

namespace srs.Server.Services.Shifts;

public interface IShiftService
{
    Task<List<ShiftDto>> GetAllAsync(Guid tenantId, CancellationToken cancellationToken = default);
    Task<List<ShiftDto>> GetByStaffIdAsync(int staffId, Guid tenantId, CancellationToken cancellationToken = default);
    Task<List<ShiftDto>> GetByRestaurantIdAsync(int restaurantId, Guid tenantId, CancellationToken cancellationToken = default);
    Task<ShiftDto?> GetByIdAsync(int id, Guid tenantId);
    Task<ShiftDto> CreateAsync(CreateShiftDto dto, Guid tenantId);
    Task<bool> UpdateAsync(int id, UpdateShiftDto dto, Guid tenantId);
    Task<bool> DeleteAsync(int id, Guid tenantId);
}
