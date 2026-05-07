namespace srs.Server.Dtos.OwnerAnalytics;

public class OwnerAnalyticsTrendDto
{
    public string Name { get; set; } = null!;
    public decimal Actual { get; set; }
    public decimal? Forecast { get; set; }
    public decimal? PriorYear { get; set; }
}
