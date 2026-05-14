using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using FluentAssertions;
using srs.Server.Dtos.Auth;
using srs.Server.Dtos.Inventory;
using srs.Server.Dtos.Reservations;
using srs.Server.Dtos.Users;
using srs.Server.Models;
using srs.Server.Models.Enums;
using srs.Server.Tests.Common;

namespace srs.Server.Tests.Api;

public class ApiEndpointTests
{
    [Fact]
    public async Task UsersEndpoint_RequiresAuthentication()
    {
        await using var factory = new CustomWebApplicationFactory();
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/users");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task UsersEndpoint_FiltersResultsByAuthenticatedUsersTenant()
    {
        await using var factory = new CustomWebApplicationFactory();
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        await using (var db = factory.CreateDbContext())
        {
            db.Tenants.AddRange(
                TestData.Tenant(tenantA, "Tenant A"),
                TestData.Tenant(tenantB, "Tenant B"));
            db.Users.AddRange(
                TestData.User(tenantA, UserRole.Admin, id: 1, email: "visible@test.local"),
                TestData.User(tenantB, UserRole.Admin, id: 2, email: "hidden@test.local"));
            await db.SaveChangesAsync();
        }

        var client = CreateAuthenticatedClient(factory, UserRole.Admin, tenantA, appUserId: 1);

        var response = await client.GetAsync("/api/users");
        var body = await response.Content.ReadAsStringAsync();

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        body.Should().Contain("visible@test.local");
        body.Should().NotContain("hidden@test.local");
    }

    [Fact]
    public async Task ReservationRestaurantEndpoint_RequiresAuthentication()
    {
        await using var factory = new CustomWebApplicationFactory();
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/reservations/restaurant/1");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task ReservationRestaurantEndpoint_ReturnsBadRequestWhenAuthenticatedUserHasNoTenant()
    {
        await using var factory = new CustomWebApplicationFactory();
        var client = CreateAuthenticatedClient(factory, UserRole.Admin);

        var response = await client.GetAsync("/api/reservations/restaurant/1");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("No tenant");
    }

    [Fact]
    public async Task CreateReservation_ReturnsConflictForDuplicateSlot()
    {
        await using var factory = new CustomWebApplicationFactory();
        var tenantId = Guid.NewGuid();
        var date = DateOnly.FromDateTime(DateTime.Now.AddDays(1));
        var time = new TimeOnly(18, 0);

        await using (var db = factory.CreateDbContext())
        {
            db.Tenants.Add(TestData.Tenant(tenantId));
            db.Restaurants.Add(TestData.Restaurant(tenantId, id: 10));
            db.Tables.Add(TestData.Table(restaurantId: 10, id: 20));
            db.Reservations.Add(new Reservation
            {
                TableId = 20,
                Name = "Existing Guest",
                ReservationDate = date,
                ReservationTime = time,
                Status = ReservationStatus.Pending
            });
            await db.SaveChangesAsync();
        }

        var client = factory.CreateClient();
        var dto = new ReservationRequestDto
        {
            TableId = 20,
            Name = "New Guest",
            ReservationDate = date,
            ReservationTime = time
        };

        var response = await client.PostAsJsonAsync("/api/reservations", dto);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("already reserved");
    }

    [Fact]
    public async Task CreateReservation_ReturnsBadRequestForInvalidPayload()
    {
        await using var factory = new CustomWebApplicationFactory();
        var client = factory.CreateClient();
        var dto = new ReservationRequestDto
        {
            TableId = 0,
            Name = "Guest",
            ReservationDate = DateOnly.FromDateTime(DateTime.Now.AddDays(1)),
            ReservationTime = new TimeOnly(18, 0)
        };

        var response = await client.PostAsJsonAsync("/api/reservations", dto);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Table is required");
    }

    [Fact]
    public async Task ChangePassword_ReturnsBadRequestForWeakPassword()
    {
        await using var factory = new CustomWebApplicationFactory();
        var supabaseUserId = Guid.NewGuid();

        await using (var db = factory.CreateDbContext())
        {
            var tenantId = Guid.NewGuid();
            db.Tenants.Add(TestData.Tenant(tenantId));
            db.Users.Add(new User
            {
                Id = 1,
                TenantId = tenantId,
                SupabaseUserId = supabaseUserId,
                Email = "owner@test.local",
                Role = UserRole.Owner,
                IsActivated = true
            });
            await db.SaveChangesAsync();
        }

        var client = CreateAuthenticatedClient(factory, UserRole.Owner, appUserId: 1, supabaseUserId: supabaseUserId);
        var dto = new ChangePasswordRequestDto
        {
            CurrentPassword = "OldStr0ng!",
            NewPassword = "weak"
        };

        var response = await client.PostAsJsonAsync("/api/auth/change-password", dto);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("Password must be at least 8 characters");
    }

    [Fact]
    public async Task Me_ReturnsCurrentAuthenticatedUserPayload()
    {
        await using var factory = new CustomWebApplicationFactory();
        var tenantId = Guid.NewGuid();
        var supabaseUserId = Guid.NewGuid();

        await using (var db = factory.CreateDbContext())
        {
            db.Tenants.Add(TestData.Tenant(tenantId));
            db.Users.Add(new User
            {
                Id = 1,
                TenantId = tenantId,
                SupabaseUserId = supabaseUserId,
                Email = "owner@test.local",
                Role = UserRole.Owner,
                IsActivated = true
            });
            await db.SaveChangesAsync();
        }

        var client = CreateAuthenticatedClient(factory, UserRole.Owner, tenantId, appUserId: 1, supabaseUserId: supabaseUserId);

        var response = await client.GetAsync("/api/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("owner@test.local");
        body.Should().Contain("Owner");
    }

    [Fact]
    public async Task GetUserById_ReturnsNotFoundWhenUserIsOutsideTenant()
    {
        await using var factory = new CustomWebApplicationFactory();
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        await using (var db = factory.CreateDbContext())
        {
            db.Tenants.AddRange(TestData.Tenant(tenantA, "Tenant A"), TestData.Tenant(tenantB, "Tenant B"));
            db.Users.Add(TestData.User(tenantB, UserRole.Admin, id: 2, email: "hidden@test.local"));
            await db.SaveChangesAsync();
        }

        var client = CreateAuthenticatedClient(factory, UserRole.Admin, tenantA, appUserId: 1);

        var response = await client.GetAsync("/api/users/2");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task CreateUser_ReturnsConflictForDuplicateEmail()
    {
        await using var factory = new CustomWebApplicationFactory();
        var tenantId = Guid.NewGuid();

        await using (var db = factory.CreateDbContext())
        {
            db.Tenants.Add(TestData.Tenant(tenantId));
            db.Users.Add(TestData.User(tenantId, UserRole.PosDevice, id: 2, email: "existing@test.local"));
            await db.SaveChangesAsync();
        }

        var client = CreateAuthenticatedClient(factory, UserRole.SuperAdmin, appUserId: 1);
        var dto = new CreateUserRequestDto
        {
            Email = "existing@test.local",
            Password = "Str0ng!Pass",
            Role = UserRole.Owner,
            TenantId = tenantId
        };

        var response = await client.PostAsJsonAsync("/api/users", dto);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task UpdateUserEmail_ReturnsConflictWhenEmailAlreadyExists()
    {
        await using var factory = new CustomWebApplicationFactory();
        var tenantId = Guid.NewGuid();

        await using (var db = factory.CreateDbContext())
        {
            db.Tenants.Add(TestData.Tenant(tenantId));
            db.Users.AddRange(
                TestData.User(tenantId, UserRole.Admin, id: 1, email: "current@test.local"),
                TestData.User(tenantId, UserRole.Admin, id: 2, email: "taken@test.local"));
            await db.SaveChangesAsync();
        }

        var client = CreateAuthenticatedClient(factory, UserRole.Admin, tenantId, appUserId: 1);

        var response = await client.PutAsJsonAsync("/api/users/1/email", new UpdateUserEmailRequestDto
        {
            Email = "taken@test.local"
        });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
    }

    [Fact]
    public async Task UpdateUserPassword_ReturnsBadRequestForWeakPassword()
    {
        await using var factory = new CustomWebApplicationFactory();
        var tenantId = Guid.NewGuid();

        await using (var db = factory.CreateDbContext())
        {
            db.Tenants.Add(TestData.Tenant(tenantId));
            db.Users.Add(TestData.User(tenantId, UserRole.Admin, id: 1, email: "current@test.local"));
            await db.SaveChangesAsync();
        }

        var client = CreateAuthenticatedClient(factory, UserRole.Admin, tenantId, appUserId: 1);

        var response = await client.PutAsJsonAsync("/api/users/1/password", new UpdateUserPasswordRequestDto
        {
            Password = "weak"
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task DeleteUser_ReturnsBadRequestWhenDeletingSelf()
    {
        await using var factory = new CustomWebApplicationFactory();
        var tenantId = Guid.NewGuid();

        await using (var db = factory.CreateDbContext())
        {
            db.Tenants.Add(TestData.Tenant(tenantId));
            db.Users.Add(TestData.User(tenantId, UserRole.Admin, id: 1, email: "current@test.local"));
            await db.SaveChangesAsync();
        }

        var client = CreateAuthenticatedClient(factory, UserRole.Admin, tenantId, appUserId: 1);

        var response = await client.DeleteAsync("/api/users/1");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("cannot delete your own user");
    }

    [Fact]
    public async Task InventoryGetById_ReturnsNotFoundWhenInventoryDoesNotExist()
    {
        await using var factory = new CustomWebApplicationFactory();
        var client = factory.CreateClient();

        var response = await client.GetAsync("/api/inventory/999");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    private static HttpClient CreateAuthenticatedClient(
        CustomWebApplicationFactory factory,
        UserRole role,
        Guid? tenantId = null,
        int appUserId = 1,
        Guid? supabaseUserId = null,
        int? restaurantId = null)
    {
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(TestAuthHandler.SchemeName);
        client.DefaultRequestHeaders.Add("X-Test-Role", role.ToString());
        client.DefaultRequestHeaders.Add("X-Test-AppUserId", appUserId.ToString());
        client.DefaultRequestHeaders.Add("X-Test-SupabaseUserId", (supabaseUserId ?? Guid.NewGuid()).ToString());

        if (tenantId.HasValue)
        {
            client.DefaultRequestHeaders.Add("X-Test-TenantId", tenantId.Value.ToString());
        }

        if (restaurantId.HasValue)
        {
            client.DefaultRequestHeaders.Add("X-Test-RestaurantId", restaurantId.Value.ToString());
        }

        return client;
    }
}
