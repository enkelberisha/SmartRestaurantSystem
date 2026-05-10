using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;

namespace srs.Server.Services.Supabase;

public class SupabaseAdminService(HttpClient httpClient, IOptions<SupabaseOptions> options) : ISupabaseAdminService
{
    private readonly SupabaseOptions _options = options.Value;

    public async Task<(Guid Id, string Email)> CreateUserAsync(string email, string password, CancellationToken cancellationToken = default)
    {
        EnsureConfiguredForCreate();

        return HasServiceRoleKey()
            ? await CreateAdminUserAsync(email, password, cancellationToken)
            : await SignUpUserAsync(email, password, cancellationToken);
    }

    public async Task DeleteUserAsync(Guid supabaseUserId, CancellationToken cancellationToken = default)
    {
        EnsureConfiguredForDelete();

        using var request = new HttpRequestMessage(HttpMethod.Delete, $"auth/v1/admin/users/{supabaseUserId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ServiceRoleKey);
        request.Headers.Add("apikey", _options.ServiceRoleKey);

        using var response = await httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException($"Supabase user deletion failed: {content}");
        }
    }

    public async Task UpdateUserEmailAsync(Guid supabaseUserId, string email, CancellationToken cancellationToken = default)
    {
        EnsureConfiguredForDelete();

        using var request = new HttpRequestMessage(HttpMethod.Put, $"auth/v1/admin/users/{supabaseUserId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ServiceRoleKey);
        request.Headers.Add("apikey", _options.ServiceRoleKey);
        request.Content = JsonContent.Create(new
        {
            email,
            email_confirm = true
        });

        using var response = await httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException($"Supabase email update failed: {content}");
        }
    }

    public async Task UpdateUserPasswordAsync(Guid supabaseUserId, string password, CancellationToken cancellationToken = default)
    {
        EnsureConfiguredForDelete();

        using var request = new HttpRequestMessage(HttpMethod.Put, $"auth/v1/admin/users/{supabaseUserId}");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ServiceRoleKey);
        request.Headers.Add("apikey", _options.ServiceRoleKey);
        request.Content = JsonContent.Create(new
        {
            password
        });

        using var response = await httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException($"Supabase password update failed: {content}");
        }
    }

    public async Task<bool> VerifyPasswordAsync(string email, string password, CancellationToken cancellationToken = default)
    {
        EnsureConfiguredForCreate();

        using var request = new HttpRequestMessage(HttpMethod.Post, "auth/v1/token?grant_type=password");
        request.Headers.Add("apikey", string.IsNullOrWhiteSpace(_options.PublishableKey) ? _options.ServiceRoleKey : _options.PublishableKey);
        request.Content = JsonContent.Create(new
        {
            email,
            password
        });

        using var response = await httpClient.SendAsync(request, cancellationToken);
        return response.IsSuccessStatusCode;
    }

    private async Task<(Guid Id, string Email)> CreateAdminUserAsync(string email, string password, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "auth/v1/admin/users");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ServiceRoleKey);
        request.Headers.Add("apikey", _options.ServiceRoleKey);
        request.Content = JsonContent.Create(new
        {
            email,
            password,
            email_confirm = true
        });

        using var response = await httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException(MapCreateFailure(content));
        }

        var payload = await response.Content.ReadFromJsonAsync<SupabaseAdminCreateResponse>(cancellationToken);
        return ReadUser(payload?.User ?? payload?.Record, email, "Supabase user creation returned an invalid response.");
    }

    private async Task<(Guid Id, string Email)> SignUpUserAsync(string email, string password, CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "auth/v1/signup");
        request.Headers.Add("apikey", _options.PublishableKey);
        request.Content = JsonContent.Create(new
        {
            email,
            password
        });

        using var response = await httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var content = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new InvalidOperationException(MapCreateFailure(content));
        }

        var payload = await response.Content.ReadFromJsonAsync<SupabaseSignupResponse>(cancellationToken);
        return ReadUser(payload?.User ?? payload?.Record, email, "Supabase signup returned an invalid response.");
    }

    private static (Guid Id, string Email) ReadUser(SupabaseUserResponse? payload, string fallbackEmail, string errorMessage)
    {
        if (payload?.Id is null || !Guid.TryParse(payload.Id, out var supabaseUserId))
        {
            throw new InvalidOperationException(errorMessage);
        }

        return (supabaseUserId, payload.Email ?? fallbackEmail);
    }

    private bool HasServiceRoleKey() => !string.IsNullOrWhiteSpace(_options.ServiceRoleKey);

    private static string MapCreateFailure(string content)
    {
        var normalized = content.ToLowerInvariant();
        if (normalized.Contains("already registered") || normalized.Contains("already been registered") || normalized.Contains("already exists"))
        {
            return "That email is already in use for another account.";
        }

        return $"Supabase user creation failed: {content}";
    }

    private void EnsureConfiguredForCreate()
    {
        if (string.IsNullOrWhiteSpace(_options.Url) || (string.IsNullOrWhiteSpace(_options.ServiceRoleKey) && string.IsNullOrWhiteSpace(_options.PublishableKey)))
        {
            throw new InvalidOperationException("Supabase configuration is missing. Set Supabase:Url and either Supabase:ServiceRoleKey or Supabase:PublishableKey.");
        }
    }

    private void EnsureConfiguredForDelete()
    {
        if (string.IsNullOrWhiteSpace(_options.Url) || string.IsNullOrWhiteSpace(_options.ServiceRoleKey))
        {
            throw new InvalidOperationException("Supabase admin deletion requires Supabase:ServiceRoleKey.");
        }
    }

    private sealed class SupabaseSignupResponse
    {
        [JsonPropertyName("user")]
        public SupabaseUserResponse? User { get; set; }

        [JsonPropertyName("record")]
        public SupabaseUserResponse? Record { get; set; }
    }

    private sealed class SupabaseAdminCreateResponse
    {
        [JsonPropertyName("user")]
        public SupabaseUserResponse? User { get; set; }

        [JsonPropertyName("record")]
        public SupabaseUserResponse? Record { get; set; }
    }

    private sealed class SupabaseUserResponse
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [JsonPropertyName("email")]
        public string? Email { get; set; }
    }
}
