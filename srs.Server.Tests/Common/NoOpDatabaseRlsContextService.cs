using Microsoft.AspNetCore.Http;
using srs.Server.Services.Auth;

namespace srs.Server.Tests.Common;

public sealed class NoOpDatabaseRlsContextService : IDatabaseRlsContextService
{
    public Task ApplyAsync(HttpContext httpContext, CancellationToken cancellationToken = default)
    {
        return Task.CompletedTask;
    }

    public Task ClearAsync(CancellationToken cancellationToken = default)
    {
        return Task.CompletedTask;
    }
}
