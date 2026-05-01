using System.ComponentModel.DataAnnotations;

namespace srs.Server.Dtos.Suppliers;

public class SupplierRequestDto
{
    [Required]
    public int RestaurantId { get; set; }

    [Required]
    public string Name { get; set; } = null!;

    public string? Contact { get; set; }
}