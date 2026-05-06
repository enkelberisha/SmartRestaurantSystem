namespace srs.Server.Dtos.OwnerAnalytics;

public class OwnerAnalyticsResponseDto
{
    public decimal BookedRevenue { get; set; }
    public decimal PaidRevenue { get; set; }
    public decimal AverageTicket { get; set; }
    public decimal Adr { get; set; }
    public int ActiveOrders { get; set; }
    public int CompletedOrders { get; set; }
    public int OccupiedTables { get; set; }
    public int ReservedTables { get; set; }
    public int AvailableTables { get; set; }
    public int TotalTables { get; set; }
    public int TotalSeats { get; set; }
    public decimal OccupancyRate { get; set; }
    public decimal RevenuePerAvailableSeat { get; set; }
    public decimal Revpash { get; set; }
    public decimal ServiceCaptureRate { get; set; }
    public decimal? RevenueForecast { get; set; }
    public decimal? GapToForecast { get; set; }
    public decimal? RevenueBudget { get; set; }
    public decimal? GapToBudget { get; set; }
    public decimal? PriorYearRevenue { get; set; }
    public decimal? PaceToPriorYear { get; set; }
    public decimal? ProjectedMonthEndRevenue { get; set; }
    public IReadOnlyList<OwnerAnalyticsTrendDto> RevenueTrendData { get; set; } = [];
    public IReadOnlyList<OwnerAnalyticsBridgeDto> ForecastBridgeData { get; set; } = [];
    public IReadOnlyList<OwnerAnalyticsRestaurantDto> Restaurants { get; set; } = [];
}
