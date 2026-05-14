using srs.Server.Dtos.TableSessions;
using srs.Server.Services.Auth;

namespace srs.Server.Services.TableSessions;

public interface ITableSessionService
{
    Task<TableSessionDto> CreateAsync(CreateTableSessionDto dto, CurrentUserContext user, CancellationToken cancellationToken = default);
    Task<TableSessionDto?> GetAsync(Guid id, CurrentUserContext user, CancellationToken cancellationToken = default);
    Task<TableSessionDto?> CloseAsync(Guid id, CurrentUserContext user, CancellationToken cancellationToken = default);
    Task<List<TableSessionOrderDto>> GetOrdersAsync(Guid id, CurrentUserContext user, CancellationToken cancellationToken = default);
    Task<TableSessionOrderDto> CreateOrderAsync(Guid id, CreateTableSessionOrderDto dto, CurrentUserContext user, CancellationToken cancellationToken = default);
}
