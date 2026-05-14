using System.Security.Claims;
using FluentAssertions;
using Microsoft.Extensions.Logging;
using Moq;
using srs.Server.Models;
using srs.Server.Models.Enums;
using srs.Server.Services.Auth;
using srs.Server.Tests.Common;

namespace srs.Server.Tests.Unit.Services;

public class CurrentUserServiceTests
{
    [Fact]
    public void GetCurrentUser_ParsesAllSupportedClaims()
    {
        using var db = new SqliteTestDb();
        var service = CreateService(db);
        var tenantId = Guid.NewGuid();
        var principal = Principal(
            ("app_user_id", "42"),
            ("supabase_user_id", Guid.NewGuid().ToString()),
            ("email", "owner@test.local"),
            (ClaimTypes.Role, UserRole.Owner.ToString()),
            ("tenant_id", tenantId.ToString()),
            ("restaurant_id", "7"));

        var result = service.GetCurrentUser(principal);

        result.Id.Should().Be(42);
        result.Email.Should().Be("owner@test.local");
        result.Role.Should().Be(UserRole.Owner);
        result.TenantId.Should().Be(tenantId);
        result.RestaurantId.Should().Be(7);
    }

    [Fact]
    public void GetCurrentUser_ThrowsWhenAppUserIdClaimIsMissing()
    {
        using var db = new SqliteTestDb();
        var service = CreateService(db);
        var principal = Principal(
            ("supabase_user_id", Guid.NewGuid().ToString()),
            ("email", "owner@test.local"),
            (ClaimTypes.Role, UserRole.Owner.ToString()));

        var act = () => service.GetCurrentUser(principal);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*app_user_id*");
    }

    [Fact]
    public void GetCurrentUser_ThrowsWhenRoleClaimIsInvalid()
    {
        using var db = new SqliteTestDb();
        var service = CreateService(db);
        var principal = Principal(
            ("app_user_id", "42"),
            ("supabase_user_id", Guid.NewGuid().ToString()),
            ("email", "owner@test.local"),
            (ClaimTypes.Role, "NotARole"));

        var act = () => service.GetCurrentUser(principal);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("Authenticated user has an invalid role claim.");
    }

    [Fact]
    public async Task EnsureUserAsync_CreatesPendingUserAndThrowsActivationPendingWhenMissing()
    {
        using var db = new SqliteTestDb();
        db.Context.Users.Add(TestData.User(null, UserRole.SuperAdmin, id: 1, email: "superadmin@test.local"));
        await db.Context.SaveChangesAsync();

        var service = CreateService(db);
        var supabaseUserId = Guid.NewGuid();
        var principal = Principal(
            ("sub", supabaseUserId.ToString()),
            ("email", "newuser@test.local"));

        var act = () => service.EnsureUserAsync(principal);

        await act.Should().ThrowAsync<AccountActivationPendingException>();
        db.Context.Users.Should().ContainSingle(user => user.Email == "newuser@test.local" && user.Role == UserRole.Pending);
    }

    [Fact]
    public async Task EnsureUserAsync_UpdatesEmailWhenSupabaseEmailChanged()
    {
        using var db = new SqliteTestDb();
        var tenant = TestData.Tenant();
        var supabaseUserId = Guid.NewGuid();
        db.Context.Tenants.Add(tenant);
        db.Context.Restaurants.Add(TestData.Restaurant(tenant.Id, id: 7, name: "Manager Restaurant"));
        await db.Context.SaveChangesAsync();
        db.Context.Users.Add(new User
        {
            Id = 10,
            TenantId = tenant.Id,
            SupabaseUserId = supabaseUserId,
            Email = "old@test.local",
            Role = UserRole.Owner,
            IsActivated = true
        });
        await db.Context.SaveChangesAsync();

        var service = CreateService(db);
        var principal = Principal(
            ("sub", supabaseUserId.ToString()),
            ("email", "new@test.local"));

        var result = await service.EnsureUserAsync(principal);

        result.Email.Should().Be("new@test.local");
        db.Context.Users.Single(user => user.Id == 10).Email.Should().Be("new@test.local");
    }

    [Fact]
    public async Task EnsureUserAsync_ThrowsTenantInactiveMessageWhenTenantIsInactive()
    {
        using var db = new SqliteTestDb();
        var tenant = TestData.Tenant();
        tenant.IsActive = false;
        var supabaseUserId = Guid.NewGuid();
        db.Context.Tenants.Add(tenant);
        db.Context.Users.Add(new User
        {
            Id = 10,
            TenantId = tenant.Id,
            SupabaseUserId = supabaseUserId,
            Email = "owner@test.local",
            Role = UserRole.Owner,
            IsActivated = true
        });
        await db.Context.SaveChangesAsync();

        var service = CreateService(db);
        var principal = Principal(
            ("sub", supabaseUserId.ToString()),
            ("email", "owner@test.local"));

        var act = () => service.EnsureUserAsync(principal);

        await act.Should().ThrowAsync<AccountActivationPendingException>()
            .WithMessage("Your tenant is currently inactive. Please contact the super admin.");
    }

    [Fact]
    public async Task EnsureUserAsync_ReturnsContextForActivatedManager()
    {
        using var db = new SqliteTestDb();
        var tenant = TestData.Tenant();
        var supabaseUserId = Guid.NewGuid();
        db.Context.Tenants.Add(tenant);
        db.Context.Restaurants.Add(TestData.Restaurant(tenant.Id, id: 7, name: "Manager Restaurant"));
        db.Context.Users.Add(new User
        {
            Id = 10,
            TenantId = tenant.Id,
            RestaurantId = 7,
            SupabaseUserId = supabaseUserId,
            Email = "manager@test.local",
            Role = UserRole.Manager,
            IsActivated = true
        });
        await db.Context.SaveChangesAsync();

        var service = CreateService(db);
        var principal = Principal(
            ("sub", supabaseUserId.ToString()),
            ("email", "manager@test.local"));

        var result = await service.EnsureUserAsync(principal);

        result.Id.Should().Be(10);
        result.Role.Should().Be(UserRole.Manager);
        result.TenantId.Should().Be(tenant.Id);
        result.RestaurantId.Should().Be(7);
    }

    [Fact]
    public async Task EnsureUserAsync_DoesNotDuplicateRecentSuperAdminNotifications()
    {
        using var db = new SqliteTestDb();
        db.Context.Users.Add(TestData.User(null, UserRole.SuperAdmin, id: 1, email: "superadmin@test.local"));
        db.Context.Notifications.Add(new Notification
        {
            UserId = 1,
            Message = "Activation required: duplicate@test.local tried to sign in but access is not available yet.",
            CreatedAt = DateTime.UtcNow
        });

        var tenant = TestData.Tenant();
        var supabaseUserId = Guid.NewGuid();
        db.Context.Tenants.Add(tenant);
        db.Context.Users.Add(new User
        {
            Id = 10,
            TenantId = tenant.Id,
            SupabaseUserId = supabaseUserId,
            Email = "duplicate@test.local",
            Role = UserRole.Owner,
            IsActivated = false
        });
        await db.Context.SaveChangesAsync();

        var service = CreateService(db);
        var principal = Principal(
            ("sub", supabaseUserId.ToString()),
            ("email", "duplicate@test.local"));

        var act = () => service.EnsureUserAsync(principal);

        await act.Should().ThrowAsync<AccountActivationPendingException>();
        db.Context.Notifications.Count(notification => notification.UserId == 1).Should().Be(1);
    }

    private static CurrentUserService CreateService(SqliteTestDb db)
    {
        return new CurrentUserService(
            db.Context,
            Mock.Of<ILogger<CurrentUserService>>());
    }

    private static ClaimsPrincipal Principal(params (string Type, string Value)[] claims)
    {
        return new ClaimsPrincipal(new ClaimsIdentity(
            claims.Select(claim => new Claim(claim.Type, claim.Value)),
            "Test"));
    }
}
