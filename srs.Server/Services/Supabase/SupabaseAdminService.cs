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
            throw new InvalidOperationException($"Supabase user creation failed: {content}");
        }

        var payload = await response.Content.ReadFromJsonAsync<SupabaseUserResponse>(cancellationToken);
        return ReadUser(payload, "Supabase user creation returned an invalid response.");
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
            throw new InvalidOperationException($"Supabase signup failed: {content}");
        }

        var payload = await response.Content.ReadFromJsonAsync<SupabaseSignupResponse>(cancellationToken);
        return ReadUser(payload?.User, "Supabase signup returned an invalid response.");
    }

    private static (Guid Id, string Email) ReadUser(SupabaseUserResponse? payload, string errorMessage)
    {
        if (payload?.Id is null || payload.Email is null || !Guid.TryParse(payload.Id, out var supabaseUserId))
        {
            throw new InvalidOperationException(errorMessage);
        }

        return (supabaseUserId, payload.Email);
    }

    private bool HasServiceRoleKey() => !string.IsNullOrWhiteSpace(_options.ServiceRoleKey);

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
    }

    private sealed class SupabaseUserResponse
    {
        [JsonPropertyName("id")]
        public string? Id { get; set; }

        [JsonPropertyName("email")]
        public string? Email { get; set; }
    }
}
