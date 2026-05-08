using System.ComponentModel.DataAnnotations;

namespace srs.Server.Dtos.Orders;

public class CreateOrderDto
{
    [Required]
    public int TableId { get; set; }

    public int? DiningSessionId { get; set; }
}
