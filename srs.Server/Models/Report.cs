using srs.Server.Models.Enums;

namespace srs.Server.Models;

public class Report
{
    public int Id { get; set; }

    public ReportType Type { get; set; }

    public int RestaurantId { get; set; }

    public string Message { get; set; } = null!;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Restaurant Restaurant { get; set; } = null!;
}
