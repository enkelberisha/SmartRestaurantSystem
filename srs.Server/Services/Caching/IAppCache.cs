namespace srs.Server.Services.Caching;

public interface IAppCache
{
    Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default);

    Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken cancellationToken = default);

    Task<T> GetOrCreateAsync<T>(
        string key,
        Func<CancellationToken, Task<T>> factory,
        TimeSpan ttl,
        CancellationToken cancellationToken = default);

    Task<string> GetVersionAsync(string scopeKey, CancellationToken cancellationToken = default);

    Task RefreshVersionAsync(string scopeKey, CancellationToken cancellationToken = default);
}
