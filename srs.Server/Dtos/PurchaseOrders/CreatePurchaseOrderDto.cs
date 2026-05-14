using System.ComponentModel.DataAnnotations;

namespace srs.Server.Dtos.PurchaseOrders;

public class CreatePurchaseOrderDto
{
    [Required]
    public int RestaurantId { get; set; }

    [Required]
    public int SupplierId { get; set; }

    [Required]
    public int InventoryItemId { get; set; }

    [Required]
    [Range(0.01, double.MaxValue, ErrorMessage = "Quantity must be greater than zero.")]
    public decimal Quantity { get; set; }
}
