namespace srs.Server.Models;

public class PurchaseOrder
{
    public int Id { get; set; }

    public int RestaurantId { get; set; }

    public int SupplierId { get; set; }

    public decimal Total { get; set; }

    public DateTime CreatedAt { get; set; }

    public Restaurant Restaurant { get; set; } = null!;

    public Supplier Supplier { get; set; } = null!;
}