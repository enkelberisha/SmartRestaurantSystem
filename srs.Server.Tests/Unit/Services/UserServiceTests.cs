using FluentAssertions;
using srs.Server.Dtos.Users;
using srs.Server.Models.Enums;
using srs.Server.Services.Users;
using srs.Server.Tests.Common;

namespace srs.Server.Tests.Unit.Services;

public class UserServiceTests
{
    [Fact]
    public async Task CreateAsync_RejectsDuplicateEmailAfterNormalization()
    {
        using var db = new SqliteTestDb();
        var tenant = TestData.Tenant();
        db.Context.Tenants.Add(tenant);
        db.Context.Users.Add(TestData.User(tenant.Id, UserRole.Owner, email: "existing@test.local"));
        await db.Context.SaveChangesAsync();

        var service = new UserService(db.Context, new FakeSupabaseAdminService());
        var dto = new CreateUserRequestDto
        {
            Email = "  EXISTING@Test.Local  ",
            Password = "Str0ng!Pass",
            Role = UserRole.Owner,
            TenantId = tenant.Id
        };

        var act = () => service.CreateAsync(dto, TestData.CurrentUser(UserRole.SuperAdmin));

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("A user with that email already exists.");
    }

    [Fact]
    public async Task CreateAsync_RejectsWeakPassword()
    {
        using var db = new SqliteTestDb();
        var service = new UserService(db.Context, new FakeSupabaseAdminService());
        var dto = new CreateUserRequestDto
        {
            Email = "new@test.local",
            Password = "weak",
            Role = UserRole.Owner,
            TenantId = Guid.NewGuid()
        };

        var act = () => service.CreateAsync(dto, TestData.CurrentUser(UserRole.SuperAdmin));

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.");
    }

    [Fact]
    public async Task CreateAsync_AllowsTenantAdminsToCreateOnlyDeviceAccounts()
    {
        using var db = new SqliteTestDb();
        var tenant = TestData.Tenant();
        db.Context.Tenants.Add(tenant);
        await db.Context.SaveChangesAsync();

        var service = new UserService(db.Context, new FakeSupabaseAdminService());
        var dto = new CreateUserRequestDto
        {
            Email = "manager@test.local",
            Password = "Str0ng!Pass",
            Role = UserRole.Manager,
            TenantId = tenant.Id
        };

        var act = () => service.CreateAsync(dto, TestData.CurrentUser(UserRole.Admin, tenant.Id));

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("Owners, managers, and admins can only create or update device accounts.");
    }

    [Fact]
    public async Task DeleteAsync_RejectsDeletingCurrentUser()
    {
        using var db = new SqliteTestDb();
        var tenant = TestData.Tenant();
        db.Context.Tenants.Add(tenant);
        db.Context.Users.Add(TestData.User(tenant.Id, UserRole.Admin, id: 42));
        await db.Context.SaveChangesAsync();

        var service = new UserService(db.Context, new FakeSupabaseAdminService());
        var currentUser = TestData.CurrentUser(UserRole.Admin, tenant.Id, id: 42);

        var act = () => service.DeleteAsync(42, currentUser);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("You cannot delete your own user.");
    }

    [Fact]
    public async Task GetAllAsync_FiltersUsersToCurrentTenantForNonSuperAdmins()
    {
        using var db = new SqliteTestDb();
        var tenantA = TestData.Tenant(name: "Tenant A");
        var tenantB = TestData.Tenant(name: "Tenant B");
        db.Context.Tenants.AddRange(tenantA, tenantB);
        db.Context.Users.AddRange(
            TestData.User(tenantA.Id, UserRole.Admin, email: "visible@test.local"),
            TestData.User(tenantB.Id, UserRole.Admin, email: "hidden@test.local"));
        await db.Context.SaveChangesAsync();

        var service = new UserService(db.Context, new FakeSupabaseAdminService());

        var result = await service.GetAllAsync(TestData.CurrentUser(UserRole.Admin, tenantA.Id));

        result.Should().ContainSingle();
        result[0].Email.Should().Be("visible@test.local");
    }
}
