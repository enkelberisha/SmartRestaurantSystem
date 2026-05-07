namespace srs.Server.Dtos.PurchaseOrders;

public class PurchaseOrderDto
{
    public int Id { get; set; }
    public int RestaurantId { get; set; }
    public int SupplierId { get; set; }
    public string SupplierName { get; set; } = null!;
    public decimal Total { get; set; }
    public DateTime CreatedAt { get; set; }
}
