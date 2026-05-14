namespace srs.Server.Dtos.AI;

public class AiRestaurantDoctorItemDto
{
    public string RestaurantName { get; set; } = string.Empty;
    public string Status { get; set; } = "healthy";
    public string Insight { get; set; } = string.Empty;
    public string Recommendation { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public decimal? GapToForecast { get; set; }
    public decimal OccupancyRate { get; set; }
    public decimal PaymentCaptureRate { get; set; }
    public int LowStockItems { get; set; }
}
