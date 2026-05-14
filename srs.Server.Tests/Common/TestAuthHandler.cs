using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace srs.Server.Tests.Common;

public sealed class TestAuthHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "Test";

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.Authorization.ToString().StartsWith(SchemeName, StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var tenantId = Request.Headers["X-Test-TenantId"].FirstOrDefault();
        var restaurantId = Request.Headers["X-Test-RestaurantId"].FirstOrDefault();
        var role = Request.Headers["X-Test-Role"].FirstOrDefault() ?? "Owner";
        var appUserId = Request.Headers["X-Test-AppUserId"].FirstOrDefault() ?? "1";
        var supabaseUserId = Request.Headers["X-Test-SupabaseUserId"].FirstOrDefault() ?? Guid.NewGuid().ToString();
        var email = Request.Headers["X-Test-Email"].FirstOrDefault() ?? "owner@test.local";

        var claims = new List<Claim>
        {
            new("app_user_id", appUserId),
            new("supabase_user_id", supabaseUserId),
            new("sub", supabaseUserId),
            new("email", email),
            new(ClaimTypes.Email, email),
            new(ClaimTypes.Role, role)
        };

        if (!string.IsNullOrWhiteSpace(tenantId))
        {
            claims.Add(new Claim("tenant_id", tenantId));
        }

        if (!string.IsNullOrWhiteSpace(restaurantId))
        {
            claims.Add(new Claim("restaurant_id", restaurantId));
        }

        var identity = new ClaimsIdentity(claims, SchemeName);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, SchemeName);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
