namespace srs.Server.Dtos.TableSessions;

public class TableSessionDto
{
    public Guid Id { get; set; }
    public Guid TenantId { get; set; }
    public int RestaurantId { get; set; }
    public string RestaurantName { get; set; } = null!;
    public int TableId { get; set; }
    public int TableNumber { get; set; }
    public string Status { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    public DateTime LastSeenAt { get; set; }
}
