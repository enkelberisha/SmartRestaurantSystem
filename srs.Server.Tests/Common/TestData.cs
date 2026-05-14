using srs.Server.Models;
using srs.Server.Models.Enums;
using srs.Server.Services.Auth;

namespace srs.Server.Tests.Common;

public static class TestData
{
    public static Tenant Tenant(Guid? id = null, string name = "Test Tenant")
    {
        return new Tenant
        {
            Id = id ?? Guid.NewGuid(),
            Name = name,
            IsActive = true
        };
    }

    public static Restaurant Restaurant(Guid tenantId, int id = 0, string name = "Test Restaurant")
    {
        return new Restaurant
        {
            Id = id,
            TenantId = tenantId,
            Name = name,
            Location = "Test Location"
        };
    }

    public static Table Table(int restaurantId, int id = 0, int number = 1)
    {
        return new Table
        {
            Id = id,
            RestaurantId = restaurantId,
            Number = number,
            Capacity = 4,
            Status = TableStatus.Available
        };
    }

    public static User User(
        Guid? tenantId,
        UserRole role,
        int id = 0,
        int? restaurantId = null,
        string? email = null)
    {
        return new User
        {
            Id = id,
            TenantId = tenantId,
            RestaurantId = restaurantId,
            SupabaseUserId = Guid.NewGuid(),
            Email = email ?? $"{Guid.NewGuid():N}@test.local",
            Role = role,
            IsActivated = true
        };
    }

    public static CurrentUserContext CurrentUser(
        UserRole role,
        Guid? tenantId = null,
        int id = 1,
        int? restaurantId = null)
    {
        return new CurrentUserContext(
            id,
            Guid.NewGuid(),
            "current@test.local",
            role,
            tenantId,
            restaurantId);
    }
}
