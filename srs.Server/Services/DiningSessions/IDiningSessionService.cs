using srs.Server.Dtos.DiningSessions;
using srs.Server.Services.Auth;

namespace srs.Server.Services.DiningSessions;

public interface IDiningSessionService
{
    Task<DiningSessionDto> CreateAsync(CreateDiningSessionDto dto, CurrentUserContext user, CancellationToken cancellationToken = default);
    Task<List<DiningSessionDto>> GetActiveAsync(int? restaurantId, CurrentUserContext user, CancellationToken cancellationToken = default);
    Task<DiningSessionDto?> GetAsync(int id, CurrentUserContext user, CancellationToken cancellationToken = default);
    Task<DiningSessionDto?> UpdateAsync(int id, UpdateDiningSessionDto dto, CurrentUserContext user, CancellationToken cancellationToken = default);
    Task<DiningSessionDto?> CloseAsync(int id, CurrentUserContext user, CancellationToken cancellationToken = default);
}
