using srs.Server.Models.Enums;

namespace srs.Server.Models;

public class Payment
{
    public int Id { get; set; }

    public int OrderId { get; set; }

    public decimal Amount { get; set; }

    public PaymentMethod Method { get; set; }
    public PaymentStatus Status { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Order Order { get; set; } = null!;
}
