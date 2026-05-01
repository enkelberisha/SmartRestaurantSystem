using System.ComponentModel.DataAnnotations;

namespace srs.Server.Dtos.Orders;

public class UpdateOrderStatusDto
{
    [Required]
    public string Status { get; set; } = null!;
}