using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Dtos.OwnerAnalytics;
using srs.Server.Models;
using srs.Server.Models.Enums;

namespace srs.Server.Services.OwnerAnalytics;

public class OwnerAnalyticsService(AppDbContext context) : IOwnerAnalyticsService
{
    private const decimal ServiceHoursPerDay = 8m;

    public async Task<OwnerAnalyticsResponseDto> GetAsync(
        Guid tenantId,
        int? restaurantId,
        CancellationToken cancellationToken = default)
    {
        var restaurants = await context.Restaurants
            .AsNoTracking()
            .Where(restaurant => restaurant.TenantId == tenantId)
            .Where(restaurant => restaurantId == null || restaurant.Id == restaurantId.Value)
            .Include(restaurant => restaurant.Tables)
                .ThenInclude(table => table.Orders)
            .Include(restaurant => restaurant.Tables)
                .ThenInclude(table => table.Reservations)
            .ToListAsync(cancellationToken);

        var restaurantAnalytics = restaurants
            .Select(restaurant => CalculateRestaurant(restaurant.Id, restaurant.Tables))
            .ToList();

        var allTables = restaurants.SelectMany(restaurant => restaurant.Tables).ToList();
        var allOrders = allTables.SelectMany(table => table.Orders).ToList();
        var response = CalculatePortfolio(allTables, allOrders);
        response.Restaurants = restaurantAnalytics;
        response.RevenueTrendData = BuildActualTrend(allOrders);
        response.ForecastBridgeData =
        [
            new() { Name = "Booked", Value = response.BookedRevenue },
            new() { Name = "Open checks", Value = null },
            new() { Name = "Reservations", Value = null },
            new() { Name = "Forecast gap", Value = response.GapToForecast }
        ];

        return response;
    }

    private static OwnerAnalyticsRestaurantDto CalculateRestaurant(
        int restaurantId,
        ICollection<Table> tables)
    {
        var orders = tables.SelectMany(table => table.Orders).ToList();
        var totalTables = tables.Count;
        var occupiedTables = tables.Count(table => table.Status == TableStatus.Occupied);
        var reservedTables = tables.Count(table => table.Status == TableStatus.Reserved);
        var availableTables = tables.Count(table => table.Status == TableStatus.Available);
        var totalSeats = tables.Sum(table => table.Capacity);
        var coveredSeats = tables
            .Where(table => table.Status == TableStatus.Occupied || table.Status == TableStatus.Reserved)
            .Sum(table => table.Capacity);
        var bookedRevenue = orders.Sum(order => order.Total);
        var completedOrders = orders.Count(order => order.Status == OrderStatus.Completed);
        var paidRevenue = orders
            .Where(order => order.Status == OrderStatus.Completed)
            .Sum(order => order.Total);

        return new OwnerAnalyticsRestaurantDto
        {
            RestaurantId = restaurantId,
            BookedRevenue = bookedRevenue,
            PaidRevenue = paidRevenue,
            AverageTicket = Divide(bookedRevenue, orders.Count),
            Adr = Divide(paidRevenue, completedOrders),
            ActiveOrders = orders.Count(order => IsActive(order.Status)),
            CompletedOrders = completedOrders,
            OccupiedTables = occupiedTables,
            ReservedTables = reservedTables,
            AvailableTables = availableTables,
            TotalTables = totalTables,
            TotalSeats = totalSeats,
            OccupancyRate = Percent(occupiedTables + reservedTables, totalTables),
            RevenuePerAvailableSeat = Divide(bookedRevenue, totalSeats),
            Revpash = Divide(bookedRevenue, totalSeats * ServiceHoursPerDay),
            ServiceCaptureRate = Percent(orders.Count, coveredSeats)
        };
    }

    private static OwnerAnalyticsResponseDto CalculatePortfolio(
        IReadOnlyList<Table> tables,
        IReadOnlyList<Order> orders)
    {
        var totalTables = tables.Count;
        var occupiedTables = tables.Count(table => table.Status == TableStatus.Occupied);
        var reservedTables = tables.Count(table => table.Status == TableStatus.Reserved);
        var availableTables = tables.Count(table => table.Status == TableStatus.Available);
        var totalSeats = tables.Sum(table => table.Capacity);
        var coveredSeats = tables
            .Where(table => table.Status == TableStatus.Occupied || table.Status == TableStatus.Reserved)
            .Sum(table => table.Capacity);
        var bookedRevenue = orders.Sum(order => order.Total);
        var completedOrders = orders.Count(order => order.Status == OrderStatus.Completed);
        var paidRevenue = orders
            .Where(order => order.Status == OrderStatus.Completed)
            .Sum(order => order.Total);

        return new OwnerAnalyticsResponseDto
        {
            BookedRevenue = bookedRevenue,
            PaidRevenue = paidRevenue,
            AverageTicket = Divide(bookedRevenue, orders.Count),
            Adr = Divide(paidRevenue, completedOrders),
            ActiveOrders = orders.Count(order => IsActive(order.Status)),
            CompletedOrders = completedOrders,
            OccupiedTables = occupiedTables,
            ReservedTables = reservedTables,
            AvailableTables = availableTables,
            TotalTables = totalTables,
            TotalSeats = totalSeats,
            OccupancyRate = Percent(occupiedTables + reservedTables, totalTables),
            RevenuePerAvailableSeat = Divide(bookedRevenue, totalSeats),
            Revpash = Divide(bookedRevenue, totalSeats * ServiceHoursPerDay),
            ServiceCaptureRate = Percent(orders.Count, coveredSeats)
        };
    }

    private static IReadOnlyList<OwnerAnalyticsTrendDto> BuildActualTrend(IReadOnlyList<Order> orders)
    {
        var now = DateTime.UtcNow;
        var windows = new[]
        {
            new { Name = "7 days", Start = now.AddDays(-7) },
            new { Name = "14 days", Start = now.AddDays(-14) },
            new { Name = "30 days", Start = now.AddDays(-30) },
            new { Name = "Current", Start = DateTime.MinValue }
        };

        return windows
            .Select(window => new OwnerAnalyticsTrendDto
            {
                Name = window.Name,
                Actual = orders
                    .Where(order => order.CreatedAt >= window.Start)
                    .Sum(order => order.Total),
                Forecast = null,
                PriorYear = null
            })
            .ToList();
    }

    private static bool IsActive(OrderStatus status)
    {
        return status is OrderStatus.Pending or OrderStatus.InProgress or OrderStatus.Ready;
    }

    private static decimal Divide(decimal value, decimal total)
    {
        return total == 0 ? 0 : Math.Round(value / total, 2);
    }

    private static decimal Percent(decimal value, decimal total)
    {
        return total == 0 ? 0 : Math.Round(value / total * 100, 1);
    }
}
