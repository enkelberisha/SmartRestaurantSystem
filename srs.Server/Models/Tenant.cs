namespace srs.Server.Models;

public class Tenant
{
    public Guid Id { get; set; }

    public string Name { get; set; } = null!;

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<User> Users { get; set; } = new List<User>();

    public ICollection<Restaurant> Restaurants { get; set; } = new List<Restaurant>();

    public ICollection<Staff> Staff { get; set; } = new List<Staff>();

    public ICollection<PosWaiterSession> PosWaiterSessions { get; set; } = new List<PosWaiterSession>();

    public ICollection<AuditLog> AuditLogs { get; set; } = new List<AuditLog>();
}
