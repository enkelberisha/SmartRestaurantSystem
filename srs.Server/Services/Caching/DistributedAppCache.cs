using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;

namespace srs.Server.Services.Caching;

public class DistributedAppCache(IDistributedCache cache) : IAppCache
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web);
    private static readonly DistributedCacheEntryOptions VersionEntryOptions = new()
    {
        AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(30)
    };

    public async Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
    {
        var payload = await cache.GetStringAsync(key, cancellationToken);
        if (string.IsNullOrWhiteSpace(payload))
        {
            return default;
        }

        return JsonSerializer.Deserialize<T>(payload, SerializerOptions);
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken cancellationToken = default)
    {
        var payload = JsonSerializer.Serialize(value, SerializerOptions);
        var options = new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = ttl
        };

        await cache.SetStringAsync(key, payload, options, cancellationToken);
    }

    public async Task<T> GetOrCreateAsync<T>(
        string key,
        Func<CancellationToken, Task<T>> factory,
        TimeSpan ttl,
        CancellationToken cancellationToken = default)
    {
        var cached = await GetAsync<T>(key, cancellationToken);
        if (cached is not null)
        {
            return cached;
        }

        var created = await factory(cancellationToken);
        await SetAsync(key, created, ttl, cancellationToken);
        return created;
    }

    public async Task<string> GetVersionAsync(string scopeKey, CancellationToken cancellationToken = default)
    {
        var versionKey = BuildVersionKey(scopeKey);
        var version = await cache.GetStringAsync(versionKey, cancellationToken);

        if (!string.IsNullOrWhiteSpace(version))
        {
            return version;
        }

        version = "1";
        await cache.SetStringAsync(versionKey, version, VersionEntryOptions, cancellationToken);
        return version;
    }

    public Task RefreshVersionAsync(string scopeKey, CancellationToken cancellationToken = default)
    {
        var versionKey = BuildVersionKey(scopeKey);
        var nextVersion = Guid.NewGuid().ToString("N");
        return cache.SetStringAsync(versionKey, nextVersion, VersionEntryOptions, cancellationToken);
    }

    private static string BuildVersionKey(string scopeKey)
    {
        return $"{scopeKey}:version";
    }
}
