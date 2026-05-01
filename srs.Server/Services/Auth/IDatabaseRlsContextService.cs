namespace srs.Server.Services.Auth;

public interface IDatabaseRlsContextService
{
    Task ApplyAsync(HttpContext httpContext, CancellationToken cancellationToken = default);
    Task ClearAsync(CancellationToken cancellationToken = default);
}
