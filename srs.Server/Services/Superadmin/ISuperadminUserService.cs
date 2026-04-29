using srs.Server.Dtos.Superadmin;

namespace srs.Server.Services.Superadmin;

public interface ISuperadminUserService
{
    Task<IReadOnlyList<SuperadminUserDto>> GetAllAsync(CancellationToken cancellationToken = default);
    Task<SuperadminUserDto> CreateAsync(CreateSuperadminUserRequestDto dto, CancellationToken cancellationToken = default);
    Task<SuperadminUserDto?> UpdateRoleAsync(int userId, UpdateSuperadminUserRoleRequestDto dto, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(int userId, CancellationToken cancellationToken = default);
}
