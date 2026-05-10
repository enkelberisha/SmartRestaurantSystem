using srs.Server.Dtos.Users;
using srs.Server.Services.Auth;

namespace srs.Server.Services.Users;

public interface IUserService
{
    Task<IReadOnlyList<UserResponseDto>> GetAllAsync(CurrentUserContext currentUser, CancellationToken cancellationToken = default);
    Task<IReadOnlyList<UserResponseDto>> GetStaffCandidatesAsync(CurrentUserContext currentUser, CancellationToken cancellationToken = default);
    Task<UserResponseDto?> GetByIdAsync(int id, CurrentUserContext currentUser, CancellationToken cancellationToken = default);
    Task<UserResponseDto> CreateAsync(CreateUserRequestDto dto, CurrentUserContext currentUser, CancellationToken cancellationToken = default);
    Task<UserResponseDto?> UpdateAsync(int id, UpdateUserRequestDto dto, CurrentUserContext currentUser, CancellationToken cancellationToken = default);
    Task<UserResponseDto?> UpdateEmailAsync(int id, string email, CurrentUserContext currentUser, CancellationToken cancellationToken = default);
    Task<UserResponseDto?> UpdatePasswordAsync(int id, string password, CurrentUserContext currentUser, CancellationToken cancellationToken = default);
    Task<bool> DeleteAsync(int id, CurrentUserContext currentUser, CancellationToken cancellationToken = default);
}
