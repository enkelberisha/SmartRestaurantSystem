using srs.Server.Services.Auth;

namespace srs.Server.Middleware;

public class DatabaseRlsContextMiddleware(RequestDelegate next)
{
    public async Task InvokeAsync(
        HttpContext context,
        IDatabaseRlsContextService databaseRlsContextService)
    {
        await databaseRlsContextService.ApplyAsync(context, context.RequestAborted);

        try
        {
            await next(context);
        }
        finally
        {
            await databaseRlsContextService.ClearAsync(CancellationToken.None);
        }
    }
}
