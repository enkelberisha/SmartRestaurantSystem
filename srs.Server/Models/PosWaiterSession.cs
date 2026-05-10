namespace srs.Server.Models;

public class PosWaiterSession
{
    public int Id { get; set; }

    public int PosUserId { get; set; }

    public int StaffId { get; set; }

    public Guid TenantId { get; set; }

    public int RestaurantId { get; set; }

    public DateTime OpenedAt { get; set; } = DateTime.UtcNow;

    public DateTime? ExpiresAt { get; set; }

    public DateTime? ClosedAt { get; set; }

    public User PosUser { get; set; } = null!;

    public Staff Staff { get; set; } = null!;

    public Tenant Tenant { get; set; } = null!;

    public Restaurant Restaurant { get; set; } = null!;
}
