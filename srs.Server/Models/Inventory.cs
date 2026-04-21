namespace srs.Server.Models;

public class Inventory
{
    public int Id { get; set; }

    public int RestaurantId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Restaurant Restaurant { get; set; } = null!;

    public ICollection<InventoryItem> InventoryItems { get; set; } = new List<InventoryItem>();
}