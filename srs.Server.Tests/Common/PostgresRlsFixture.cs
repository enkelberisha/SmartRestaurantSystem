using Microsoft.EntityFrameworkCore;
using Npgsql;
using Testcontainers.PostgreSql;
using srs.Server.Data;

namespace srs.Server.Tests.Common;

public sealed class PostgresRlsFixture : IAsyncLifetime
{
    private PostgreSqlContainer? _container;

    public string? SkipReason { get; private set; }
    public bool IsAvailable => SkipReason is null;

    public string ConnectionString =>
        _container?.GetConnectionString()
        ?? throw new InvalidOperationException("The PostgreSQL test container is not available.");

    public async Task InitializeAsync()
    {
        try
        {
            _container = new PostgreSqlBuilder("postgres:16-alpine")
                .WithDatabase("smart_restaurant_tests")
                .WithUsername("postgres")
                .WithPassword("postgres")
                .Build();

            await _container.StartAsync();
            await ResetDatabaseAsync();
        }
        catch (Exception exception)
        {
            SkipReason = $"Docker-backed PostgreSQL tests are unavailable in this environment: {exception.Message}";
        }
    }

    public async Task DisposeAsync()
    {
        if (_container is not null)
        {
            await _container.DisposeAsync();
        }
    }

    public AppDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(ConnectionString)
            .EnableSensitiveDataLogging()
            .Options;

        return new AppDbContext(options);
    }

    public async Task ResetDatabaseAsync()
    {
        if (!IsAvailable)
        {
            throw new InvalidOperationException(SkipReason);
        }

        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();

        await using (var command = connection.CreateCommand())
        {
            command.CommandText = """
                DROP SCHEMA IF EXISTS public CASCADE;
                CREATE SCHEMA public;
                GRANT ALL ON SCHEMA public TO postgres;
                GRANT ALL ON SCHEMA public TO public;
                """;
            await command.ExecuteNonQueryAsync();
        }

        await using var context = CreateDbContext();
        await context.Database.MigrateAsync();
    }

    public async Task InsertUserAsync(
        int id,
        Guid? tenantId,
        string email,
        string role,
        Guid? supabaseUserId = null,
        int? restaurantId = null,
        bool? isActivated = null)
    {
        if (!IsAvailable)
        {
            throw new InvalidOperationException(SkipReason);
        }

        await using var connection = new NpgsqlConnection(ConnectionString);
        await connection.OpenAsync();

        var columns = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        await using (var schemaCommand = connection.CreateCommand())
        {
            schemaCommand.CommandText = """
                select column_name
                from information_schema.columns
                where table_schema = 'public'
                  and table_name = 'users'
                """;

            await using var reader = await schemaCommand.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                columns.Add(reader.GetString(0));
            }
        }

        var insertColumns = new List<string> { "\"Id\"", "\"Email\"", "\"Role\"" };
        var insertValues = new List<string> { "@id", "@email", "@role" };

        await using var command = connection.CreateCommand();
        command.Parameters.AddWithValue("id", id);
        command.Parameters.AddWithValue("email", email);
        command.Parameters.AddWithValue("role", role);

        if (columns.Contains("TenantId"))
        {
            insertColumns.Add("\"TenantId\"");
            insertValues.Add("@tenantId");
            command.Parameters.AddWithValue("tenantId", (object?)tenantId ?? DBNull.Value);
        }

        if (columns.Contains("RestaurantId"))
        {
            insertColumns.Add("\"RestaurantId\"");
            insertValues.Add("@restaurantId");
            command.Parameters.AddWithValue("restaurantId", (object?)restaurantId ?? DBNull.Value);
        }

        if (columns.Contains("SupabaseUserId"))
        {
            insertColumns.Add("\"SupabaseUserId\"");
            insertValues.Add("@supabaseUserId");
            command.Parameters.AddWithValue("supabaseUserId", supabaseUserId ?? Guid.NewGuid());
        }

        if (columns.Contains("IsActivated") && isActivated.HasValue)
        {
            insertColumns.Add("\"IsActivated\"");
            insertValues.Add("@isActivated");
            command.Parameters.AddWithValue("isActivated", isActivated.Value);
        }

        if (columns.Contains("CreatedAt"))
        {
            insertColumns.Add("\"CreatedAt\"");
            insertValues.Add("CURRENT_TIMESTAMP");
        }

        command.CommandText = $"""
            insert into users ({string.Join(", ", insertColumns)})
            values ({string.Join(", ", insertValues)})
            """;

        await command.ExecuteNonQueryAsync();
    }
}
