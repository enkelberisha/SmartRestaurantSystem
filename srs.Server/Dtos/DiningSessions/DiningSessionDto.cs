namespace srs.Server.Dtos.DiningSessions;

public class DiningSessionDto
{
    public int Id { get; set; }
    public Guid TenantId { get; set; }
    public int RestaurantId { get; set; }
    public int TableId { get; set; }
    public int TableNumber { get; set; }
    public int PartySize { get; set; }
    public string Status { get; set; } = null!;
    public DateTime SeatedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    public decimal OpenOrderTotal { get; set; }
}
