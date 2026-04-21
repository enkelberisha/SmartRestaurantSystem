namespace srs.Server.Models;

public class InventoryItem
{
    public int Id { get; set; }

    public int InventoryId { get; set; }

    public string ItemName { get; set; } = null!;

    public decimal Quantity { get; set; }

    public int? SupplierId { get; set; }

    public decimal UnitPrice { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Inventory Inventory { get; set; } = null!;

    public Supplier? Supplier { get; set; }
}