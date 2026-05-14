using FluentAssertions;
using srs.Server.Dtos.Reservations;
using srs.Server.Models;
using srs.Server.Models.Enums;
using srs.Server.Services.Reservations;
using srs.Server.Tests.Common;

namespace srs.Server.Tests.Unit.Services;

public class ReservationServiceTests
{
    [Fact]
    public async Task CreateAsync_RejectsPastReservationDate()
    {
        using var db = new SqliteTestDb();
        var service = new ReservationService(db.Context);
        var dto = new ReservationRequestDto
        {
            TableId = 1,
            Name = "Guest",
            ReservationDate = DateOnly.FromDateTime(DateTime.Now.AddDays(-1)),
            ReservationTime = new TimeOnly(18, 0)
        };

        var act = () => service.CreateAsync(dto);

        await act.Should().ThrowAsync<ArgumentException>()
            .WithMessage("Reservation date cannot be in the past.");
    }

    [Fact]
    public async Task CreateAsync_RejectsDuplicateActiveReservationSlot()
    {
        using var db = new SqliteTestDb();
        var tenant = TestData.Tenant();
        db.Context.Tenants.Add(tenant);
        db.Context.Restaurants.Add(TestData.Restaurant(tenant.Id, id: 10));
        db.Context.Tables.Add(TestData.Table(restaurantId: 10, id: 20));

        var date = DateOnly.FromDateTime(DateTime.Now.AddDays(1));
        var time = new TimeOnly(18, 30);
        db.Context.Reservations.Add(new Reservation
        {
            TableId = 20,
            Name = "Existing Guest",
            ReservationDate = date,
            ReservationTime = time,
            Status = ReservationStatus.Pending
        });
        await db.Context.SaveChangesAsync();

        var service = new ReservationService(db.Context);
        var dto = new ReservationRequestDto
        {
            TableId = 20,
            Name = "New Guest",
            ReservationDate = date,
            ReservationTime = time
        };

        var act = () => service.CreateAsync(dto);

        await act.Should().ThrowAsync<InvalidOperationException>()
            .WithMessage("This table is already reserved for that date and time.");
    }

    [Fact]
    public async Task CreateAsync_TrimsNameAndOptionalPhone()
    {
        using var db = new SqliteTestDb();
        var tenant = TestData.Tenant();
        db.Context.Tenants.Add(tenant);
        db.Context.Restaurants.Add(TestData.Restaurant(tenant.Id, id: 10));
        db.Context.Tables.Add(TestData.Table(restaurantId: 10, id: 20));
        await db.Context.SaveChangesAsync();

        var service = new ReservationService(db.Context);
        var dto = new ReservationRequestDto
        {
            TableId = 20,
            Name = "  New Guest  ",
            Phone = "  +36 20 123 4567  ",
            ReservationDate = DateOnly.FromDateTime(DateTime.Now.AddDays(1)),
            ReservationTime = new TimeOnly(19, 0)
        };

        var result = await service.CreateAsync(dto);

        result.Name.Should().Be("New Guest");
        result.Phone.Should().Be("+36 20 123 4567");
        result.Status.Should().Be(ReservationStatus.Pending);
    }

    [Fact]
    public async Task GetByRestaurantIdAsync_ReturnsOnlyReservationsForTenantAndRestaurant()
    {
        using var db = new SqliteTestDb();
        var tenantA = TestData.Tenant(name: "Tenant A");
        var tenantB = TestData.Tenant(name: "Tenant B");
        db.Context.Tenants.AddRange(tenantA, tenantB);
        db.Context.Restaurants.AddRange(
            TestData.Restaurant(tenantA.Id, id: 10, name: "A Restaurant"),
            TestData.Restaurant(tenantB.Id, id: 11, name: "B Restaurant"));
        db.Context.Tables.AddRange(
            TestData.Table(restaurantId: 10, id: 20, number: 1),
            TestData.Table(restaurantId: 11, id: 21, number: 1));
        db.Context.Reservations.AddRange(
            new Reservation
            {
                TableId = 20,
                Name = "Visible",
                ReservationDate = DateOnly.FromDateTime(DateTime.Now.AddDays(1)),
                ReservationTime = new TimeOnly(18, 0),
                Status = ReservationStatus.Pending
            },
            new Reservation
            {
                TableId = 21,
                Name = "Hidden",
                ReservationDate = DateOnly.FromDateTime(DateTime.Now.AddDays(1)),
                ReservationTime = new TimeOnly(19, 0),
                Status = ReservationStatus.Pending
            });
        await db.Context.SaveChangesAsync();

        var service = new ReservationService(db.Context);

        var result = await service.GetByRestaurantIdAsync(10, tenantA.Id);

        result.Should().ContainSingle();
        result[0].Name.Should().Be("Visible");
    }
}
