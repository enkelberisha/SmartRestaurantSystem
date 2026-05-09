namespace srs.Server.Dtos.Orders;

public class OrderDto
{
    public int Id { get; set; }
    public int TableId { get; set; }
    public int? DiningSessionId { get; set; }
    public string Status { get; set; } = null!;
    public decimal Total { get; set; }
    public DateTime CreatedAt { get; set; }
}
