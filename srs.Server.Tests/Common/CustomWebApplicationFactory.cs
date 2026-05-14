using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using srs.Server.Data;
using srs.Server.Services.Auth;
using srs.Server.Services.Supabase;

namespace srs.Server.Tests.Common;

public sealed class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly SqliteConnection _connection = new("DataSource=:memory:");

    public AppDbContext CreateDbContext()
    {
        return Services.GetRequiredService<IDbContextFactory<AppDbContext>>().CreateDbContext();
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        _connection.Open();
        builder.UseEnvironment("Testing");

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<DbContextOptions>();
            services.RemoveAll<IDatabaseProvider>();
            services.RemoveAll<AppDbContext>();
            services.RemoveAll<IDatabaseRlsContextService>();
            services.RemoveAll<ISupabaseAdminService>();
            services.RemoveAll<IClaimsTransformation>();

            services.AddDbContextFactory<AppDbContext>(options => options.UseSqlite(_connection));
            services.AddScoped(provider => provider.GetRequiredService<IDbContextFactory<AppDbContext>>().CreateDbContext());
            services.AddScoped<IDatabaseRlsContextService, NoOpDatabaseRlsContextService>();
            services.AddSingleton<ISupabaseAdminService, FakeSupabaseAdminService>();
            services.AddSingleton<IClaimsTransformation, NoOpClaimsTransformation>();

            services.AddAuthentication(TestAuthHandler.SchemeName)
                .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(TestAuthHandler.SchemeName, _ => { });

            services.PostConfigureAll<AuthenticationOptions>(options =>
            {
                options.DefaultAuthenticateScheme = TestAuthHandler.SchemeName;
                options.DefaultChallengeScheme = TestAuthHandler.SchemeName;
            });

            using var provider = services.BuildServiceProvider();
            using var scope = provider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            context.Database.EnsureDeleted();
            context.Database.EnsureCreated();
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);

        if (disposing)
        {
            _connection.Dispose();
        }
    }
}
