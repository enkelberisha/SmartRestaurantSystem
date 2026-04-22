namespace srs.Server.Models;

public class KitchenQueue
{
    public int Id { get; set; }

    public int OrderId { get; set; }

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public Order Order { get; set; } = null!;
}
