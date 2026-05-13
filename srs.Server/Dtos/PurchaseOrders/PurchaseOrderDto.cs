namespace srs.Server.Dtos.PurchaseOrders;

public class PurchaseOrderDto
{
    public int Id { get; set; }
    public int RestaurantId { get; set; }
    public int SupplierId { get; set; }
    public string SupplierName { get; set; } = null!;
    public int? InventoryItemId { get; set; }
    public string? ItemName { get; set; }
    public decimal? Quantity { get; set; }
    public decimal? UnitPrice { get; set; }
    public int? CreatedByUserId { get; set; }
    public string? CreatedByEmail { get; set; }
    public decimal Total { get; set; }
    public DateTime CreatedAt { get; set; }
}
