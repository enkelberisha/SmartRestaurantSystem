using srs.Server.Models.Enums;

namespace srs.Server.Models;

public class Staff
{
    public int Id { get; set; }

    public Guid TenantId { get; set; }

    public int RestaurantId { get; set; }

    public string FullName { get; set; } = null!;

    public string CredentialHash { get; set; } = null!;

    public StaffCredentialType CredentialType { get; set; }

    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Tenant Tenant { get; set; } = null!;

    public Restaurant Restaurant { get; set; } = null!;

    public ICollection<Shift> Shifts { get; set; } = new List<Shift>();

    public ICollection<Table> Tables { get; set; } = new List<Table>();

    public ICollection<Order> Orders { get; set; } = new List<Order>();

    public ICollection<PosWaiterSession> PosWaiterSessions { get; set; } = new List<PosWaiterSession>();
}
