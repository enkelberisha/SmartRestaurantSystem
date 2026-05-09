using System.ComponentModel.DataAnnotations;

namespace srs.Server.Dtos.OrderItems;

public class OrderItemRequestDto
{
    [Required]
    public int OrderId { get; set; }

    [Required]
    public int MenuItemId { get; set; }

    [Required]
    public int Quantity { get; set; }

    [MaxLength(300)]
    public string? Notes { get; set; }
}
