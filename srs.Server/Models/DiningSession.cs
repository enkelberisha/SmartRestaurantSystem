using srs.Server.Models.Enums;

namespace srs.Server.Models;

public class DiningSession
{
    public int Id { get; set; }

    public Guid TenantId { get; set; }

    public int RestaurantId { get; set; }

    public int TableId { get; set; }

    public int OpenedByUserId { get; set; }

    public int PartySize { get; set; }

    public DiningSessionStatus Status { get; set; } = DiningSessionStatus.Seated;

    public DateTime SeatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ClosedAt { get; set; }

    public Tenant Tenant { get; set; } = null!;

    public Restaurant Restaurant { get; set; } = null!;

    public Table Table { get; set; } = null!;

    public User OpenedByUser { get; set; } = null!;

    public ICollection<Order> Orders { get; set; } = new List<Order>();
}
