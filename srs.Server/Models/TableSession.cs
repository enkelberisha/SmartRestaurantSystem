using srs.Server.Models.Enums;

namespace srs.Server.Models;

public class TableSession
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid TenantId { get; set; }

    public int RestaurantId { get; set; }

    public int TableId { get; set; }

    public int OpenedByUserId { get; set; }

    public TableSessionStatus Status { get; set; } = TableSessionStatus.Active;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ClosedAt { get; set; }

    public DateTime LastSeenAt { get; set; } = DateTime.UtcNow;

    public Tenant Tenant { get; set; } = null!;

    public Restaurant Restaurant { get; set; } = null!;

    public Table Table { get; set; } = null!;

    public User OpenedByUser { get; set; } = null!;
}
