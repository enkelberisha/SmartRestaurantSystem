using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using srs.Server.Data;
using srs.Server.Services.Supabase;

namespace srs.Server.Tests.Common;

public sealed class PostgresWebApplicationFactory(string connectionString) : WebApplicationFactory<Program>
{
    public AppDbContext CreateDbContext()
    {
        return Services.GetRequiredService<AppDbContext>();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<DbContextOptions>();
            services.RemoveAll<IDatabaseProvider>();
            services.RemoveAll<AppDbContext>();
            services.RemoveAll<IClaimsTransformation>();
            services.RemoveAll<ISupabaseAdminService>();

            services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));
            services.AddSingleton<IClaimsTransformation, NoOpClaimsTransformation>();
            services.AddSingleton<ISupabaseAdminService, FakeSupabaseAdminService>();

            services.AddAuthentication(TestAuthHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, _ => { });

            services.PostConfigureAll<AuthenticationOptions>(options =>
            {
                options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
            });
        });
    }
}
