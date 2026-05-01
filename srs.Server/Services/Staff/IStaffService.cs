using srs.Server.Dtos.Staff;

namespace srs.Server.Services.Staff
{
    public interface IStaffService
    {
        Task<StaffResponseDto> CreateAsync(StaffRequestDto dto, CancellationToken ct);
        Task<List<StaffResponseDto>> GetAllAsync();
        Task<StaffResponseDto?> GetByIdAsync(int id);
        Task<bool> DeleteAsync(int id);
    }
}