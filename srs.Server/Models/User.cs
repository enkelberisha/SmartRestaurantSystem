using srs.Server.Models.Enums;

namespace srs.Server.Models;

public class User
{
    public int Id { get; set; }

    public Guid? TenantId { get; set; }

    public Guid SupabaseUserId { get; set; }

    public string Email { get; set; } = null!;

    public UserRole Role { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Tenant? Tenant { get; set; }

    public ICollection<Notification> Notifications { get; set; } = new List<Notification>();

    public ICollection<Restaurant> RestaurantOwners { get; set; } = new List<Restaurant>();

    public ICollection<Restaurant> RestaurantManagers { get; set; } = new List<Restaurant>();

    public ICollection<Staff> Staff { get; set; } = new List<Staff>();
}
