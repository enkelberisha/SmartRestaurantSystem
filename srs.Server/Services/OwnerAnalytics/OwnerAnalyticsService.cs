using Microsoft.EntityFrameworkCore;
using srs.Server.Data;
using srs.Server.Dtos.OwnerAnalytics;
using srs.Server.Models;
using srs.Server.Models.Enums;

namespace srs.Server.Services.OwnerAnalytics;

public class OwnerAnalyticsService(AppDbContext context) : IOwnerAnalyticsService
{
    private const decimal ServiceHoursPerDay = 8m;
    private const decimal LowStockThreshold = 5m;

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
                    .ThenInclude(order => order.Payments)
            .Include(restaurant => restaurant.Tables)
                .ThenInclude(table => table.Reservations)
            .Include(restaurant => restaurant.Inventories)
                .ThenInclude(inventory => inventory.InventoryItems)
            .Include(restaurant => restaurant.PurchaseOrders)
            .ToListAsync(cancellationToken);

        var response = CalculatePortfolio(restaurants);
        response.Restaurants = restaurants
            .Select(CalculateRestaurant)
            .ToList();

        var allOrders = restaurants
            .SelectMany(restaurant => restaurant.Tables)
            .SelectMany(table => table.Orders)
            .ToList();

        response.RevenueTrendData = BuildActualTrend(allOrders);
        response.ForecastBridgeData =
        [
            new() { Name = "Paid", Value = response.PaidRevenue },
            new() { Name = "Open checks", Value = response.OpenOrderValue },
            new() { Name = "Cancelled", Value = -response.CancelledRevenue },
            new() { Name = "Inventory", Value = response.InventoryValue },
            new() { Name = "Runway", Value = response.GapToForecast }
        ];

        return response;
    }

    private static OwnerAnalyticsRestaurantDto CalculateRestaurant(Restaurant restaurant)
    {
        var metrics = BuildMetrics(
            restaurant.Tables.ToList(),
            restaurant.Tables.SelectMany(table => table.Orders).ToList(),
            GetLatestInventoryItems(restaurant),
            GetRecentPurchaseOrders(restaurant),
            DateTime.UtcNow);

        return new OwnerAnalyticsRestaurantDto
        {
            RestaurantId = restaurant.Id,
            BookedRevenue = metrics.BookedRevenue,
            PaidRevenue = metrics.PaidRevenue,
            OpenOrderValue = metrics.OpenOrderValue,
            CancelledRevenue = metrics.CancelledRevenue,
            AverageTicket = metrics.AverageTicket,
            Adr = metrics.Adr,
            ActiveOrders = metrics.ActiveOrders,
            CompletedOrders = metrics.CompletedOrders,
            CancelledOrders = metrics.CancelledOrders,
            OccupiedTables = metrics.OccupiedTables,
            ReservedTables = metrics.ReservedTables,
            AvailableTables = metrics.AvailableTables,
            TotalTables = metrics.TotalTables,
            TotalSeats = metrics.TotalSeats,
            OccupancyRate = metrics.OccupancyRate,
            RevenuePerAvailableSeat = metrics.RevenuePerAvailableSeat,
            Revpash = metrics.Revpash,
            ServiceCaptureRate = metrics.ServiceCaptureRate,
            PaymentCaptureRate = metrics.PaymentCaptureRate,
            CompletionRate = metrics.CompletionRate,
            InventoryValue = metrics.InventoryValue,
            InventoryItemCount = metrics.InventoryItemCount,
            LowStockItems = metrics.LowStockItems,
            OutOfStockItems = metrics.OutOfStockItems,
            InventorySupplierCount = metrics.InventorySupplierCount,
            RecentPurchaseOrderSpend = metrics.RecentPurchaseOrderSpend,
            RecentPurchaseOrderCount = metrics.RecentPurchaseOrderCount,
            RevenueForecast = metrics.RevenueForecast,
            GapToForecast = metrics.GapToForecast,
            RevenueBudget = metrics.RevenueBudget,
            GapToBudget = metrics.GapToBudget,
            PriorYearRevenue = metrics.PriorYearRevenue,
            PaceToPriorYear = metrics.PaceToPriorYear,
            ProjectedMonthEndRevenue = metrics.ProjectedMonthEndRevenue
        };
    }

    private static OwnerAnalyticsResponseDto CalculatePortfolio(IReadOnlyList<Restaurant> restaurants)
    {
        var tables = restaurants
            .SelectMany(restaurant => restaurant.Tables)
            .ToList();
        var orders = tables
            .SelectMany(table => table.Orders)
            .ToList();
        var inventoryItems = restaurants
            .SelectMany(GetLatestInventoryItems)
            .ToList();
        var purchaseOrders = restaurants
            .SelectMany(GetRecentPurchaseOrders)
            .ToList();
        var metrics = BuildMetrics(tables, orders, inventoryItems, purchaseOrders, DateTime.UtcNow);

        return new OwnerAnalyticsResponseDto
        {
            BookedRevenue = metrics.BookedRevenue,
            PaidRevenue = metrics.PaidRevenue,
            OpenOrderValue = metrics.OpenOrderValue,
            CancelledRevenue = metrics.CancelledRevenue,
            AverageTicket = metrics.AverageTicket,
            Adr = metrics.Adr,
            ActiveOrders = metrics.ActiveOrders,
            CompletedOrders = metrics.CompletedOrders,
            CancelledOrders = metrics.CancelledOrders,
            OccupiedTables = metrics.OccupiedTables,
            ReservedTables = metrics.ReservedTables,
            AvailableTables = metrics.AvailableTables,
            TotalTables = metrics.TotalTables,
            TotalSeats = metrics.TotalSeats,
            OccupancyRate = metrics.OccupancyRate,
            RevenuePerAvailableSeat = metrics.RevenuePerAvailableSeat,
            Revpash = metrics.Revpash,
            ServiceCaptureRate = metrics.ServiceCaptureRate,
            PaymentCaptureRate = metrics.PaymentCaptureRate,
            CompletionRate = metrics.CompletionRate,
            InventoryValue = metrics.InventoryValue,
            InventoryItemCount = metrics.InventoryItemCount,
            LowStockItems = metrics.LowStockItems,
            OutOfStockItems = metrics.OutOfStockItems,
            InventorySupplierCount = metrics.InventorySupplierCount,
            RecentPurchaseOrderSpend = metrics.RecentPurchaseOrderSpend,
            RecentPurchaseOrderCount = metrics.RecentPurchaseOrderCount,
            RevenueForecast = metrics.RevenueForecast,
            GapToForecast = metrics.GapToForecast,
            RevenueBudget = metrics.RevenueBudget,
            GapToBudget = metrics.GapToBudget,
            PriorYearRevenue = metrics.PriorYearRevenue,
            PaceToPriorYear = metrics.PaceToPriorYear,
            ProjectedMonthEndRevenue = metrics.ProjectedMonthEndRevenue
        };
    }

    private static OwnerMetrics BuildMetrics(
        IReadOnlyCollection<Table> tables,
        IReadOnlyList<Order> orders,
        IReadOnlyCollection<InventoryItem> inventoryItems,
        IReadOnlyCollection<PurchaseOrder> purchaseOrders,
        DateTime now)
    {
        var bookedOrders = orders
            .Where(order => order.Status != OrderStatus.Cancelled)
            .ToList();
        var currentMonthStart = GetMonthStart(now);
        var previousMonthStart = GetMonthStart(now.AddMonths(-1));
        var previousMonthComparableEnd = previousMonthStart
            .AddDays(Math.Min(now.Day, DateTime.DaysInMonth(previousMonthStart.Year, previousMonthStart.Month)) - 1)
            .Add(now.TimeOfDay);
        var priorYearMonthStart = GetMonthStart(now.AddYears(-1));
        var priorYearComparableEnd = priorYearMonthStart
            .AddDays(Math.Min(now.Day, DateTime.DaysInMonth(priorYearMonthStart.Year, priorYearMonthStart.Month)) - 1)
            .Add(now.TimeOfDay);
        var totalTables = tables.Count;
        var occupiedTables = tables.Count(table => table.Status == TableStatus.Occupied);
        var reservedTables = tables.Count(table => table.Status == TableStatus.Reserved);
        var availableTables = tables.Count(table => table.Status == TableStatus.Available);
        var totalSeats = tables.Sum(table => table.Capacity);
        var coveredSeats = tables
            .Where(table => table.Status is TableStatus.Occupied or TableStatus.Reserved)
            .Sum(table => table.Capacity);
        var bookedRevenue = bookedOrders.Sum(order => order.Total);
        var paidRevenue = bookedOrders.Sum(CalculatePaidRevenueForOrder);
        var completedOrders = bookedOrders.Count(order => order.Status == OrderStatus.Completed);
        var activeOrders = orders.Count(order => IsActive(order.Status));
        var cancelledOrders = orders.Count(order => order.Status == OrderStatus.Cancelled);
        var openOrderValue = orders
            .Where(order => IsActive(order.Status))
            .Sum(order => order.Total);
        var cancelledRevenue = orders
            .Where(order => order.Status == OrderStatus.Cancelled)
            .Sum(order => order.Total);
        var inventoryValue = inventoryItems.Sum(item => item.Quantity * item.UnitPrice);
        var currentMonthBookedRevenue = SumOrdersBetween(bookedOrders, currentMonthStart, now);
        var projectedMonthEndRevenue = BuildProjectedMonthEndRevenue(bookedOrders, now);
        var previousMonthRevenue = SumOrdersBetween(bookedOrders, previousMonthStart, previousMonthComparableEnd);
        var priorYearRevenue = SumOrdersBetween(bookedOrders, priorYearMonthStart, priorYearComparableEnd);
        var projectedRunway = projectedMonthEndRevenue - currentMonthBookedRevenue;

        return new OwnerMetrics
        {
            BookedRevenue = bookedRevenue,
            PaidRevenue = paidRevenue,
            OpenOrderValue = openOrderValue,
            CancelledRevenue = cancelledRevenue,
            AverageTicket = Divide(bookedRevenue, bookedOrders.Count),
            Adr = Divide(paidRevenue, completedOrders),
            ActiveOrders = activeOrders,
            CompletedOrders = completedOrders,
            CancelledOrders = cancelledOrders,
            OccupiedTables = occupiedTables,
            ReservedTables = reservedTables,
            AvailableTables = availableTables,
            TotalTables = totalTables,
            TotalSeats = totalSeats,
            OccupancyRate = Percent(occupiedTables + reservedTables, totalTables),
            RevenuePerAvailableSeat = Divide(paidRevenue, totalSeats),
            Revpash = Divide(paidRevenue, totalSeats * ServiceHoursPerDay),
            ServiceCaptureRate = Percent(bookedOrders.Count, coveredSeats),
            PaymentCaptureRate = Percent(paidRevenue, bookedRevenue),
            CompletionRate = Percent(completedOrders, bookedOrders.Count),
            InventoryValue = inventoryValue,
            InventoryItemCount = inventoryItems.Count,
            LowStockItems = inventoryItems.Count(item => item.Quantity > 0 && item.Quantity <= LowStockThreshold),
            OutOfStockItems = inventoryItems.Count(item => item.Quantity <= 0),
            InventorySupplierCount = inventoryItems
                .Where(item => item.SupplierId.HasValue)
                .Select(item => item.SupplierId!.Value)
                .Distinct()
                .Count(),
            RecentPurchaseOrderSpend = purchaseOrders.Sum(purchaseOrder => purchaseOrder.Total),
            RecentPurchaseOrderCount = purchaseOrders.Count,
            RevenueForecast = projectedMonthEndRevenue,
            GapToForecast = Math.Round(projectedRunway, 2),
            RevenueBudget = previousMonthRevenue == 0 ? null : previousMonthRevenue,
            GapToBudget = previousMonthRevenue == 0 ? null : Math.Round(currentMonthBookedRevenue - previousMonthRevenue, 2),
            PriorYearRevenue = priorYearRevenue == 0 ? null : priorYearRevenue,
            PaceToPriorYear = priorYearRevenue == 0 ? null : Percent(currentMonthBookedRevenue, priorYearRevenue),
            ProjectedMonthEndRevenue = projectedMonthEndRevenue
        };
    }

    private static IReadOnlyList<OwnerAnalyticsTrendDto> BuildActualTrend(IReadOnlyList<Order> orders)
    {
        var now = DateTime.UtcNow;
        var bookedOrders = orders
            .Where(order => order.Status != OrderStatus.Cancelled)
            .ToList();

        var windows = new[]
        {
            new TrendWindow("7 days", now.AddDays(-7), now, now.AddDays(-14), now.AddDays(-7), now.AddYears(-1).AddDays(-7), now.AddYears(-1)),
            new TrendWindow("14 days", now.AddDays(-14), now, now.AddDays(-28), now.AddDays(-14), now.AddYears(-1).AddDays(-14), now.AddYears(-1)),
            new TrendWindow("30 days", now.AddDays(-30), now, now.AddDays(-60), now.AddDays(-30), now.AddYears(-1).AddDays(-30), now.AddYears(-1)),
            new TrendWindow("MTD", GetMonthStart(now), now, GetMonthStart(now.AddMonths(-1)), GetComparablePeriodEnd(GetMonthStart(now.AddMonths(-1)), now), GetMonthStart(now.AddYears(-1)), GetComparablePeriodEnd(GetMonthStart(now.AddYears(-1)), now))
        };

        return windows
            .Select(window => new OwnerAnalyticsTrendDto
            {
                Name = window.Name,
                Actual = SumOrdersBetween(bookedOrders, window.CurrentStart, window.CurrentEnd),
                Forecast = SumOrdersBetween(bookedOrders, window.PreviousStart, window.PreviousEnd),
                PriorYear = SumOrdersBetween(bookedOrders, window.PriorYearStart, window.PriorYearEnd)
            })
            .ToList();
    }

    private static IReadOnlyCollection<InventoryItem> GetLatestInventoryItems(Restaurant restaurant)
    {
        return restaurant.Inventories
            .OrderByDescending(inventory => inventory.CreatedAt)
            .FirstOrDefault()
            ?.InventoryItems
            ?.ToList()
            ?? [];
    }

    private static IReadOnlyCollection<PurchaseOrder> GetRecentPurchaseOrders(Restaurant restaurant)
    {
        var cutoff = DateTime.UtcNow.AddDays(-30);

        return restaurant.PurchaseOrders
            .Where(purchaseOrder => purchaseOrder.CreatedAt >= cutoff)
            .ToList();
    }

    private static decimal CalculatePaidRevenueForOrder(Order order)
    {
        if (order.Payments.Count == 0)
        {
            return order.Status == OrderStatus.Completed ? order.Total : 0;
        }

        var completedPayments = order.Payments
            .Where(payment => payment.Status == PaymentStatus.Completed)
            .Sum(payment => payment.Amount);
        var refundedPayments = order.Payments
            .Where(payment => payment.Status == PaymentStatus.Refunded)
            .Sum(payment => payment.Amount);

        return Math.Max(0, completedPayments - refundedPayments);
    }

    private static decimal SumOrdersBetween(IEnumerable<Order> orders, DateTime start, DateTime end)
    {
        return orders
            .Where(order => order.CreatedAt >= start && order.CreatedAt <= end)
            .Sum(order => order.Total);
    }

    private static decimal BuildProjectedMonthEndRevenue(IEnumerable<Order> orders, DateTime now)
    {
        var monthStart = GetMonthStart(now);
        var monthToDateRevenue = SumOrdersBetween(orders, monthStart, now);
        var elapsedDays = Math.Max(1, now.Day);
        var daysInMonth = DateTime.DaysInMonth(now.Year, now.Month);

        return Math.Round(monthToDateRevenue / elapsedDays * daysInMonth, 2);
    }

    private static DateTime GetMonthStart(DateTime value)
    {
        return new DateTime(value.Year, value.Month, 1, 0, 0, 0, DateTimeKind.Utc);
    }

    private static DateTime GetComparablePeriodEnd(DateTime start, DateTime now)
    {
        return start
            .AddDays(Math.Min(now.Day, DateTime.DaysInMonth(start.Year, start.Month)) - 1)
            .Add(now.TimeOfDay);
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

    private sealed record TrendWindow(
        string Name,
        DateTime CurrentStart,
        DateTime CurrentEnd,
        DateTime PreviousStart,
        DateTime PreviousEnd,
        DateTime PriorYearStart,
        DateTime PriorYearEnd);

    private sealed record OwnerMetrics
    {
        public decimal BookedRevenue { get; init; }
        public decimal PaidRevenue { get; init; }
        public decimal OpenOrderValue { get; init; }
        public decimal CancelledRevenue { get; init; }
        public decimal AverageTicket { get; init; }
        public decimal Adr { get; init; }
        public int ActiveOrders { get; init; }
        public int CompletedOrders { get; init; }
        public int CancelledOrders { get; init; }
        public int OccupiedTables { get; init; }
        public int ReservedTables { get; init; }
        public int AvailableTables { get; init; }
        public int TotalTables { get; init; }
        public int TotalSeats { get; init; }
        public decimal OccupancyRate { get; init; }
        public decimal RevenuePerAvailableSeat { get; init; }
        public decimal Revpash { get; init; }
        public decimal ServiceCaptureRate { get; init; }
        public decimal PaymentCaptureRate { get; init; }
        public decimal CompletionRate { get; init; }
        public decimal InventoryValue { get; init; }
        public int InventoryItemCount { get; init; }
        public int LowStockItems { get; init; }
        public int OutOfStockItems { get; init; }
        public int InventorySupplierCount { get; init; }
        public decimal RecentPurchaseOrderSpend { get; init; }
        public int RecentPurchaseOrderCount { get; init; }
        public decimal? RevenueForecast { get; init; }
        public decimal? GapToForecast { get; init; }
        public decimal? RevenueBudget { get; init; }
        public decimal? GapToBudget { get; init; }
        public decimal? PriorYearRevenue { get; init; }
        public decimal? PaceToPriorYear { get; init; }
        public decimal? ProjectedMonthEndRevenue { get; init; }
    }
}
