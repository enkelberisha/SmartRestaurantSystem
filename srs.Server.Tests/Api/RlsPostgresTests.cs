using System.Net;
using System.Net.Http.Headers;
using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Moq;
using srs.Server.Models;
using srs.Server.Models.Enums;
using srs.Server.Services.Auth;
using srs.Server.Tests.Common;

namespace srs.Server.Tests.Api;

[CollectionDefinition(Name)]
public sealed class RlsPostgresCollection : ICollectionFixture<PostgresRlsFixture>
{
    public const string Name = "RlsPostgres";
}

[Collection(RlsPostgresCollection.Name)]
public class RlsPostgresTests(PostgresRlsFixture fixture)
{
    [Fact]
    public async Task DatabaseRlsContextService_FiltersUsersToCurrentTenant()
    {
        if (!fixture.IsAvailable)
        {
            return;
        }
        await fixture.ResetDatabaseAsync();
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        await using var context = fixture.CreateDbContext();
        context.Tenants.AddRange(
            TestData.Tenant(tenantA, "Tenant A"),
            TestData.Tenant(tenantB, "Tenant B"));
        context.Users.AddRange(
            TestData.User(tenantA, UserRole.Admin, id: 10, email: "tenant-a@test.local"),
            TestData.User(tenantB, UserRole.Admin, id: 11, email: "tenant-b@test.local"));
        await context.SaveChangesAsync();

        var currentUserService = CreateCurrentUserServiceMock(TestData.CurrentUser(UserRole.Admin, tenantA, id: 10));
        var service = new DatabaseRlsContextService(context, currentUserService.Object);

        await service.ApplyAsync(CreateAuthenticatedHttpContext());
        var visibleEmails = await context.Users
            .OrderBy(user => user.Id)
            .Select(user => user.Email)
            .ToListAsync();
        await service.ClearAsync();

        visibleEmails.Should().Equal("tenant-a@test.local");

        var allEmailsAfterClear = await context.Users
            .OrderBy(user => user.Id)
            .Select(user => user.Email)
            .ToListAsync();

        allEmailsAfterClear.Should().Equal("tenant-a@test.local", "tenant-b@test.local");
    }

    [Fact]
    public async Task DatabaseRlsContextService_FiltersReservationRowsThroughRestaurantOwnership()
    {
        if (!fixture.IsAvailable)
        {
            return;
        }
        await fixture.ResetDatabaseAsync();
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        await using var context = fixture.CreateDbContext();
        context.Tenants.AddRange(
            TestData.Tenant(tenantA, "Tenant A"),
            TestData.Tenant(tenantB, "Tenant B"));
        context.Restaurants.AddRange(
            TestData.Restaurant(tenantA, id: 100, name: "A Restaurant"),
            TestData.Restaurant(tenantB, id: 200, name: "B Restaurant"));
        context.Tables.AddRange(
            TestData.Table(restaurantId: 100, id: 1000, number: 1),
            TestData.Table(restaurantId: 200, id: 2000, number: 1));
        context.Reservations.AddRange(
            new Reservation
            {
                TableId = 1000,
                Name = "Visible Reservation",
                ReservationDate = DateOnly.FromDateTime(DateTime.Now.AddDays(1)),
                ReservationTime = new TimeOnly(18, 0),
                Status = ReservationStatus.Pending
            },
            new Reservation
            {
                TableId = 2000,
                Name = "Hidden Reservation",
                ReservationDate = DateOnly.FromDateTime(DateTime.Now.AddDays(1)),
                ReservationTime = new TimeOnly(19, 0),
                Status = ReservationStatus.Pending
            });
        await context.SaveChangesAsync();

        var currentUserService = CreateCurrentUserServiceMock(TestData.CurrentUser(UserRole.Admin, tenantA, id: 10));
        var service = new DatabaseRlsContextService(context, currentUserService.Object);

        await service.ApplyAsync(CreateAuthenticatedHttpContext());
        var visibleNames = await context.Reservations
            .OrderBy(reservation => reservation.Id)
            .Select(reservation => reservation.Name)
            .ToListAsync();
        await service.ClearAsync();

        visibleNames.Should().Equal("Visible Reservation");
    }

    [Fact]
    public async Task DatabaseRlsContextService_AllowsSuperAdminToSeeCrossTenantRows()
    {
        if (!fixture.IsAvailable)
        {
            return;
        }
        await fixture.ResetDatabaseAsync();
        var tenantA = Guid.NewGuid();
        var tenantB = Guid.NewGuid();

        await using var context = fixture.CreateDbContext();
        context.Tenants.AddRange(
            TestData.Tenant(tenantA, "Tenant A"),
            TestData.Tenant(tenantB, "Tenant B"));
        context.Users.AddRange(
            TestData.User(tenantA, UserRole.Admin, id: 10, email: "tenant-a@test.local"),
            TestData.User(tenantB, UserRole.Admin, id: 11, email: "tenant-b@test.local"));
        await context.SaveChangesAsync();

        var currentUserService = CreateCurrentUserServiceMock(TestData.CurrentUser(UserRole.SuperAdmin, id: 1));
        var service = new DatabaseRlsContextService(context, currentUserService.Object);

        await service.ApplyAsync(CreateAuthenticatedHttpContext());
        var visibleEmails = await context.Users
            .OrderBy(user => user.Id)
            .Select(user => user.Email)
            .ToListAsync();
        await service.ClearAsync();

        visibleEmails.Should().Equal("tenant-a@test.local", "tenant-b@test.local");
    }

    [Fact]
    public async Task AuthRlsContextEndpoint_ReturnsAppliedSessionValues()
    {
        if (!fixture.IsAvailable)
        {
            return;
        }
        await fixture.ResetDatabaseAsync();
        var tenantId = Guid.NewGuid();
        var supabaseUserId = Guid.NewGuid();

        await using (var context = fixture.CreateDbContext())
        {
            context.Tenants.Add(TestData.Tenant(tenantId, "Tenant A"));
            context.Users.Add(new User
            {
                Id = 10,
                TenantId = tenantId,
                SupabaseUserId = supabaseUserId,
                Email = "owner@test.local",
                Role = UserRole.Owner,
                IsActivated = true
            });
            await context.SaveChangesAsync();
        }

        await using var factory = new PostgresWebApplicationFactory(fixture.ConnectionString);
        var client = factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(TestAuthHandler.SchemeName);
        client.DefaultRequestHeaders.Add("X-Test-AppUserId", "10");
        client.DefaultRequestHeaders.Add("X-Test-SupabaseUserId", supabaseUserId.ToString());
        client.DefaultRequestHeaders.Add("X-Test-Role", UserRole.Owner.ToString());
        client.DefaultRequestHeaders.Add("X-Test-TenantId", tenantId.ToString());
        client.DefaultRequestHeaders.Add("X-Test-Email", "owner@test.local");

        var response = await client.GetAsync("/api/auth/rls-context");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain(tenantId.ToString());
        body.Should().Contain("Owner");
        body.Should().Contain("true");
    }

    private static DefaultHttpContext CreateAuthenticatedHttpContext()
    {
        var context = new DefaultHttpContext();
        context.User = new ClaimsPrincipal(new ClaimsIdentity(
            [new Claim(ClaimTypes.Name, "test-user")],
            "Test"));
        return context;
    }

    private static Mock<ICurrentUserService> CreateCurrentUserServiceMock(CurrentUserContext currentUser)
    {
        var currentUserService = new Mock<ICurrentUserService>();
        currentUserService
            .Setup(service => service.GetCurrentUser(It.IsAny<ClaimsPrincipal>()))
            .Returns(currentUser);

        return currentUserService;
    }
}
