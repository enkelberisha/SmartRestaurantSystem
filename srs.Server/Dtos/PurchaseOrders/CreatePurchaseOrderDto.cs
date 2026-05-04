using System.ComponentModel.DataAnnotations;

namespace srs.Server.Dtos.PurchaseOrders;

public class CreatePurchaseOrderDto
{
    [Required]
    public int RestaurantId { get; set; }

    [Required]
    public int SupplierId { get; set; }

    [Required]
    [Range(0.01, double.MaxValue, ErrorMessage = "Total must be greater than zero.")]
    public decimal Total { get; set; }
}
