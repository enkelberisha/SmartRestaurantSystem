namespace srs.Server.Models;

public class PurchaseOrder
{
    public int Id { get; set; }

    public int RestaurantId { get; set; }

    public int SupplierId { get; set; }

    public int? InventoryItemId { get; set; }

    public string? ItemName { get; set; }

    public decimal? Quantity { get; set; }

    public decimal? UnitPrice { get; set; }

    public int? CreatedByUserId { get; set; }

    public string? CreatedByEmail { get; set; }

    public decimal Total { get; set; }

    public DateTime CreatedAt { get; set; }

    public Restaurant Restaurant { get; set; } = null!;

    public Supplier Supplier { get; set; } = null!;

    public InventoryItem? InventoryItem { get; set; }

    public User? CreatedByUser { get; set; }
}
