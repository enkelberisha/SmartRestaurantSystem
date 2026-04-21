namespace srs.Server.Models;

public class Supplier
{
    public int Id { get; set; }

    public int RestaurantId { get; set; }

    public string Name { get; set; } = null!;

    public string? Contact { get; set; }

    public Restaurant Restaurant { get; set; } = null!;

    public ICollection<InventoryItem> InventoryItems { get; set; } = new List<InventoryItem>();

    public ICollection<PurchaseOrder> PurchaseOrders { get; set; } = new List<PurchaseOrder>();
}