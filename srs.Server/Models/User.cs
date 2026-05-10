using srs.Server.Models.Enums;

namespace srs.Server.Models;

public class User
{
    public int Id { get; set; }

    public Guid? TenantId { get; set; }

    public int? RestaurantId { get; set; }

    public Guid SupabaseUserId { get; set; }

    public string Email { get; set; } = null!;

    public UserRole Role { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Tenant? Tenant { get; set; }

    public Restaurant? Restaurant { get; set; }

    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();

    public ICollection<Restaurant> RestaurantOwners { get; set; } = new List<Restaurant>();

    public ICollection<Restaurant> RestaurantManagers { get; set; } = new List<Restaurant>();

    public ICollection<Order> PosOrders { get; set; } = new List<Order>();

    public ICollection<PosWaiterSession> PosWaiterSessions { get; set; } = new List<PosWaiterSession>();
}
