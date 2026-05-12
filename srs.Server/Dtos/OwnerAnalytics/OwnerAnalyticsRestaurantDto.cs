namespace srs.Server.Dtos.OwnerAnalytics;

public class OwnerAnalyticsRestaurantDto
{
    public int RestaurantId { get; set; }
    public decimal BookedRevenue { get; set; }
    public decimal PaidRevenue { get; set; }
    public decimal OpenOrderValue { get; set; }
    public decimal CancelledRevenue { get; set; }
    public decimal AverageTicket { get; set; }
    public decimal Adr { get; set; }
    public int ActiveOrders { get; set; }
    public int CompletedOrders { get; set; }
    public int CancelledOrders { get; set; }
    public int OccupiedTables { get; set; }
    public int ReservedTables { get; set; }
    public int AvailableTables { get; set; }
    public int TotalTables { get; set; }
    public int TotalSeats { get; set; }
    public decimal OccupancyRate { get; set; }
    public decimal RevenuePerAvailableSeat { get; set; }
    public decimal Revpash { get; set; }
    public decimal ServiceCaptureRate { get; set; }
    public decimal PaymentCaptureRate { get; set; }
    public decimal CompletionRate { get; set; }
    public decimal InventoryValue { get; set; }
    public int InventoryItemCount { get; set; }
    public int LowStockItems { get; set; }
    public int OutOfStockItems { get; set; }
    public int InventorySupplierCount { get; set; }
    public decimal RecentPurchaseOrderSpend { get; set; }
    public int RecentPurchaseOrderCount { get; set; }
    public decimal? RevenueForecast { get; set; }
    public decimal? GapToForecast { get; set; }
    public decimal? RevenueBudget { get; set; }
    public decimal? GapToBudget { get; set; }
    public decimal? PriorYearRevenue { get; set; }
    public decimal? PaceToPriorYear { get; set; }
    public decimal? ProjectedMonthEndRevenue { get; set; }
}
