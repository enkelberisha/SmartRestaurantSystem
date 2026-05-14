using FluentAssertions;
using srs.Server.Dtos.Inventory;
using srs.Server.Models;
using srs.Server.Services.Inventory;
using srs.Server.Tests.Common;

namespace srs.Server.Tests.Unit.Services;

public class InventoryServiceTests
{
    [Fact]
    public async Task CreateAsync_PersistsInventoryForRestaurant()
    {
        using var db = new SqliteTestDb();
        var tenant = TestData.Tenant();
        db.Context.Tenants.Add(tenant);
        db.Context.Restaurants.Add(TestData.Restaurant(tenant.Id, id: 5));
        await db.Context.SaveChangesAsync();
        var service = new InventoryService(db.Context);

        var result = await service.CreateAsync(new CreateInventoryDto { RestaurantId = 5 });

        result.Id.Should().BeGreaterThan(0);
        result.RestaurantId.Should().Be(5);
        db.Context.Inventories.Should().ContainSingle(inventory => inventory.RestaurantId == 5);
    }

    [Fact]
    public async Task GetAllAsync_ReturnsProjectedInventories()
    {
        using var db = new SqliteTestDb();
        var tenant = TestData.Tenant();
        db.Context.Tenants.Add(tenant);
        db.Context.Restaurants.AddRange(
            TestData.Restaurant(tenant.Id, id: 5, name: "Restaurant 5"),
            TestData.Restaurant(tenant.Id, id: 6, name: "Restaurant 6"));
        db.Context.Inventories.AddRange(
            new Inventory { RestaurantId = 5 },
            new Inventory { RestaurantId = 6 });
        await db.Context.SaveChangesAsync();
        var service = new InventoryService(db.Context);

        var result = await service.GetAllAsync();

        result.Should().HaveCount(2);
        result.Select(item => item.RestaurantId).Should().Equal(5, 6);
    }

    [Fact]
    public async Task GetByIdAsync_ReturnsNullWhenMissing()
    {
        using var db = new SqliteTestDb();
        var service = new InventoryService(db.Context);

        var result = await service.GetByIdAsync(999);

        result.Should().BeNull();
    }
}
