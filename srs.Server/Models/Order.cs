using srs.Server.Models.Enums;

namespace srs.Server.Models;

public class Order
{
    public int Id { get; set; }

    public int TableId { get; set; }

    public int? DiningSessionId { get; set; }

    public OrderStatus Status { get; set; }

    public decimal Total { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Table Table { get; set; } = null!;

    public DiningSession? DiningSession { get; set; }

    public ICollection<OrderItem> OrderItems { get; set; } = new List<OrderItem>();

    public ICollection<KitchenQueue> KitchenQueues { get; set; } = new List<KitchenQueue>();

    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
